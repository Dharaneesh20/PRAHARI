"""ML service bridge to the Prahari AI DuckDB pipeline outputs."""
import logging
import os
from typing import Any

logger = logging.getLogger(__name__)


def _unavailable(payload: dict[str, Any]) -> dict[str, Any]:
    return {
        "status": "unavailable",
        "message": "ML database is not connected. Run the pipeline to populate karnataka_fir.duckdb.",
        **payload,
    }


def _run_query(con, sql: str, params: list | None = None) -> list[dict]:
    try:
        result = con.execute(sql, params or []).fetchdf()
        return result.to_dict(orient="records")
    except Exception as exc:
        logger.warning("DuckDB query failed: %s | SQL: %s", exc, sql[:120])
        return []


def get_crime_volume(con, district: str | None, unit: str | None, crime_group: str | None, gravity: str | None, year: int | None) -> dict:
    if con is None:
        return _unavailable({"filters": {}, "data": {"total_cases": 0, "heinous_cases": 0, "non_heinous_cases": 0, "breakdown": []}})

    filters: dict[str, Any] = {}
    where_clauses: list[str] = []
    params: list[Any] = []
    for key, column, value in [
        ("district", "DistrictName = ?", district),
        ("unit", "UnitName = ?", unit),
        ("gravity", "Gravity = ?", gravity),
        ("year", "CrimeYear = ?", year),
    ]:
        if value:
            where_clauses.append(column)
            params.append(value)
            filters[key] = value
    if crime_group:
        where_clauses.append("LOWER(CrimeGroupName) LIKE ?")
        params.append(f"%{crime_group.lower()}%")
        filters["crime_group"] = crime_group

    where = f"WHERE {' AND '.join(where_clauses)}" if where_clauses else ""
    totals = _run_query(con, f"""
        SELECT COALESCE(SUM(CaseCount), 0) AS total_cases,
               COALESCE(SUM(CASE WHEN Gravity = 'Heinous' THEN CaseCount ELSE 0 END), 0) AS heinous_cases,
               COALESCE(SUM(CASE WHEN Gravity != 'Heinous' THEN CaseCount ELSE 0 END), 0) AS non_heinous_cases
        FROM fact_crime_agg {where}
    """, params)
    breakdown = _run_query(con, f"""
        SELECT CrimeGroupName, SUM(CaseCount) AS CaseCount, SUM(TotalChargesheeted) AS TotalChargesheeted
        FROM fact_crime_agg {where}
        GROUP BY CrimeGroupName ORDER BY CaseCount DESC LIMIT 20
    """, params)
    row = totals[0] if totals else {}
    return {
        "status": "success",
        "filters": filters,
        "data": {
            "total_cases": int(row.get("total_cases", 0)),
            "heinous_cases": int(row.get("heinous_cases", 0)),
            "non_heinous_cases": int(row.get("non_heinous_cases", 0)),
            "breakdown": [
                {
                    "CrimeGroupName": item.get("CrimeGroupName", ""),
                    "CaseCount": int(item.get("CaseCount", 0)),
                    "TotalChargesheeted": int(item.get("TotalChargesheeted", 0)),
                }
                for item in breakdown
            ],
        },
    }


def get_chargesheet_rates(con, districts: list[str], year: int | None) -> dict:
    if con is None or not districts:
        return _unavailable({"year": year, "comparisons": []})

    placeholders = ", ".join(["?" for _ in districts])
    params: list[Any] = list(districts)
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
                "district": item.get("district", ""),
                "total_cases": int(item.get("total_cases", 0)),
                "total_chargesheets": int(item.get("total_chargesheets", 0)),
                "chargesheet_rate": float(item.get("chargesheet_rate", 0.0)),
            }
            for item in rows
        ],
    }


def get_hotspots(con, district: str, min_cases: int = 5) -> dict:
    if con is None:
        return _unavailable({"district": district, "mapping_provenance": "real_coordinates_only", "hotspots": []})
    rows = _run_query(con, """
        SELECT UnitName, CrimeGroupName, AvgLatitude, AvgLongitude, RealCoordCaseCount
        FROM fact_crime_geo
        WHERE DistrictName = ? AND RealCoordCaseCount >= ?
        ORDER BY RealCoordCaseCount DESC
        LIMIT 50
    """, [district, min_cases])
    return {"status": "success", "district": district, "mapping_provenance": "real_coordinates_only", "hotspots": rows}


def get_clusters(con, district: str) -> dict:
    if con is None:
        return _unavailable({"district": district, "winning_model": "", "metrics": {"silhouette_score": 0, "noise_ratio": 0}, "clusters": []})
    model_rows = _run_query(con, """
        SELECT Model, SilhouetteScore, NoiseRatio
        FROM hotspot_model_benchmark
        WHERE District = ? AND IsSelectedModel = true
        LIMIT 1
    """, [district])
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
    model = model_rows[0] if model_rows else {}
    return {
        "status": "success",
        "district": district,
        "winning_model": model.get("Model", ""),
        "metrics": {
            "silhouette_score": float(model.get("SilhouetteScore", 0.0)),
            "noise_ratio": round(float(model.get("NoiseRatio", 0.0)) * 100, 1),
        },
        "clusters": cluster_rows,
    }


def get_repeat_offenders(con, district: str | None, crime_group: str | None) -> dict:
    if con is None:
        return _unavailable({"data": {"total_accused_records": 0, "repeat_offenders_count": 0, "recidivism_rate_pct": 0, "top_recidivists": []}})

    where_clauses = ["a.IsRepeatOffender = true"]
    params: list[Any] = []
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
    top_rows = _run_query(con, f"""
        SELECT a.AccusedName, a.RepeatPoolID, COUNT(*) AS TotalOffences, MODE(csh.CrimeHeadName) AS PrimaryCrimeSubHead
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
    total = int(total_rows[0]["total"]) if total_rows else 0
    repeat_count = int(totals[0]["repeat_count"]) if totals else 0
    return {
        "status": "success",
        "data": {
            "total_accused_records": total,
            "repeat_offenders_count": repeat_count,
            "recidivism_rate_pct": round(repeat_count * 100 / total, 1) if total else 0,
            "top_recidivists": top_rows,
        },
    }


def get_coaccused_network(con, district: str, min_weight: int = 2) -> dict:
    if con is None:
        return _unavailable({"district": district, "graph": {"nodes": [], "edges": []}})
    from app.config import settings

    ml_root = os.path.dirname(settings.ml_pipeline_path_absolute)
    graphml_path = os.path.join(ml_root, "outputs", f"coaccused_{district.replace(' ', '_').lower()}.graphml")
    if not os.path.exists(graphml_path):
        return {"status": "success", "district": district, "graph": {"nodes": [], "edges": []}}
    try:
        import networkx as nx
        graph = nx.read_graphml(graphml_path)
        nodes = [{"id": str(node), "label": graph.nodes[node].get("label", str(node)), "size": graph.degree(node), "community": graph.nodes[node].get("community", 0)} for node in graph.nodes]
        edges = [{"source": str(source), "target": str(target), "weight": int(graph[source][target].get("weight", 1)), "type": "coaccused"} for source, target in graph.edges if graph[source][target].get("weight", 1) >= min_weight]
        return {"status": "success", "district": district, "graph": {"nodes": nodes, "edges": edges}}
    except Exception as exc:
        logger.warning("Failed to load co-accused graph for %s: %s", district, exc)
        return {"status": "success", "district": district, "graph": {"nodes": [], "edges": []}}


def get_forecast(con, district: str, crime_group: str) -> dict:
    if con is None:
        return _unavailable({"district": district, "crime_group": crime_group, "selected_model": "", "historical_data": [], "forecast": None})
    fc_rows = _run_query(con, """
        SELECT BestModel, NextMonthForecast, Last6MonthAvg
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
        return {"status": "success", "district": district, "crime_group": crime_group, "selected_model": "", "historical_data": [], "forecast": None}
    forecast = fc_rows[0]
    predicted = float(forecast.get("NextMonthForecast", 0))
    avg = float(forecast.get("Last6MonthAvg", predicted))
    margin = abs(predicted - avg) * 0.15 + 20
    return {
        "status": "success",
        "district": district,
        "crime_group": crime_group,
        "selected_model": forecast.get("BestModel", ""),
        "historical_data": list(reversed(hist_rows)),
        "forecast": {
            "month": "Next Month",
            "predicted_value": round(predicted, 2),
            "confidence_interval_lower": round(max(0, predicted - margin), 2),
            "confidence_interval_upper": round(predicted + margin, 2),
        },
    }


def get_forecast_benchmarks(con, district: str, crime_group: str) -> dict:
    if con is None:
        return _unavailable({"district": district, "crime_group": crime_group, "benchmark_scorecard": []})
    rows = _run_query(con, """
        SELECT Model, MAE AS mae, RMSE AS rmse, MAPE_pct AS mape, IsSelectedModel AS is_winner
        FROM trend_model_benchmark
        WHERE District = ? AND CrimeGroup = ?
        ORDER BY mae ASC
    """, [district, crime_group])
    return {"status": "success", "district": district, "crime_group": crime_group, "benchmark_scorecard": rows}


def run_nl2sql(con, question: str, role: str, scope_id: int | None = None, clearance_level: int = 1, session_id: str | None = None) -> dict:
    if con is None:
        return _unavailable({"question": question, "route": "other", "sql": "", "rows_returned": 0, "data": [], "answer": "ML database is not connected."})
    try:
        from step5_nl2sql_agent import answer_question, get_schema_context  # type: ignore
        result = answer_question(con, question, get_schema_context(con), role, scope_id, clearance_level, session_id=session_id)
        df = result.get("result_df")
        data = df.to_dict(orient="records") if df is not None else []
        if result.get("error"):
            return {"status": "error", "question": question, "route": result.get("route", "other"), "sql": result.get("sql", ""), "rows_returned": 0, "data": [], "answer": f"Query failed: {result['error']}"}
        return {"status": "success", "question": question, "route": result.get("route", "other"), "sql": result.get("sql", ""), "rows_returned": len(data), "data": data, "answer": result.get("answer", "")}
    except ImportError as exc:
        logger.warning("NL2SQL import failed: %s", exc)
        return {"status": "error", "question": question, "route": "other", "sql": "", "rows_returned": 0, "data": [], "answer": "NL2SQL agent unavailable."}
    except Exception as exc:
        logger.exception("NL2SQL error for question: %s", question)
        return {"status": "error", "question": question, "route": "other", "sql": "", "rows_returned": 0, "data": [], "answer": f"An error occurred: {exc}"}


def run_voice_nl2sql(con, audio_bytes: bytes, role: str, scope_id: int | None = None, output_language: str = "kn-IN", session_id: str | None = None) -> dict:
    if con is None:
        return {
            "transcript": "",
            "detected_language": "kn-IN",
            "answer_text": "ML database is not connected.",
            "audio_response": "",
            "audit_id": None,
            "error": "ML database is not connected."
        }
    try:
        from step5_nl2sql_agent import answer_question_voice  # type: ignore
        result = answer_question_voice(con, audio_bytes, role, scope_id, output_language, session_id=session_id)
        return {
            "transcript": result.get("transcript", ""),
            "detected_language": result.get("detected_language", "kn-IN"),
            "answer_text": result.get("answer_text", ""),
            "audio_response": result.get("audio_response", ""),
            "audit_id": result.get("audit_id"),
            "error": result.get("error")
        }
    except Exception as exc:
        logger.warning("Voice NL2SQL execution failed: %s", exc)
        return {
            "transcript": "",
            "detected_language": "kn-IN",
            "answer_text": f"Voice service failure: {str(exc)}",
            "audio_response": "",
            "audit_id": None,
            "error": str(exc)
        }
