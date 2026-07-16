"""KPI dashboard schemas."""
from pydantic import BaseModel
from typing import List


class KPISummary(BaseModel):
    totalActiveCases: int
    openCases: int
    closedCases: int
    alertsToday: int
    avgResponseTime: float
    clearanceRate: float
    clearanceRateTrend: float
    onDutyUnits: int
    offDutyUnits: int


class TrendPoint(BaseModel):
    date: str
    value: int


class HotspotCoords(BaseModel):
    lat: float
    lng: float


class Hotspot(BaseModel):
    id: str
    zone: str
    incidents: int
    severity: str
    coords: HotspotCoords
