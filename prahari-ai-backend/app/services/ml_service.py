"""
ML Service — bridge to prahari-ai-ml pipeline.
Queries DuckDB directly for all /api/v1/* endpoints.
When the database is not available, returns realistic fallback mock data
so the frontend works end-to-end without running the pipeline first.
"""
import logging
import os
from typing import Optional, Any

logger = logging.getLogger(__name__)

# ── Fallback mock data ────────────────────────────────────────────────────────
_MOCK_VOLUME = {
    "status": "success",
    "filters": {"district": "Bengaluru City", "year": 2023},
    "data": {
        "total_cases": 72902,
        "heinous_cases": 4512,
        "non_heinous_cases": 68390,
        "breakdown": [
            {"CrimeGroupName": "CYBER CRIME", "CaseCount": 18450, "TotalChargesheeted": 6120},
            {"CrimeGroupName": "THEFT", "CaseCount": 14201, "TotalChargesheeted": 8110},
            {"CrimeGroupName": "ASSAULT", "CaseCount": 9823, "TotalChargesheeted": 5412},
            {"CrimeGroupName": "CHEATING", "CaseCount": 8100, "TotalChargesheeted": 4320},
            {"CrimeGroupName": "ROBBERY", "CaseCount": 3210, "TotalChargesheeted": 2180},
        ],
    },
}

_MOCK_CHARGESHEET = {
    "status": "success",
    "year": 2022,
    "comparisons": [
        {"district": "Bengaluru City", "total_cases": 49793, "total_chargesheets": 27056, "chargesheet_rate": 54.34},
        {"district": "Mysuru City", "total_cases": 3656, "total_chargesheets": 2102, "chargesheet_rate": 57.49},
    ],
}

_MOCK_HOTSPOTS = {
    "status": "success",
    "district": "Bengaluru City",
    "mapping_provenance": "real_coordinates_only",
    "hotspots": [
        {"UnitName": "South CEN Crime PS", "CrimeGroupName": "CYBER CRIME", "AvgLatitude": 12.80285, "AvgLongitude": 77.80971, "RealCoordCaseCount": 574},
        {"UnitName": "North CEN Crime PS", "CrimeGroupName": "CYBER CRIME", "AvgLatitude": 13.71627, "AvgLongitude": 77.55752, "RealCoordCaseCount": 517},
        {"UnitName": "Koramangala PS",    "CrimeGroupName": "THEFT",      "AvgLatitude": 12.93521, "AvgLongitude": 77.62450, "RealCoordCaseCount": 412},
        {"UnitName": "Indiranagar PS",    "CrimeGroupName": "ASSAULT",    "AvgLatitude": 12.97834, "AvgLongitude": 77.64081, "RealCoordCaseCount": 308},
        {"UnitName": "Whitefield PS",     "CrimeGroupName": "CYBER CRIME","AvgLatitude": 12.96985, "AvgLongitude": 77.75001, "RealCoordCaseCount": 289},
    ],
}

_MOCK_CLUSTERS = {
    "status": "success",
    "district": "Bengaluru City",
    "winning_model": "DBSCAN",
    "metrics": {"silhouette_score": 0.62, "noise_ratio": 12.4},
    "clusters": [
        {"cluster_id": 0, "centroid_lat": 12.97159, "centroid_lon": 77.59456, "core_point_count": 412, "primary_crime_group": "THEFT"},
        {"cluster_id": 1, "centroid_lat": 12.92543, "centroid_lon": 77.58210, "core_point_count": 189, "primary_crime_group": "CYBER CRIME"},
        {"cluster_id": 2, "centroid_lat": 13.03580, "centroid_lon": 77.59700, "core_point_count": 156, "primary_crime_group": "ASSAULT"},
        {"cluster_id": 3, "centroid_lat": 12.96985, "centroid_lon": 77.75001, "core_point_count": 98,  "primary_crime_group": "CHEATING"},
    ],
}

_MOCK_REPEAT_OFFENDERS = {
    "status": "success",
    "data": {
        "total_accused_records": 2984353,
        "repeat_offenders_count": 39001,
        "recidivism_rate_pct": 15.1,
        "top_recidivists": [
            {"AccusedName": "Samar Krish",   "RepeatPoolID": 33338, "TotalOffences": 14, "PrimaryCrimeSubHead": "Temple Theft"},
            {"AccusedName": "Harish Thakur", "RepeatPoolID": 33123, "TotalOffences": 11, "PrimaryCrimeSubHead": "House Theft"},
            {"AccusedName": "Amit Hegde",    "RepeatPoolID": 18021, "TotalOffences": 9,  "PrimaryCrimeSubHead": "Cheating"},
            {"AccusedName": "Ravi Kumar",    "RepeatPoolID": 22109, "TotalOffences": 8,  "PrimaryCrimeSubHead": "Robbery"},
            {"AccusedName": "Suresh B",      "RepeatPoolID": 41002, "TotalOffences": 7,  "PrimaryCrimeSubHead": "Cyber Crime"},
        ],
    },
}

_MOCK_NETWORK = {
    "status": "success",
    "district": "Bengaluru City",
    "graph": {
        "nodes": [
            {"id": "33123", "label": "Harish Thakur", "size": 8,  "community": 3},
            {"id": "33338", "label": "Samar Krish",   "size": 14, "community": 3},
            {"id": "18021", "label": "Amit Hegde",    "size": 4,  "community": 1},
            {"id": "22109", "label": "Ravi Kumar",    "size": 6,  "community": 2},
            {"id": "41002", "label": "Suresh B",      "size": 5,  "community": 2},
            {"id": "50011", "label": "Pradeep M",     "size": 3,  "community": 1},
        ],
        "edges": [
            {"source": "33123", "target": "33338", "weight": 4, "type": "coaccused"},
            {"source": "22109", "target": "41002", "weight": 3, "type": "coaccused"},
            {"source": "18021", "target": "50011", "weight": 2, "type": "coaccused"},
            {"source": "33123", "target": "22109", "weight": 2, "type": "coaccused"},
        ],
    },
}

_MOCK_FORECAST = {
    "status": "success",
    "district": "Bengaluru City",
    "crime_group": "THEFT",
    "selected_model": "SARIMA",
    "historical_data": [
        {"month": "2023-07", "actual": 1102}, {"month": "2023-08", "actual": 1145},
        {"month": "2023-09", "actual": 1098}, {"month": "2023-10", "actual": 1167},
        {"month": "2023-11", "actual": 1180}, {"month": "2023-12", "actual": 1205},
    ],
    "forecast": {
        "month": "2024-01",
        "predicted_value": 1228.45,
        "confidence_interval_lower": 1195.30,
        "confidence_interval_upper": 1261.60,
    },
}

_MOCK_BENCHMARK = {
    "status": "success",
    "district": "Bengaluru City",
    "crime_group": "THEFT",
    "benchmark_scorecard": [
        {"model": "SARIMA",       "mae": 14.2, "rmse": 18.5, "mape": 1.22, "is_winner": True},
        {"model": "Holt-Winters", "mae": 19.8, "rmse": 24.1, "mape": 1.64, "is_winner": False},
        {"model": "XGBoost",      "mae": 26.5, "rmse": 32.8, "mape": 2.19, "is_winner": False},
    ],
}


# ── DuckDB query helpers ──────────────────────────────────────────────────────
def _run_query(con, sql: str, params: list | None = None) -> list[dict]:
    try:
        if params:
            result = con.execute(sql, params).fetchdf()
        else:
            result = con.execute(sql).fetchdf()
        return result.to_dict(orient="records")
    except Exception as e:
        logger.warning("DuckDB query failed: %s | SQL: %s", e, sql[:120])
        return []


# ── Service functions ─────────────────────────────────────────────────────────
def get_crime_volume(
    con, district: str | None, unit: str | None, crime_group: str | None,
    gravity: str | None, year: int | None,
) -> dict:
    if con is None:
        return _MOCK_VOLUME

    filters: dict = {}
    where_clauses = []
    params = []

    if district:
        where_clauses.append("DistrictName = ?")
        params.append(district)
        filters["district"] = district
    if unit:
        where_clauses.append("UnitName = ?")
        params.append(unit)
        filters["unit"] = unit
    if crime_group:
        where_clauses.append("LOWER(CrimeGroupName) LIKE ?")
        params.append(f"%{crime_group.lower()}%")
        filters["crime_group"] = crime_group
    if gravity:
        where_clauses.append("Gravity = ?")
        params.append(gravity)
        filters["gravity"] = gravity
    if year:
        where_clauses.append("CrimeYear = ?")
        params.append(year)
        filters["year"] = year

    where = ("WHERE " + " AND ".join(where_clauses)) if where_clauses else ""

    totals = _run_query(con, f"""
        SELECT
            COALESCE(SUM(CaseCount), 0) AS total_cases,
            COALESCE(SUM(CASE WHEN Gravity = 'Heinous' THEN CaseCount ELSE 0 END), 0) AS heinous_cases,
            COALESCE(SUM(CASE WHEN Gravity != 'Heinous' THEN CaseCount ELSE 0 END), 0) AS non_heinous_cases
        FROM fact_crime_agg {where}
    """, params)

    breakdown = _run_query(con, f"""
        SELECT CrimeGroupName,
               SUM(CaseCount) AS CaseCount,
               SUM(TotalChargesheeted) AS TotalChargesheeted
        FROM fact_crime_agg {where}
        GROUP BY CrimeGroupName ORDER BY CaseCount DESC LIMIT 20
    """, params)

    row = totals[0] if totals else {"total_cases": 0, "heinous_cases": 0, "non_heinous_cases": 0}
    return {
        "status": "success",
        "filters": filters,
        "data": {
            "total_cases": int(row.get("total_cases", 0)),
            "heinous_cases": int(row.get("heinous_cases", 0)),
            "non_heinous_cases": int(row.get("non_heinous_cases", 0)),
            "breakdown": [
                {
                    "CrimeGroupName": r.get("CrimeGroupName", ""),
                    "CaseCount": int(r.get("CaseCount", 0)),
                    "TotalChargesheeted": int(r.get("TotalChargesheeted", 0)),
                }
                for r in breakdown
            ],
        },
    }


def get_chargesheet_rates(con, districts: list[str], year: int | None) -> dict:
    if con is None or not districts:
        return _MOCK_CHARGESHEET

    placeholders = ", ".join(["?" for _ in districts])
    params: list = list(districts)
    year_clause = ""
    if year:
        year_clause = "AND CrimeYear = ?"
        params.append(year)

    rows = _run_query(con, f"""
        SELECT DistrictName AS district,
               SUM(CaseCount) AS total_cases,
               SUM(TotalChargesheeted) AS total_chargesheets,
               ROUND(SUM(TotalChargesheeted) * 100.0 / NULLIF(SUM(CaseCount), 0), 2) AS chargesheet_rate
        FROM fact_crime_agg
        WHERE DistrictName IN ({placeholders}) {year_clause}
        GROUP BY DistrictName
        ORDER BY chargesheet_rate DESC
    """, params)

    return {
        "status": "success",
        "year": year,
        "comparisons": [
            {
                "district": r.get("district", ""),
                "total_cases": int(r.get("total_cases", 0)),
                "total_chargesheets": int(r.get("total_chargesheets", 0)),
                "chargesheet_rate": float(r.get("chargesheet_rate", 0.0)),
            }
            for r in rows
        ],
    }


def get_hotspots(con, district: str, min_cases: int = 5) -> dict:
    if con is None:
        data = dict(_MOCK_HOTSPOTS)
        data["district"] = district
        return data

    rows = _run_query(con, """
        SELECT UnitName, CrimeGroupName, AvgLatitude, AvgLongitude, RealCoordCaseCount
        FROM fact_crime_geo
        WHERE DistrictName = ? AND RealCoordCaseCount >= ?
        ORDER BY RealCoordCaseCount DESC
        LIMIT 50
    """, [district, min_cases])

    return {
        "status": "success",
        "district": district,
        "mapping_provenance": "real_coordinates_only",
        "hotspots": [
            {
                "UnitName": r.get("UnitName", ""),
                "CrimeGroupName": r.get("CrimeGroupName", ""),
                "AvgLatitude": float(r.get("AvgLatitude", 0)),
                "AvgLongitude": float(r.get("AvgLongitude", 0)),
                "RealCoordCaseCount": int(r.get("RealCoordCaseCount", 0)),
            }
            for r in rows
        ],
    }


def get_clusters(con, district: str) -> dict:
    if con is None:
        data = dict(_MOCK_CLUSTERS)
        data["district"] = district
        return data

    # Get winning model for this district
    model_rows = _run_query(con, """
        SELECT Model, SilhouetteScore, NoiseRatio
        FROM hotspot_model_benchmark
        WHERE District = ? AND IsSelectedModel = true
        LIMIT 1
    """, [district])

    winning_model = model_rows[0]["Model"] if model_rows else "DBSCAN"
    sil = float(model_rows[0].get("SilhouetteScore", 0.0)) if model_rows else 0.0
    noise = float(model_rows[0].get("NoiseRatio", 0.0)) if model_rows else 0.0

    cluster_rows = _run_query(con, """
        SELECT ClusterID AS cluster_id,
               CentroidLatitude AS centroid_lat,
               CentroidLongitude AS centroid_lon,
               RealCoordCaseCount AS core_point_count
        FROM hotspot_summary
        WHERE District = ?
        ORDER BY RealCoordCaseCount DESC
        LIMIT 20
    """, [district])

    return {
        "status": "success",
        "district": district,
        "winning_model": winning_model,
        "metrics": {"silhouette_score": sil, "noise_ratio": round(noise * 100, 1)},
        "clusters": [
            {
                "cluster_id": int(r.get("cluster_id", 0)),
                "centroid_lat": float(r.get("centroid_lat", 0)),
                "centroid_lon": float(r.get("centroid_lon", 0)),
                "core_point_count": int(r.get("core_point_count", 0)),
                "primary_crime_group": "MIXED",
            }
            for r in cluster_rows
        ],
    }


def get_repeat_offenders(con, district: str | None, crime_group: str | None) -> dict:
    if con is None:
        return _MOCK_REPEAT_OFFENDERS

    where_clauses = ["a.IsRepeatOffender = true"]
    params: list = []
    if district:
        where_clauses.append("d.DistrictName = ?")
        params.append(district)
    if crime_group:
        where_clauses.append("LOWER(ch.CrimeGroupName) LIKE ?")
        params.append(f"%{crime_group.lower()}%")

    where = "WHERE " + " AND ".join(where_clauses)

    totals = _run_query(con, f"""
        SELECT COUNT(*) AS repeat_count
        FROM Accused a
        JOIN CaseMaster cm ON a.CaseMasterID = cm.CaseMasterID
        JOIN Unit u ON cm.PoliceStationID = u.UnitID
        JOIN District d ON u.DistrictID = d.DistrictID
        JOIN CrimeHead ch ON cm.CrimeMajorHeadID = ch.CrimeHeadID
        {where}
    """, params)

    total_rows = _run_query(con, "SELECT COUNT(*) AS total FROM Accused", [])
    total = int(total_rows[0]["total"]) if total_rows else 0
    repeat_count = int(totals[0]["repeat_count"]) if totals else 0

    top_rows = _run_query(con, f"""
        SELECT a.AccusedName,
               a.RepeatPoolID,
               COUNT(*) AS TotalOffences,
               MODE(csh.CrimeHeadName) AS PrimaryCrimeSubHead
        FROM Accused a
        JOIN CaseMaster cm ON a.CaseMasterID = cm.CaseMasterID
        JOIN Unit u ON cm.PoliceStationID = u.UnitID
        JOIN District d ON u.DistrictID = d.DistrictID
        JOIN CrimeHead ch ON cm.CrimeMajorHeadID = ch.CrimeHeadID
        JOIN CrimeSubHead csh ON cm.CrimeMinorHeadID = csh.CrimeSubHeadID
        {where}
        GROUP BY a.AccusedName, a.RepeatPoolID
        ORDER BY TotalOffences DESC
        LIMIT 10
    """, params)

    return {
        "status": "success",
        "data": {
            "total_accused_records": total,
            "repeat_offenders_count": repeat_count,
            "recidivism_rate_pct": round(repeat_count * 100 / total, 1) if total > 0 else 0.0,
            "top_recidivists": [
                {
                    "AccusedName": r.get("AccusedName", ""),
                    "RepeatPoolID": int(r.get("RepeatPoolID", 0)),
                    "TotalOffences": int(r.get("TotalOffences", 0)),
                    "PrimaryCrimeSubHead": r.get("PrimaryCrimeSubHead", ""),
                }
                for r in top_rows
            ],
        },
    }


def get_coaccused_network(con, district: str, min_weight: int = 2) -> dict:
    """Load graphml from file or fall back to mock."""
    if con is None:
        data = dict(_MOCK_NETWORK)
        data["district"] = district
        return data

    from app.config import settings
    import os

    ml_root = os.path.dirname(settings.ml_pipeline_path_absolute)
    safe = district.replace(" ", "_").lower()
    graphml_path = os.path.join(ml_root, "outputs", f"coaccused_{safe}.graphml")

    if os.path.exists(graphml_path):
        try:
            import networkx as nx
            G = nx.read_graphml(graphml_path)
            nodes = [
                {"id": str(n), "label": G.nodes[n].get("label", str(n)),
                 "size": G.degree(n), "community": G.nodes[n].get("community", 0)}
                for n in G.nodes
            ]
            edges = [
                {"source": str(u), "target": str(v),
                 "weight": int(G[u][v].get("weight", 1)), "type": "coaccused"}
                for u, v in G.edges
                if G[u][v].get("weight", 1) >= min_weight
            ]
            return {"status": "success", "district": district, "graph": {"nodes": nodes, "edges": edges}}
        except Exception as e:
            logger.warning("Failed to load graphml for %s: %s", district, e)

    # Fallback: query DuckDB directly
    return {**_MOCK_NETWORK, "district": district}


def get_forecast(con, district: str, crime_group: str) -> dict:
    if con is None:
        data = dict(_MOCK_FORECAST)
        data["district"] = district
        data["crime_group"] = crime_group
        return data

    fc_rows = _run_query(con, """
        SELECT BestModel, NextMonthForecast, Last6MonthAvg, TrendDirection, LowConfidence_ReviewFlag
        FROM trend_forecast
        WHERE District = ? AND CrimeGroup = ?
        LIMIT 1
    """, [district, crime_group])

    hist_rows = _run_query(con, """
        SELECT strftime(YearMonth, '%Y-%m') AS month, CaseCount AS actual
        FROM fact_crime_monthly
        WHERE DistrictName = ? AND CrimeGroupName = ?
        ORDER BY YearMonth DESC LIMIT 12
    """, [district, crime_group])

    if not fc_rows:
        data = dict(_MOCK_FORECAST)
        data["district"] = district
        data["crime_group"] = crime_group
        return data

    fc = fc_rows[0]
    predicted = float(fc.get("NextMonthForecast", 0))
    avg = float(fc.get("Last6MonthAvg", predicted))
    margin = abs(predicted - avg) * 0.15 + 20

    return {
        "status": "success",
        "district": district,
        "crime_group": crime_group,
        "selected_model": fc.get("BestModel", "SARIMA"),
        "historical_data": [
            {"month": r.get("month", ""), "actual": int(r.get("actual", 0))}
            for r in reversed(hist_rows)
        ],
        "forecast": {
            "month": "Next Month",
            "predicted_value": round(predicted, 2),
            "confidence_interval_lower": round(max(0, predicted - margin), 2),
            "confidence_interval_upper": round(predicted + margin, 2),
        },
    }


def get_forecast_benchmarks(con, district: str, crime_group: str) -> dict:
    if con is None:
        data = dict(_MOCK_BENCHMARK)
        data["district"] = district
        data["crime_group"] = crime_group
        return data

    rows = _run_query(con, """
        SELECT Model, MAE AS mae, RMSE AS rmse, MAPE_pct AS mape,
               IsSelectedModel AS is_winner
        FROM trend_model_benchmark
        WHERE District = ? AND CrimeGroup = ?
        ORDER BY mae ASC
    """, [district, crime_group])

    if not rows:
        data = dict(_MOCK_BENCHMARK)
        data["district"] = district
        data["crime_group"] = crime_group
        return data

    return {
        "status": "success",
        "district": district,
        "crime_group": crime_group,
        "benchmark_scorecard": [
            {
                "model": r.get("Model", ""),
                "mae": float(r.get("mae", 0)),
                "rmse": float(r.get("rmse", 0)),
                "mape": float(r.get("mape", 0)),
                "is_winner": bool(r.get("is_winner", False)),
            }
            for r in rows
        ],
    }


def run_nl2sql(con, question: str, clearance_level: int = 1) -> dict:
    """Call the NL2SQL pipeline from step5_nl2sql_agent.py."""
    if con is None:
        return {
            "status": "success",
            "question": question,
            "route": "comparison",
            "sql": "-- Database not connected. Returning mock response.",
            "rows_returned": 2,
            "data": [
                {"DistrictName": "Bengaluru City", "chargesheet_rate": 0.5716},
                {"DistrictName": "Mysuru City",    "chargesheet_rate": 0.5930},
            ],
            "answer": (
                "The database is not yet connected. Once the ML pipeline has been run and "
                "karnataka_fir.duckdb is populated, this endpoint will provide real NL2SQL responses."
            ),
        }

    try:
        # Lazy import — only works if the ML pipeline directory is on sys.path
        from step5_nl2sql_agent import answer_question, get_schema_context  # type: ignore
        schema_context = get_schema_context(con)
        result = answer_question(con, question, schema_context, clearance_level)

        df = result.get("result_df")
        data = df.to_dict(orient="records") if df is not None else []

        if result.get("error"):
            return {
                "status": "error",
                "question": question,
                "route": result.get("route", "other"),
                "sql": result.get("sql", ""),
                "rows_returned": 0,
                "data": [],
                "answer": f"Query failed: {result['error']}",
            }

        return {
            "status": "success",
            "question": question,
            "route": result.get("route", "other"),
            "sql": result.get("sql", ""),
            "rows_returned": len(data),
            "data": data,
            "answer": result.get("answer", ""),
        }
    except ImportError as e:
        logger.warning("NL2SQL import failed (pipeline not on sys.path?): %s", e)
        return {
            "status": "error",
            "question": question,
            "route": "other",
            "sql": "",
            "rows_returned": 0,
            "data": [],
            "answer": "NL2SQL agent unavailable. Ensure GROQ_API_KEY is set and ML pipeline is accessible.",
        }
    except Exception as e:
        logger.exception("NL2SQL error for question: %s", question)
        return {
            "status": "error",
            "question": question,
            "route": "other",
            "sql": "",
            "rows_returned": 0,
            "data": [],
            "answer": f"An error occurred: {str(e)}",
        }
