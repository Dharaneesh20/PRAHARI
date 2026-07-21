"""
Prahari AI — Zoho Catalyst Text Analytics Service
Entity extraction, sentiment analysis and keyword detection.
"""
import logging
from typing import Dict, Any
from app.services.catalyst.client import post_catalyst_api
from app.services.catalyst.auth import is_catalyst_configured

logger = logging.getLogger(__name__)

async def analyze_text(text: str) -> Dict[str, Any]:
    """
    Performs text analytics (sentiment, entities, keywords) using Zoho Catalyst.
    """
    if not is_catalyst_configured():
        return {
            "status": "unconfigured",
            "message": "Zoho Catalyst credentials not configured.",
            "sentiment": "neutral",
            "keywords": ["police", "report", "investigation"],
            "entities": [{"text": "Bengaluru", "type": "LOCATION"}],
            "provider": "Powered by Zoho Catalyst",
        }

    payload = {
        "text": text,
    }

    res = await post_catalyst_api("ml/text-analytics", json_data=payload)
    if "error" in res or res.get("status") == "unconfigured":
        return res

    return {
        "status": "success",
        "result": res.get("data", res),
        "provider": "Powered by Zoho Catalyst",
    }
