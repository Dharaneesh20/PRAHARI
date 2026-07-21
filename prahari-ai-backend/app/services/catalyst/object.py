"""
Prahari AI — Zoho Catalyst Object Recognition Service
Identify vehicles, weapons and evidence from uploaded images.
"""
import logging
from typing import Dict, Any
from app.services.catalyst.client import post_catalyst_api
from app.services.catalyst.auth import is_catalyst_configured

logger = logging.getLogger(__name__)

async def recognize_objects(
    image_bytes: bytes,
    filename: str = "evidence.jpg",
    content_type: str = "image/jpeg",
) -> Dict[str, Any]:
    """
    Identifies objects in uploaded evidence images using Zoho Catalyst Object Recognition.
    """
    if not is_catalyst_configured():
        return {
            "status": "unconfigured",
            "message": "Zoho Catalyst credentials not configured.",
            "objects": [
                {"label": "Vehicle", "confidence": 0.94, "box": [10, 20, 100, 200]},
                {"label": "License Plate", "confidence": 0.89, "box": [50, 60, 80, 120]},
            ],
            "provider": "Powered by Zoho Catalyst",
        }

    files = {
        "image": (filename, image_bytes, content_type),
    }

    res = await post_catalyst_api("ml/object-recognition", files=files)
    if "error" in res or res.get("status") == "unconfigured":
        return res

    return {
        "status": "success",
        "result": res.get("data", res),
        "provider": "Powered by Zoho Catalyst",
    }
