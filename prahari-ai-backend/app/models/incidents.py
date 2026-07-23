"""Incident request/response schemas."""
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class IncidentLocation(BaseModel):
    lat: float
    lng: float
    zone: str
    address: str


class TimelineEntry(BaseModel):
    time: datetime
    action: str
    by: str


class Incident(BaseModel):
    id: str
    type: str
    severity: str          # low | medium | high | critical
    status: str            # new | dispatched | in-progress | resolved
    location: IncidentLocation
    timestamp: datetime
    description: str
    source: str            # citizen | patrol | cctv | anonymous
    assignedUnitId: Optional[str] = None
    stationId: str
    timeline: List[TimelineEntry] = []


class UpdateStatusRequest(BaseModel):
    status: str


class UpdateStatusResponse(BaseModel):
    id: str
    status: str
    updatedAt: datetime


class AssignUnitRequest(BaseModel):
    unitId: str


class AssignUnitResponse(BaseModel):
    id: str
    assignedUnitId: str
    status: str
