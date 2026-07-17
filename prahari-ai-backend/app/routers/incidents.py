"""Incidents router — CRUD + WebSocket stream"""
import asyncio
from typing import List, Optional
from datetime import datetime, timezone

from app.models.user import User
from fastapi import APIRouter, Depends, HTTPException, Query, WebSocket, WebSocketDisconnect, status

from app.dependencies import get_current_user, require_level_1
from app.core.db import get_auth_db
from app.models.incidents import (
    Incident, UpdateStatusRequest, UpdateStatusResponse,
    AssignUnitRequest, AssignUnitResponse,
)
from app.services import operational_store
from app.services.websocket_manager import incident_manager, simulate_incident_stream
from sqlalchemy.orm import Session

router = APIRouter()

# Background task handle (started once on first WS connection)
_sim_task: asyncio.Task | None = None


@router.get("", response_model=List[Incident], summary="List incidents")
async def list_incidents(
    severity: str = Query(default="all"),
    status: str = Query(default="all"),
    current_user: User = Depends(require_level_1),
    db: Session = Depends(get_auth_db),
):
    """Retrieve all incidents, filterable by severity and status."""
    return operational_store.list_incidents(db, severity=severity, status=status)


@router.patch("/{incident_id}/status", response_model=UpdateStatusResponse, summary="Update incident status")
async def update_incident_status(
    incident_id: str,
    body: UpdateStatusRequest,
    current_user: User = Depends(require_level_1),
    db: Session = Depends(get_auth_db),
):
    """Update the operational status of an incident."""
    inc = operational_store.update_incident_status(db, incident_id, body.status, current_user.name)
    if inc is None:
        raise HTTPException(status_code=404, detail=f"Incident {incident_id} not found.")
    return {
        "id": inc["id"],
        "status": inc["status"],
        "updatedAt": datetime.now(timezone.utc),
    }


@router.post("/{incident_id}/assign", response_model=AssignUnitResponse, summary="Assign patrol unit")
async def assign_unit(
    incident_id: str,
    body: AssignUnitRequest,
    current_user: User = Depends(require_level_1),
    db: Session = Depends(get_auth_db),
):
    """Assign a patrol unit to a specific incident."""
    inc = operational_store.assign_unit_to_incident(db, incident_id, body.unitId, current_user.name)
    if inc is None:
        raise HTTPException(status_code=404, detail=f"Incident {incident_id} or unit {body.unitId} not found.")
    return {
        "id": inc["id"],
        "assignedUnitId": inc["assignedUnitId"],
        "status": inc["status"],
    }


@router.websocket("/stream")
async def incidents_stream(websocket: WebSocket):
    """
    WebSocket endpoint for live incident events.
    Pushes new_incident events every ~15 seconds (simulated).
    No auth required on WS — token should be sent as a query param
    in production: ws://host/incidents/stream?token=<jwt>
    """
    global _sim_task
    await incident_manager.connect(websocket)

    # Start background simulator if not already running
    if _sim_task is None or _sim_task.done():
        _sim_task = asyncio.create_task(simulate_incident_stream())

    try:
        while True:
            # Keep connection alive — listen for any client messages
            await websocket.receive_text()
    except WebSocketDisconnect:
        incident_manager.disconnect(websocket)
