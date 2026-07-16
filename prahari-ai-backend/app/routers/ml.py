"""
ML Analytics Router — /api/v1/*
All endpoints defined in prahari-ai-ml/api_endpoints.md.
Bridges DuckDB + ML pipeline functions to the frontend.
"""
from typing import List, Optional

from app.models.user import User
from fastapi import APIRouter, Depends, HTTPException, Query

from app.dependencies import get_current_user
from app.database import get_db
import app.services.ml_service as ml_service
from app.models.ml import (
    CrimeVolumeResponse,
    ChargesheetRatesResponse,
    HotspotsResponse,
    ClustersResponse,
    RepeatOffendersResponse,
    CoaccusedNetworkResponse,
    ForecastResponse,
    BenchmarkResponse,
    NL2SQLRequest,
    NL2SQLResponse,
)
from app.models.chat import ChatSession, ChatMessage
from app.core.db import get_auth_db

router = APIRouter()


# ── 1. Overview & Volume ──────────────────────────────────────────────────────

@router.get(
    "/crime/volume",
    response_model=CrimeVolumeResponse,
    summary="Aggregated crime case counts",
)
async def crime_volume(
    district: Optional[str] = Query(default=None, description="Exact district name"),
    unit: Optional[str] = Query(default=None, description="Police station unit name"),
    crime_group: Optional[str] = Query(default=None, description="Major crime head group"),
    gravity: Optional[str] = Query(default=None, description="Heinous or Non Heinous"),
    year: Optional[int] = Query(default=None, description="Calendar year"),
    current_user: User = Depends(get_current_user),
    db=Depends(get_db),
):
    """
    Returns aggregated case counts over time filterable by district, unit,
    crime group, gravity classification, and year.
    """
    return ml_service.get_crime_volume(db, district, unit, crime_group, gravity, year)


@router.get(
    "/crime/chargesheet-rates",
    response_model=ChargesheetRatesResponse,
    summary="Case chargesheet rates comparison",
)
async def chargesheet_rates(
    districts: Optional[str] = Query(
        default="Bengaluru City,Mysuru City",
        description="Comma-separated district names (e.g. 'Bengaluru City,Mysuru City')",
    ),
    year: Optional[int] = Query(default=None, description="Filter by year"),
    current_user: User = Depends(get_current_user),
    db=Depends(get_db),
):
    """
    Calculates and compares chargesheet rates across specified districts.
    Pass multiple districts as a comma-separated string.
    """
    district_list = [d.strip() for d in (districts or "").split(",") if d.strip()]
    if not district_list:
        district_list = ["Bengaluru City", "Mysuru City"]
    return ml_service.get_chargesheet_rates(db, district_list, year)


# ── 2. Spatial & Hotspots ─────────────────────────────────────────────────────

@router.get(
    "/crime/hotspots",
    response_model=HotspotsResponse,
    summary="Real-coordinate crime hotspots",
)
async def crime_hotspots(
    district: str = Query(..., description="Target district name (e.g. 'Bengaluru City')"),
    min_cases: int = Query(default=5, ge=1, description="Minimum real-coordinate case count"),
    current_user: User = Depends(get_current_user),
    db=Depends(get_db),
):
    """
    Returns geo-coordinates of crime hotspots using ONLY real (non-imputed)
    GPS coordinates from fact_crime_geo. Excludes synthetic district centroids.
    """
    return ml_service.get_hotspots(db, district, min_cases)


@router.get(
    "/crime/clusters",
    response_model=ClustersResponse,
    summary="Density-based crime clusters (DBSCAN/HDBSCAN/K-Means)",
)
async def crime_clusters(
    district: str = Query(..., description="Target district name"),
    current_user: User = Depends(get_current_user),
    db=Depends(get_db),
):
    """
    Returns spatial crime clusters from the winning model (DBSCAN/HDBSCAN/K-Means)
    selected per-district by silhouette score with noise-ratio eligibility floor.
    """
    return ml_service.get_clusters(db, district)


# ── 3. Offender Networks ──────────────────────────────────────────────────────

@router.get(
    "/offenders/repeat-offenders",
    response_model=RepeatOffendersResponse,
    summary="Repeat offender statistics",
)
async def repeat_offenders(
    district: Optional[str] = Query(default=None, description="Filter by district"),
    crime_group: Optional[str] = Query(default=None, description="Filter by crime group"),
    current_user: User = Depends(get_current_user),
    db=Depends(get_db),
):
    """
    Returns statistical indices on repeat offenders (synthetically injected
    recidivist identities for demo purposes — not real criminal records).
    """
    return ml_service.get_repeat_offenders(db, district, crime_group)


@router.get(
    "/offenders/coaccused-network",
    response_model=CoaccusedNetworkResponse,
    summary="Co-accused network graph",
)
async def coaccused_network(
    district: str = Query(..., description="Target district (e.g. 'Bengaluru City')"),
    min_weight: int = Query(default=2, ge=1, description="Minimum co-accused occurrences for an edge"),
    current_user: User = Depends(get_current_user),
    db=Depends(get_db),
):
    """
    Retrieves co-accused network graph nodes and edges from the GraphML output
    of the ML pipeline for visualizing criminal syndicates.
    """
    return ml_service.get_coaccused_network(db, district, min_weight)


# ── 4. Trend & Forecasting ────────────────────────────────────────────────────

@router.get(
    "/crime/forecast",
    response_model=ForecastResponse,
    summary="Next-month crime forecast (SARIMA/Holt-Winters/XGBoost)",
)
async def crime_forecast(
    district: str = Query(..., description="Target district"),
    crime_group: str = Query(..., description="Major crime group (e.g. 'THEFT')"),
    current_user: User = Depends(get_current_user),
    db=Depends(get_db),
):
    """
    Returns historical monthly crime counts with next-month predictive forecast
    from the winning model (selected per-series by held-out MAE benchmark).
    """
    return ml_service.get_forecast(db, district, crime_group)


@router.get(
    "/crime/forecast/benchmarks",
    response_model=BenchmarkResponse,
    summary="Model benchmark scorecard (SARIMA vs Holt-Winters vs XGBoost)",
)
async def forecast_benchmarks(
    district: str = Query(..., description="Target district"),
    crime_group: str = Query(..., description="Major crime group"),
    current_user: User = Depends(get_current_user),
    db=Depends(get_db),
):
    """
    Returns comparative benchmark indicators (MAE, RMSE, MAPE) for all three
    trend models evaluated on a time-based held-out window.
    """
    return ml_service.get_forecast_benchmarks(db, district, crime_group)


# ── 5. Natural Language Agent ─────────────────────────────────────────────────

@router.post(
    "/search/nl2sql",
    response_model=NL2SQLResponse,
    summary="Natural language to SQL analytics query",
)
async def nl2sql(
    body: NL2SQLRequest,
    current_user: User = Depends(get_current_user),
    db=Depends(get_db),
    auth_db=Depends(get_auth_db)
):
    """
    Processes natural language questions, translates them to validated DuckDB SQL
    via the Groq LLM (llama-3.3-70b-versatile), executes the query, and returns
    structured data alongside a plain-English answer.
    """
    if not body.question.strip():
        raise HTTPException(status_code=400, detail="Question cannot be empty.")
        
    clearance_level = current_user.clearance_level
    result = ml_service.run_nl2sql(db, body.question, clearance_level=clearance_level)
    
    # Check if this is a general greeting or non-sql
    if result.get("route") == "greeting" or result.get("route") == "conversational":
        pass # We still want to save conversational messages
        
    session_id = body.session_id
    if not session_id:
        new_session = ChatSession(
            user_badge_id=current_user.badge_id,
            title=body.question[:40] + ("..." if len(body.question) > 40 else "")
        )
        auth_db.add(new_session)
        auth_db.commit()
        auth_db.refresh(new_session)
        session_id = new_session.id

    # Save user message
    auth_db.add(ChatMessage(session_id=session_id, sender="user", text=body.question))
    
    # Save bot message
    auth_db.add(ChatMessage(session_id=session_id, sender="bot", text=result["answer"]))
    auth_db.commit()
    
    result["session_id"] = session_id
    return result

@router.get("/chat/sessions", summary="Get user chat history")
async def get_chat_sessions(current_user: User = Depends(get_current_user), auth_db=Depends(get_auth_db)):
    sessions = auth_db.query(ChatSession).filter(ChatSession.user_badge_id == current_user.badge_id).order_by(ChatSession.created_at.desc()).all()
    return [{"id": s.id, "title": s.title, "created_at": s.created_at} for s in sessions]

@router.get("/chat/sessions/{session_id}/messages", summary="Get messages in a session")
async def get_chat_messages(session_id: int, current_user: User = Depends(get_current_user), auth_db=Depends(get_auth_db)):
    session = auth_db.query(ChatSession).filter(ChatSession.id == session_id, ChatSession.user_badge_id == current_user.badge_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    messages = auth_db.query(ChatMessage).filter(ChatMessage.session_id == session_id).order_by(ChatMessage.created_at.asc()).all()
    return [{"id": m.id, "sender": m.sender, "text": m.text, "created_at": m.created_at} for m in messages]
