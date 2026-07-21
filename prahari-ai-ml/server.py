"""
PRAHARI AI — ML Pipeline Microservice Server
FastAPI server exposing ML analytics, DuckDB query engine, and NL2SQL pipeline endpoints.
"""
import os
import sys
import logging
import duckdb
from typing import Optional, Dict, Any
from fastapi import FastAPI, HTTPException, Query, Body
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# Add pipeline directory to sys.path
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PIPELINE_DIR = os.path.join(BASE_DIR, "pipeline")
if PIPELINE_DIR not in sys.path:
    sys.path.insert(0, PIPELINE_DIR)

# Load environment variables
from dotenv import load_dotenv
load_dotenv(os.path.join(BASE_DIR, ".env"))

logger = logging.getLogger("prahari-ml")
logging.basicConfig(level=logging.INFO)

app = FastAPI(
    title="PRAHARI AI — ML Data & Intelligence Service",
    version="1.0.0",
    description="Microservice providing DuckDB analytics, spatio-temporal ML models, and NL2SQL querying.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DB_PATH = os.path.join(BASE_DIR, "db", "karnataka_fir.duckdb")

def get_duckdb_conn():
    if not os.path.exists(DB_PATH):
        logger.warning(f"DuckDB database not found at {DB_PATH}")
        return None
    try:
        return duckdb.connect(DB_PATH, read_only=True)
    except Exception as e:
        logger.error(f"Error connecting to DuckDB: {e}")
        return None


@app.get("/health", summary="ML Service Health Check")
async def health_check():
    db_status = "connected" if os.path.exists(DB_PATH) else "missing"
    return {
        "status": "healthy",
        "service": "PRAHARI AI — ML Microservice",
        "database": db_status,
        "database_path": DB_PATH,
    }


@app.get("/api/v1/crime/volume", summary="Aggregated Crime Volume")
async def crime_volume(
    district: Optional[str] = Query(None),
    unit: Optional[str] = Query(None),
    crime_group: Optional[str] = Query(None),
    gravity: Optional[str] = Query(None),
    year: Optional[int] = Query(None),
):
    con = get_duckdb_conn()
    if con is None:
        return {
            "status": "unavailable",
            "message": "DuckDB database not found.",
            "filters": {},
            "data": {"total_cases": 0, "heinous_cases": 0, "non_heinous_cases": 0, "breakdown": []},
        }

    try:
        where_clauses = []
        params = []
        if district:
            where_clauses.append("DistrictName = ?")
            params.append(district)
        if unit:
            where_clauses.append("UnitName = ?")
            params.append(unit)
        if gravity:
            where_clauses.append("Gravity = ?")
            params.append(gravity)
        if year:
            where_clauses.append("CrimeYear = ?")
            params.append(year)
        if crime_group:
            where_clauses.append("LOWER(CrimeGroupName) LIKE ?")
            params.append(f"%{crime_group.lower()}%")

        where_str = f"WHERE {' AND '.join(where_clauses)}" if where_clauses else ""
        
        totals = con.execute(f"""
            SELECT COALESCE(SUM(CaseCount), 0) AS total_cases,
                   COALESCE(SUM(CASE WHEN Gravity = 'Heinous' THEN CaseCount ELSE 0 END), 0) AS heinous_cases,
                   COALESCE(SUM(CASE WHEN Gravity != 'Heinous' THEN CaseCount ELSE 0 END), 0) AS non_heinous_cases
            FROM fact_crime_agg {where_str}
        """, params).fetchdf().to_dict(orient="records")

        breakdown = con.execute(f"""
            SELECT CrimeGroupName, SUM(CaseCount) AS CaseCount, SUM(TotalChargesheeted) AS TotalChargesheeted
            FROM fact_crime_agg {where_str}
            GROUP BY CrimeGroupName ORDER BY CaseCount DESC LIMIT 20
        """, params).fetchdf().to_dict(orient="records")

        con.close()
        row = totals[0] if totals else {}
        return {
            "status": "success",
            "data": {
                "total_cases": int(row.get("total_cases", 0)),
                "heinous_cases": int(row.get("heinous_cases", 0)),
                "non_heinous_cases": int(row.get("non_heinous_cases", 0)),
                "breakdown": breakdown,
            },
        }
    except Exception as e:
        if con:
            con.close()
        raise HTTPException(status_code=500, detail=str(e))


class NL2SQLRequest(BaseModel):
    query: str
    user_role: str = "POLICE_OFFICER"


@app.post("/api/v1/search/nl2sql", summary="Natural Language to SQL Query Engine")
async def nl2sql_query(req: NL2SQLRequest):
    try:
        from step5_nl2sql_agent import run_nl2sql_pipeline
        result = run_nl2sql_pipeline(req.query, user_role=req.user_role)
        return result
    except Exception as e:
        logger.exception("NL2SQL execution failed")
        raise HTTPException(status_code=500, detail=f"NL2SQL processing failed: {str(e)}")


if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8001))
    uvicorn.run("server:app", host="0.0.0.0", port=port, reload=False)
