"""ML analytics endpoint schemas (mirrors prahari-ai-ml api_endpoints.md)."""
from pydantic import BaseModel
from typing import List, Optional, Any


# ── Crime Volume ──────────────────────────────────────────────────────────────
class CrimeGroupBreakdown(BaseModel):
    CrimeGroupName: str
    CaseCount: int
    TotalChargesheeted: int


class CrimeVolumeFilters(BaseModel):
    district: Optional[str] = None
    unit: Optional[str] = None
    crime_group: Optional[str] = None
    gravity: Optional[str] = None
    year: Optional[int] = None


class CrimeVolumeData(BaseModel):
    total_cases: int
    heinous_cases: int
    non_heinous_cases: int
    breakdown: List[CrimeGroupBreakdown]


class CrimeVolumeResponse(BaseModel):
    status: str
    filters: dict
    data: CrimeVolumeData


# ── Chargesheet Rates ─────────────────────────────────────────────────────────
class ChargesheetComparison(BaseModel):
    district: str
    total_cases: int
    total_chargesheets: int
    chargesheet_rate: float


class ChargesheetRatesResponse(BaseModel):
    status: str
    year: Optional[int] = None
    comparisons: List[ChargesheetComparison]


# ── Hotspots ──────────────────────────────────────────────────────────────────
class HotspotPoint(BaseModel):
    UnitName: str
    CrimeGroupName: str
    AvgLatitude: float
    AvgLongitude: float
    RealCoordCaseCount: int


class HotspotsResponse(BaseModel):
    status: str
    district: str
    mapping_provenance: str
    hotspots: List[HotspotPoint]


# ── Clusters ──────────────────────────────────────────────────────────────────
class ClusterMetrics(BaseModel):
    silhouette_score: float
    noise_ratio: float


class ClusterItem(BaseModel):
    cluster_id: int
    centroid_lat: float
    centroid_lon: float
    core_point_count: int
    primary_crime_group: str


class ClustersResponse(BaseModel):
    status: str
    district: str
    winning_model: str
    metrics: ClusterMetrics
    clusters: List[ClusterItem]


# ── Repeat Offenders ──────────────────────────────────────────────────────────
class TopRecidivist(BaseModel):
    AccusedName: str
    RepeatPoolID: int
    TotalOffences: int
    PrimaryCrimeSubHead: str


class RepeatOffendersData(BaseModel):
    total_accused_records: int
    repeat_offenders_count: int
    recidivism_rate_pct: float
    top_recidivists: List[TopRecidivist]


class RepeatOffendersResponse(BaseModel):
    status: str
    data: RepeatOffendersData


# ── Co-accused Network ────────────────────────────────────────────────────────
class NetworkNode(BaseModel):
    id: str
    label: str
    size: int
    community: int


class NetworkEdge(BaseModel):
    source: str
    target: str
    weight: int
    type: str


class NetworkGraph(BaseModel):
    nodes: List[NetworkNode]
    edges: List[NetworkEdge]


class CoaccusedNetworkResponse(BaseModel):
    status: str
    district: str
    graph: NetworkGraph


# ── Forecast ──────────────────────────────────────────────────────────────────
class HistoricalPoint(BaseModel):
    month: str
    actual: int


class ForecastPoint(BaseModel):
    month: str
    predicted_value: float
    confidence_interval_lower: float
    confidence_interval_upper: float


class ForecastResponse(BaseModel):
    status: str
    district: str
    crime_group: str
    selected_model: str
    historical_data: List[HistoricalPoint]
    forecast: ForecastPoint


# ── Benchmark ─────────────────────────────────────────────────────────────────
class BenchmarkModel(BaseModel):
    model: str
    mae: float
    rmse: float
    mape: float
    is_winner: bool


class BenchmarkResponse(BaseModel):
    status: str
    district: str
    crime_group: str
    benchmark_scorecard: List[BenchmarkModel]


# ── NL2SQL ────────────────────────────────────────────────────────────────────
class NL2SQLRequest(BaseModel):
    question: str
    role: str
    scope_id: Optional[int] = None
    session_id: Optional[int] = None


class NL2SQLResponse(BaseModel):
    status: str
    question: str
    session_id: Optional[int] = None
    route: str
    sql: str
    rows_returned: int
    data: List[Any]
    answer: str
