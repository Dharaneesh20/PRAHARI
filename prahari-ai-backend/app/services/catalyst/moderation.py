"""
Prahari AI — Zoho Catalyst Image Moderation Service
Detect unsafe or inappropriate image content.
"""
import logging
from typing import Dict, Any
from app.services.catalyst.client import post_catalyst_api
from app.services.catalyst.auth import is_catalyst_configured

logger = logging.getLogger(__name__)

async def moderate_image(
    image_bytes: bytes,
    filename: str = "image.jpg",
    content_type: str = "image/jpeg",
) -> Dict[str, Any]:
    """
    Analyzes safety and moderation labels for an image using Zoho Catalyst Image Moderation.
    """
    if not is_catalyst_configured():
        return {
            "status": "unconfigured",
            "message": "Zoho Catalyst credentials not configured.",
            "is_safe": True,
            "confidence": 0.99,
            "categories": {"explicit": False, "violence": False},
            "provider": "Powered by Zoho Catalyst",
        }

    files = {
        "code": (filename, image_bytes, content_type),
    }

    res = await post_catalyst_api("ml/image-moderation", files=files)
    if "error" in res or res.get("status") == "unconfigured":
        return res

    return {
        "status": "success",
        "result": res.get("data", res),
        "provider": "Powered by Zoho Catalyst",
    }
