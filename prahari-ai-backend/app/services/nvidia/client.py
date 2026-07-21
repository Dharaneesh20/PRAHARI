"""
Prahari AI — NVIDIA AI Hosted API Client
Base HTTP client for interacting with NVIDIA's Hosted AI APIs.
"""
import logging
import os
import httpx
from typing import Dict, Any, Optional
from app.config import settings

logger = logging.getLogger(__name__)

NVIDIA_BASE_URL = "https://integrate.api.nvidia.com/v1"

def get_nvidia_api_key() -> str:
    return settings.NVIDIA_API_KEY or os.getenv("NVIDIA_API_KEY", "")

def is_nvidia_configured() -> bool:
    return bool(get_nvidia_api_key())

def get_nvidia_headers() -> Dict[str, str]:
    api_key = get_nvidia_api_key()
    return {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        "Accept": "application/json",
    }

async def post_nvidia_api(endpoint: str, payload: Dict[str, Any], timeout: float = 30.0) -> Dict[str, Any]:
    """
    Sends a POST request to an NVIDIA Hosted API endpoint.
    """
    if not is_nvidia_configured():
        logger.warning("NVIDIA_API_KEY is not configured.")
        return {"status": "unconfigured", "message": "NVIDIA API key not set in environment."}

    url = f"{NVIDIA_BASE_URL.rstrip('/')}/{endpoint.lstrip('/')}"
    headers = get_nvidia_headers()

    async with httpx.AsyncClient(timeout=timeout) as client:
        try:
            response = await client.post(url, json=payload, headers=headers)
            response.raise_for_status()
            return response.json()
        except httpx.HTTPStatusError as e:
            logger.error("NVIDIA API error (%d): %s", e.response.status_code, e.response.text)
            return {"error": f"NVIDIA API returned HTTP {e.response.status_code}", "detail": e.response.text}
        except Exception as e:
            logger.error("Failed to connect to NVIDIA API: %s", str(e))
            return {"error": f"Connection to NVIDIA API failed: {str(e)}"}
