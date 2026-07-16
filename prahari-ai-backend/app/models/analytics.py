"""Analytics endpoint schemas."""
from pydantic import BaseModel
from typing import List


class CrimeCategory(BaseModel):
    type: str
    count: int
    pct: float
    color: str


class PatternsResponse(BaseModel):
    categories: List[CrimeCategory]


class RiskZone(BaseModel):
    zone: str
    score: int
    trend: int
    confidence: int
    factors: List[str]


class StationStats(BaseModel):
    station: str
    zone: str
    clearanceRate: float
    avgResponse: float
    caseVolume: int
    rank: int


class AgeGroup(BaseModel):
    group: str
    offenderPct: float
    victimPct: float


class TimeSlot(BaseModel):
    slot: str
    incidents: int


class DemographicsResponse(BaseModel):
    ageGroups: List[AgeGroup]
    timeDistribution: List[TimeSlot]
