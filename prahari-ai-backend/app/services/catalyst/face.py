"""
Prahari AI — Zoho Catalyst Face Analytics Service
Face detection and attribute analysis.
"""
import logging
from typing import Dict, Any
from app.services.catalyst.client import post_catalyst_api
from app.services.catalyst.auth import is_catalyst_configured

logger = logging.getLogger(__name__)

async def analyze_face(
    image_bytes: bytes,
    filename: str = "face.jpg",
    content_type: str = "image/jpeg",
) -> Dict[str, Any]:
    """
    Performs face analytics using Zoho Catalyst.
    """
    if not is_catalyst_configured():
        return {
            "status": "unconfigured",
            "message": "Zoho Catalyst credentials not configured.",
            "faces_detected": 1,
            "attributes": {"gender": "male", "age_group": "25-35", "emotion": "neutral"},
            "provider": "Powered by Zoho Catalyst",
        }

    files = {
        "image": (filename, image_bytes, content_type),
    }

    res = await post_catalyst_api("ml/face-analytics", files=files)
    if "error" in res or res.get("status") == "unconfigured":
        return res

    return {
        "status": "success",
        "result": res.get("data", res),
        "provider": "Powered by Zoho Catalyst",
    }
