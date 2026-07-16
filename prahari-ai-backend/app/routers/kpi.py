"""KPI Dashboard router — /kpi/summary, /kpi/trend, /kpi/hotspots"""
from typing import Literal, List
from fastapi import APIRouter, Depends, Query
from app.dependencies import get_current_user
from app.models.kpi import KPISummary, TrendPoint, Hotspot, HotspotCoords
from app.database import get_db
import app.services.ml_service as ml_service
from datetime import datetime, timedelta, timezone

router = APIRouter()

def _day_label(days_ago: int) -> str:
    d = datetime.now(timezone.utc) - timedelta(days=days_ago)
    return d.strftime("%b %d")


@router.get("/summary", response_model=KPISummary, summary="Top-level KPI metrics")
async def get_kpi_summary(
    range: Literal["today", "7d", "30d"] = "7d",
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db),
):
    """Returns KPI summary metrics for the dashboard."""
    return {
        "totalActiveCases": 14,
        "openCases": 14,
        "closedCases": 6,
        "alertsToday": 7,
        "avgResponseTime": 8.6,
        "clearanceRate": 72.4,
        "clearanceRateTrend": 3.2,
        "onDutyUnits": 11,
        "offDutyUnits": 1,
    }


@router.get("/trend", response_model=List[TrendPoint], summary="Incident trend over time")
async def get_kpi_trend(
    range: Literal["today", "7d", "30d"] = "7d",
    current_user: dict = Depends(get_current_user),
):
    """Returns daily incident counts for trend chart rendering."""
    if range == "today":
        return [{"date": "00:00", "value": 2}, {"date": "06:00", "value": 4},
                {"date": "12:00", "value": 3}, {"date": "18:00", "value": 5}]
    if range == "30d":
        return [{"date": _day_label(i), "value": 5 + (i % 7)} for i in range(30, 0, -1)]
    # 7d default
    return [
        {"date": _day_label(6), "value": 8},
        {"date": _day_label(5), "value": 11},
        {"date": _day_label(4), "value": 9},
        {"date": _day_label(3), "value": 14},
        {"date": _day_label(2), "value": 10},
        {"date": _day_label(1), "value": 13},
        {"date": _day_label(0), "value": 7},
    ]


@router.get("/hotspots", response_model=List[Hotspot], summary="Top crime hotspots")
async def get_kpi_hotspots(
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db),
):
    """Returns top crime hotspots with geo-coordinates and severity."""
    ml_data = ml_service.get_hotspots(db, "Bengaluru City", min_cases=5)
    hotspots_raw = ml_data.get("hotspots", [])[:5]  # limit to 5 for KPI card

    severity_map = {0: "critical", 1: "high", 2: "high", 3: "medium", 4: "low"}
    result = []
    for i, h in enumerate(hotspots_raw):
        result.append({
            "id": f"HS-{i + 1}",
            "zone": h.get("UnitName", f"Zone {i+1}"),
            "incidents": h.get("RealCoordCaseCount", 0),
            "severity": severity_map.get(i, "medium"),
            "coords": {
                "lat": h.get("AvgLatitude", 12.9716),
                "lng": h.get("AvgLongitude", 77.5946),
            },
        })
    return result
