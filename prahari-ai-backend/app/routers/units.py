"""Patrol Units router — list, status update, WebSocket position stream"""
import asyncio
from typing import List

from app.models.user import User
from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect

from app.dependencies import get_current_user, require_level_1
from app.core.db import get_auth_db
from app.models.units import PatrolUnit, UpdateUnitStatusRequest, UpdateUnitStatusResponse
from app.services import operational_store
from app.services.websocket_manager import unit_manager, simulate_unit_positions
from sqlalchemy.orm import Session

router = APIRouter()

_pos_task: asyncio.Task | None = None


@router.get("", response_model=List[PatrolUnit], summary="List all patrol units")
async def list_units(current_user: User = Depends(require_level_1), db: Session = Depends(get_auth_db)):
    """Return all patrol units with their current status and position."""
    return operational_store.list_units(db)


@router.patch("/{unit_id}/status", response_model=UpdateUnitStatusResponse, summary="Update unit status")
async def update_unit_status(
    unit_id: str,
    body: UpdateUnitStatusRequest,
    current_user: User = Depends(require_level_1),
    db: Session = Depends(get_auth_db),
):
    """Update operational status of a patrol unit."""
    unit = operational_store.update_unit_status(db, unit_id, body.status)
    if unit is None:
        raise HTTPException(status_code=404, detail=f"Unit {unit_id} not found.")
    return {"id": unit["id"], "status": unit["status"]}


@router.websocket("/stream")
async def units_stream(websocket: WebSocket):
    """
    WebSocket endpoint for live GPS position updates.
    Pushes unitId + position every 5 seconds for all active units.
    """
    global _pos_task
    await unit_manager.connect(websocket)

    if _pos_task is None or _pos_task.done():
        _pos_task = asyncio.create_task(simulate_unit_positions())

    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        unit_manager.disconnect(websocket)
