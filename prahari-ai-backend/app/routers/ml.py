"""
ML Analytics Router — /api/v1/*
All endpoints defined in prahari-ai-ml/api_endpoints.md.
Bridges DuckDB + ML pipeline functions to the frontend.
"""
from typing import List, Optional
from pydantic import BaseModel

from app.models.user import User
from fastapi import APIRouter, Depends, HTTPException, Query, File, UploadFile, Form, Response
from fastapi.concurrency import run_in_threadpool
from fastapi.responses import StreamingResponse

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
        
    if body.role in ["SHO", "SP"] and body.scope_id is None:
        raise HTTPException(status_code=400, detail=f"scope_id is required when role is {body.role}.")
        
    session_id = body.session_id
    if not session_id:
        new_session = ChatSession(
            user_badge_id=current_user.badge_id,
            title=body.question[:40] + ("..." if len(body.question) > 40 else "")
        )
        auth_db.add(new_session)
        auth_db.commit()
        auth_db.refresh(new_session)
        session_id = str(new_session.id)
    else:
        session_id = str(session_id)

    clearance_level = current_user.clearance_level
    result = await run_in_threadpool(ml_service.run_nl2sql, db, body.question, body.role, body.scope_id, clearance_level, session_id)
    
    # Check if this is a general greeting or non-sql
    if result.get("route") == "greeting" or result.get("route") == "conversational":
        pass # We still want to save conversational messages
        
    # Save user message
    auth_db.add(ChatMessage(session_id=int(session_id) if session_id.isdigit() else 0, sender="user", text=body.question))
    
    # Save bot message
    auth_db.add(ChatMessage(session_id=int(session_id) if session_id.isdigit() else 0, sender="bot", text=result["answer"]))
    auth_db.commit()
    
    result["session_id"] = session_id
    return result


class UpdateChatSessionRequest(BaseModel):
    title: Optional[str] = None
    is_pinned: Optional[bool] = None
    is_starred: Optional[bool] = None
    tag_label: Optional[str] = None
    tag_color: Optional[str] = None


@router.post(
    "/search/nl2sql/stream",
    summary="Natural language to SQL analytics query with real-time token streaming",
)
async def nl2sql_stream(
    body: NL2SQLRequest,
    current_user: User = Depends(get_current_user),
    db=Depends(get_db),
    auth_db=Depends(get_auth_db),
):
    """
    Streams LLM token response in real-time using Server-Sent Events (SSE),
    creates/persists chat session, and records user & bot messages.
    """
    if not body.question.strip():
        raise HTTPException(status_code=400, detail="Question cannot be empty.")
        
    clearance_level = current_user.clearance_level
    session_id = body.session_id

    # Create session if not provided or invalid
    if not session_id or not str(session_id).isdigit():
        title_text = body.question[:40] + ("..." if len(body.question) > 40 else "")
        new_session = ChatSession(
            user_badge_id=current_user.badge_id,
            title=title_text
        )
        auth_db.add(new_session)
        auth_db.commit()
        auth_db.refresh(new_session)
        session_id = str(new_session.id)
    else:
        session_id = str(session_id)

    # Save user message immediately
    session_int_id = int(session_id) if session_id.isdigit() else 0
    if session_int_id > 0:
        auth_db.add(ChatMessage(session_id=session_int_id, sender="user", text=body.question))
        auth_db.commit()

    async def _stream_with_persistence():
        # First send session meta to client
        import json
        yield f'data: {{"meta": {{"session_id": "{session_id}"}}}}\n\n'

        accumulated_answer = ""
        generator = ml_service.run_nl2sql_stream(
            db,
            body.question,
            body.role,
            body.scope_id,
            clearance_level=clearance_level,
            session_id=session_id
        )

        async for chunk in generator:
            yield chunk

            # Extract token content to accumulate final answer
            if chunk.startswith("data: "):
                try:
                    parsed = json.loads(chunk[6:].strip())
                    if parsed.get("token") and parsed["token"] != "[DONE]":
                        accumulated_answer += parsed["token"]
                except Exception:
                    pass

        # Save bot message on completion
        if session_int_id > 0 and accumulated_answer.strip():
            try:
                auth_db.add(ChatMessage(session_id=session_int_id, sender="bot", text=accumulated_answer))
                auth_db.commit()
            except Exception as e:
                pass

    return StreamingResponse(
        _stream_with_persistence(),
        media_type="text/event-stream"
    )


@router.get("/chat/sessions", summary="Get user chat history")
async def get_chat_sessions(
    q: Optional[str] = Query(None, description="Search query filter for session title or messages"),
    current_user: User = Depends(get_current_user),
    auth_db=Depends(get_auth_db)
):
    query = auth_db.query(ChatSession).filter(ChatSession.user_badge_id == current_user.badge_id)
    
    if q and q.strip():
        search_term = f"%{q.strip()}%"
        # Search by title or matching message text
        matching_ids = auth_db.query(ChatMessage.session_id).filter(ChatMessage.text.ilike(search_term)).subquery()
        query = query.filter(
            (ChatSession.title.ilike(search_term)) | (ChatSession.id.in_(matching_ids))
        )
        
    sessions = query.order_by(ChatSession.is_pinned.desc(), ChatSession.is_starred.desc(), ChatSession.created_at.desc()).all()
    return [
        {
            "id": s.id,
            "title": s.title,
            "is_pinned": bool(s.is_pinned),
            "is_starred": bool(s.is_starred),
            "tag_label": s.tag_label,
            "tag_color": s.tag_color,
            "created_at": s.created_at
        }
        for s in sessions
    ]


@router.get("/chat/sessions/{session_id}/messages", summary="Get messages in a session")
async def get_chat_messages(session_id: int, current_user: User = Depends(get_current_user), auth_db=Depends(get_auth_db)):
    session = auth_db.query(ChatSession).filter(ChatSession.id == session_id, ChatSession.user_badge_id == current_user.badge_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    messages = auth_db.query(ChatMessage).filter(ChatMessage.session_id == session_id).order_by(ChatMessage.created_at.asc()).all()
    return [{"id": m.id, "sender": m.sender, "text": m.text, "created_at": m.created_at} for m in messages]


@router.patch("/chat/sessions/{session_id}", summary="Update session metadata (title, pin, star, tag)")
async def update_chat_session(
    session_id: int,
    body: UpdateChatSessionRequest,
    current_user: User = Depends(get_current_user),
    auth_db=Depends(get_auth_db)
):
    session = auth_db.query(ChatSession).filter(ChatSession.id == session_id, ChatSession.user_badge_id == current_user.badge_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    if body.title is not None:
        session.title = body.title
    if body.is_pinned is not None:
        session.is_pinned = body.is_pinned
    if body.is_starred is not None:
        session.is_starred = body.is_starred
    if body.tag_label is not None:
        session.tag_label = body.tag_label
    if body.tag_color is not None:
        session.tag_color = body.tag_color

    auth_db.commit()
    auth_db.refresh(session)
    return {
        "id": session.id,
        "title": session.title,
        "is_pinned": bool(session.is_pinned),
        "is_starred": bool(session.is_starred),
        "tag_label": session.tag_label,
        "tag_color": session.tag_color,
        "created_at": session.created_at
    }


@router.delete("/chat/sessions/{session_id}", summary="Delete a chat session")
async def delete_chat_session(
    session_id: int,
    current_user: User = Depends(get_current_user),
    auth_db=Depends(get_auth_db)
):
    session = auth_db.query(ChatSession).filter(ChatSession.id == session_id, ChatSession.user_badge_id == current_user.badge_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    auth_db.delete(session)
    auth_db.commit()
    return {"status": "success", "message": f"Session {session_id} deleted."}


@router.post(
    "/chat/voice",
    summary="Voice-to-voice query analytics endpoint",
)
async def chat_voice(
    file: UploadFile = File(...),
    role: str = Form(...),
    scope_id: Optional[int] = Form(None),
    output_language: str = Form("kn-IN"),
    session_id: Optional[str] = Form(None),
    current_user: User = Depends(get_current_user),
    db=Depends(get_db)
):
    """
    Accepts Kannada/English voice query, transcribes and translates it,
    scopes it via RBAC, runs NL2SQL, translates and speaks the answer,
    and returns transcript, answer, and base64-encoded voice audio response.
    """
    if role in ["SHO", "SP"] and scope_id is None:
        raise HTTPException(status_code=400, detail=f"scope_id is required when role is {role}.")

    try:
        audio_bytes = await file.read()
        result = ml_service.run_voice_nl2sql(db, audio_bytes, role, scope_id, output_language, session_id=session_id)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get(
    "/export/{session_id}",
    summary="Export conversation history to PDF",
)
async def export_conversation(
    session_id: str,
    current_user: User = Depends(get_current_user),
    db=Depends(get_db)
):
    """
    Retrieves all audit logs for the specified session_id,
    renders a beautifully formatted ReportLab PDF, and returns it as a file download.
    """
    try:
        # Import dynamically to keep imports isolated to pipeline directory
        try:
            from pdf_export import export_conversation_pdf
        except ImportError:
            import os
            import sys
            ml_pipeline_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "prahari-ai-ml", "pipeline"))
            if ml_pipeline_dir not in sys.path:
                sys.path.insert(0, ml_pipeline_dir)
            from pdf_export import export_conversation_pdf

        pdf_bytes = export_conversation_pdf(db, session_id)
        
        # Check if PDF bytes is just a default empty placeholder or empty
        if not pdf_bytes:
            raise HTTPException(status_code=404, detail="Conversation history not found or empty.")

        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"attachment; filename=conversation_report_{session_id}.pdf"
            }
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate PDF: {str(e)}")


@router.get(
    "/map/incidents",
    summary="Get real geospatial incident points across Karnataka State",
)
async def get_map_incidents(
    district: Optional[str] = Query(default=None),
    crime_group: Optional[str] = Query(default=None),
    limit: int = Query(default=2500, le=5000),
    db=Depends(get_db)
):
    """
    Returns actual coordinate points for stations and incident clusters across all of Karnataka State.
    """
    try:
        where_clauses = ["AvgLatitude IS NOT NULL", "AvgLongitude IS NOT NULL", "AvgLatitude BETWEEN 11.5 AND 18.6", "AvgLongitude BETWEEN 74.0 AND 78.6"]
        params = []
        if district:
            where_clauses.append("DistrictName = ?")
            params.append(district)
        if crime_group:
            where_clauses.append("CrimeGroupName = ?")
            params.append(crime_group)
        
        where_sql = " WHERE " + " AND ".join(where_clauses)
        sql = f"""
            SELECT 
                DistrictName as district,
                UnitName as station,
                CrimeGroupName as crime_group,
                Gravity as gravity,
                SUM(RealCoordCaseCount) as case_count,
                AVG(AvgLatitude) as lat,
                AVG(AvgLongitude) as lng
            FROM fact_crime_geo
            {where_sql}
            GROUP BY DistrictName, UnitName, CrimeGroupName, Gravity
            ORDER BY case_count DESC
            LIMIT ?
        """
        params.append(limit)
        df = db.execute(sql, params).fetchdf()
        
        results = []
        for idx, row in df.iterrows():
            severity = "medium"
            cnt = int(row["case_count"])
            grav = str(row["gravity"]).upper() if row["gravity"] else ""
            if "HEINOUS" in grav or cnt >= 50:
                severity = "critical"
            elif cnt >= 20:
                severity = "high"
            elif cnt >= 5:
                severity = "medium"
            else:
                severity = "low"

            results.append({
                "id": f"map-{idx}",
                "district": row["district"],
                "station": row["station"],
                "crime_group": row["crime_group"],
                "case_count": cnt,
                "severity": severity,
                "lat": float(row["lat"]),
                "lng": float(row["lng"]),
            })
        return {"total": len(results), "incidents": results}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch map incidents: {str(e)}")
