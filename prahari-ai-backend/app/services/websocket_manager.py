"""
WebSocket connection manager.
Handles broadcast to all connected WS clients and simulates live
incident/unit position updates via a background asyncio task.
"""
import asyncio
import json
import logging
import random
from datetime import datetime, timezone
from typing import Any

from fastapi import WebSocket

logger = logging.getLogger(__name__)


class ConnectionManager:
    """Generic broadcast manager for a single WS endpoint."""

    def __init__(self, name: str):
        self.name = name
        self.active: list[WebSocket] = []

    async def connect(self, ws: WebSocket) -> None:
        await ws.accept()
        self.active.append(ws)
        logger.info("[WS:%s] Client connected — total: %d", self.name, len(self.active))

    def disconnect(self, ws: WebSocket) -> None:
        if ws in self.active:
            self.active.remove(ws)
        logger.info("[WS:%s] Client disconnected — total: %d", self.name, len(self.active))

    async def broadcast(self, payload: Any) -> None:
        message = json.dumps(payload)
        dead: list[WebSocket] = []
        for ws in list(self.active):
            try:
                await ws.send_text(message)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.disconnect(ws)


# Singleton managers
incident_manager = ConnectionManager("incidents")
unit_manager = ConnectionManager("units")


# ── Simulated live feeds ──────────────────────────────────────────────────────
_INCIDENT_TYPES = ["Theft", "Assault", "Chain Snatching", "Drunk Driving", "Cyber Crime", "Trespassing"]
_SEVERITIES = ["low", "medium", "high", "critical"]
_ZONES = [
    ("Koramangala", 12.9352, 77.6245),
    ("Indiranagar", 12.9783, 77.6408),
    ("MG Road", 12.9719, 77.5937),
    ("Whitefield", 12.9698, 77.7500),
    ("Hebbal", 13.0358, 77.5970),
    ("BTM Layout", 12.9097, 77.6113),
    ("Silk Board", 12.9174, 77.6199),
    ("Rajajinagar", 12.9926, 77.5530),
    ("Marathahalli", 12.9560, 77.7010),
    ("Yelahanka", 13.1007, 77.5963),
]

_UNIT_POSITIONS = {
    "UNIT-01": [12.9141, 77.6101],
    "UNIT-02": [12.9752, 77.6093],
    "UNIT-03": [12.9352, 77.6245],
    "UNIT-04": [13.0358, 77.5970],
    "UNIT-05": [12.9097, 77.6113],
    "UNIT-06": [12.9174, 77.6199],
    "UNIT-07": [12.9698, 77.7500],
    "UNIT-08": [12.9926, 77.5530],
}

_sim_counter = 0


async def simulate_incident_stream() -> None:
    """Background task: push a simulated new incident every 15 seconds."""
    global _sim_counter
    while True:
        await asyncio.sleep(15)
        if not incident_manager.active:
            continue

        _sim_counter += 1
        zone, lat, lng = random.choice(_ZONES)
        lat += random.uniform(-0.005, 0.005)
        lng += random.uniform(-0.005, 0.005)

        payload = {
            "event": "new_incident",
            "data": {
                "id": f"INC-SIM-{_sim_counter:05d}",
                "type": random.choice(_INCIDENT_TYPES),
                "severity": random.choices(_SEVERITIES, weights=[30, 40, 20, 10])[0],
                "status": "new",
                "location": {
                    "lat": round(lat, 6),
                    "lng": round(lng, 6),
                    "zone": zone,
                    "address": f"{zone} area",
                },
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "description": f"Incident reported in {zone} area.",
                "source": random.choice(["citizen", "patrol", "cctv"]),
                "assignedUnitId": None,
                "stationId": "STN-BLR-01",
                "timeline": [],
            },
        }
        await incident_manager.broadcast(payload)
        logger.debug("[WS:incidents] Simulated incident broadcast: %s", payload["data"]["id"])


async def simulate_unit_positions() -> None:
    """Background task: push GPS position updates every 5 seconds for active units."""
    while True:
        await asyncio.sleep(5)
        if not unit_manager.active:
            continue

        for unit_id, pos in _UNIT_POSITIONS.items():
            # Simulate small movement
            pos[0] += random.uniform(-0.0005, 0.0005)
            pos[1] += random.uniform(-0.0005, 0.0005)
            payload = {
                "unitId": unit_id,
                "position": {"lat": round(pos[0], 6), "lng": round(pos[1], 6)},
            }
            await unit_manager.broadcast(payload)
