"""
Prahari AI — Zoho Catalyst API Client
Base HTTP client for executing requests against Zoho Catalyst Microservices APIs.
"""
import logging
import os
import httpx
from typing import Dict, Any, Optional
from app.config import settings
from app.services.catalyst.auth import get_catalyst_access_token, is_catalyst_configured

logger = logging.getLogger(__name__)

DC_API_MAP = {
    "IN": "https://api.catalyst.zoho.in",
    "US": "https://api.catalyst.zoho.com",
    "EU": "https://api.catalyst.zoho.eu",
    "AU": "https://api.catalyst.zoho.com.au",
}

def get_catalyst_base_url() -> str:
    dc = (settings.CATALYST_DC or os.getenv("CATALYST_DC", "IN")).upper()
    return DC_API_MAP.get(dc, "https://api.catalyst.zoho.in")

def get_project_id() -> str:
    return settings.CATALYST_PROJECT_ID or os.getenv("CATALYST_PROJECT_ID", "")

async def post_catalyst_api(
    endpoint: str,
    json_data: Optional[Dict[str, Any]] = None,
    files: Optional[Dict[str, Any]] = None,
    data: Optional[Dict[str, Any]] = None,
    timeout: float = 30.0,
) -> Dict[str, Any]:
    """
    Sends an authenticated request to a Zoho Catalyst service endpoint.
    """
    token = await get_catalyst_access_token()
    if not token:
        return {
            "status": "unconfigured",
            "message": "Zoho Catalyst credentials not set or OAuth refresh failed. Configure CATALYST_PROJECT_ID, CATALYST_CLIENT_ID, CATALYST_CLIENT_SECRET, and CATALYST_REFRESH_TOKEN.",
        }

    project_id = get_project_id()
    base_url = get_catalyst_base_url()
    url = f"{base_url}/baas/v1/project/{project_id}/{endpoint.lstrip('/')}"

    headers = {
        "Authorization": f"Zoho-oauthtoken {token}",
    }

    async with httpx.AsyncClient(timeout=timeout) as client:
        try:
            if files:
                response = await client.post(url, headers=headers, data=data, files=files)
            else:
                headers["Content-Type"] = "application/json"
                response = await client.post(url, headers=headers, json=json_data)

            response.raise_for_status()
            return response.json()
        except httpx.HTTPStatusError as e:
            logger.error("Catalyst API HTTP error (%d): %s", e.response.status_code, e.response.text)
            return {"error": f"Catalyst API HTTP {e.response.status_code}", "detail": e.response.text}
        except Exception as e:
            logger.error("Failed to connect to Catalyst API: %s", str(e))
            return {"error": f"Connection to Catalyst API failed: {str(e)}"}
