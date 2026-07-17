"""KPI Dashboard router — /kpi/summary, /kpi/trend, /kpi/hotspots"""
from typing import Literal, List
from app.models.user import User
from fastapi import APIRouter, Depends, Query
from app.dependencies import get_current_user
from app.core.db import get_auth_db
from app.models.operational import IncidentRecord, PatrolUnitRecord
from app.models.kpi import KPISummary, TrendPoint, Hotspot, HotspotCoords
from app.database import get_db
import app.services.ml_service as ml_service
from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session

router = APIRouter()

def _day_label(days_ago: int) -> str:
    d = datetime.now(timezone.utc) - timedelta(days=days_ago)
    return d.strftime("%b %d")


def _as_aware(dt: datetime) -> datetime:
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt


@router.get("/summary", response_model=KPISummary, summary="Top-level KPI metrics")
async def get_kpi_summary(
    range_val: Literal["today", "7d", "30d"] = Query("7d", alias="range"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_auth_db),
):
    """Returns KPI summary metrics for the dashboard."""
    incidents = db.query(IncidentRecord).all()
    units = db.query(PatrolUnitRecord).all()
    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    active_statuses = {"new", "dispatched", "in-progress"}
    active_cases = sum(1 for incident in incidents if incident.status in active_statuses)
    closed_cases = sum(1 for incident in incidents if incident.status == "resolved")
    alerts_today = sum(1 for incident in incidents if _as_aware(incident.timestamp) >= today_start)
    response_values = [unit.avg_response_time for unit in units if unit.avg_response_time is not None]
    on_duty = sum(1 for unit in units if unit.status != "off-duty")
    off_duty = sum(1 for unit in units if unit.status == "off-duty")
    total_cases = len(incidents)
    clearance_rate = (closed_cases / total_cases * 100) if total_cases else 0
    return {
        "totalActiveCases": active_cases,
        "openCases": active_cases,
        "closedCases": closed_cases,
        "alertsToday": alerts_today,
        "avgResponseTime": round(sum(response_values) / len(response_values), 1) if response_values else 0,
        "clearanceRate": round(clearance_rate, 1),
        "clearanceRateTrend": 0,
        "onDutyUnits": on_duty,
        "offDutyUnits": off_duty,
    }


@router.get("/trend", response_model=List[TrendPoint], summary="Incident trend over time")
async def get_kpi_trend(
    range_val: Literal["today", "7d", "30d"] = Query("7d", alias="range"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_auth_db),
):
    """Returns daily incident counts for trend chart rendering."""
    incidents = db.query(IncidentRecord).all()
    now = datetime.now(timezone.utc)
    if range_val == "today":
        buckets = [(0, 6), (6, 12), (12, 18), (18, 24)]
        return [
            {
                "date": f"{start:02d}:00",
                "value": sum(1 for incident in incidents if _as_aware(incident.timestamp).date() == now.date() and start <= _as_aware(incident.timestamp).hour < end),
            }
            for start, end in buckets
        ]
    days = 30 if range_val == "30d" else 7
    points = []
    for days_ago in range(days - 1, -1, -1):
        day = (now - timedelta(days=days_ago)).date()
        points.append({
            "date": _day_label(days_ago),
            "value": sum(1 for incident in incidents if _as_aware(incident.timestamp).date() == day),
        })
    return points


@router.get("/hotspots", response_model=List[Hotspot], summary="Top crime hotspots")
async def get_kpi_hotspots(
    current_user: User = Depends(get_current_user),
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
