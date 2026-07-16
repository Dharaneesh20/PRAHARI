"""Patrol unit request/response schemas."""
from pydantic import BaseModel
from typing import List, Optional


class UnitPosition(BaseModel):
    lat: float
    lng: float


class PatrolUnit(BaseModel):
    id: str
    callsign: str
    officers: List[str]
    vehicle: str
    status: str           # responding | on-patrol | on-break | off-duty | available
    zone: str
    stationId: str
    position: UnitPosition
    shiftStart: str
    shiftEnd: str
    incidentsThisMonth: int
    avgResponseTime: float
    sparkline: List[int]


class UpdateUnitStatusRequest(BaseModel):
    status: str


class UpdateUnitStatusResponse(BaseModel):
    id: str
    status: str
