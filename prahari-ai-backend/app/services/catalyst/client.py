"""
Prahari AI — Zoho Catalyst API Client
Base HTTP client for executing authenticated requests against Zoho Catalyst Microservices APIs.
Features:
- Auto-token insertion from Zoho OAuth Manager
- Automatic single retry on HTTP 401 Unauthorized
- Structured error handling for 401, 403, 404, 429, 500, and timeouts
"""
import logging
import os
import httpx
from typing import Dict, Any, Optional
from app.config import settings
from app.services.catalyst.auth import (
    get_zoho_access_token,
    get_zoho_credentials,
    invalidate_token,
)

logger = logging.getLogger("zoho.client")

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
    _, _, _, org_id = get_zoho_credentials()
    return org_id or settings.CATALYST_PROJECT_ID or os.getenv("CATALYST_PROJECT_ID", "")


async def post_catalyst_api(
    endpoint: str,
    json_data: Optional[Dict[str, Any]] = None,
    files: Optional[Dict[str, Any]] = None,
    data: Optional[Dict[str, Any]] = None,
    timeout: float = 30.0,
    retry_on_401: bool = True,
) -> Dict[str, Any]:
    """
    Sends an authenticated POST request to a Zoho Catalyst microservice endpoint.
    Automatically retries once on HTTP 401 Unauthorized.
    """
    token = await get_zoho_access_token()
    if not token:
        return {
            "status": "error",
            "error_code": 401,
            "message": "Zoho Catalyst credentials unconfigured or token refresh failed.",
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

            # Check for HTTP 401 retry
            if response.status_code == 401 and retry_on_401:
                logger.warning("Zoho API returned HTTP 401 Unauthorized. Retrying with a fresh OAuth token...")
                invalidate_token()
                fresh_token = await get_zoho_access_token(force_refresh=True)
                if fresh_token:
                    headers["Authorization"] = f"Zoho-oauthtoken {fresh_token}"
                    if files:
                        response = await client.post(url, headers=headers, data=data, files=files)
                    else:
                        response = await client.post(url, headers=headers, json=json_data)

            response.raise_for_status()
            return response.json()

        except httpx.HTTPStatusError as e:
            code = e.response.status_code
            logger.error("Zoho Catalyst API HTTP error (%d): %s", code, e.response.text[:200])
            return {
                "status": "error",
                "error_code": code,
                "message": f"Zoho Catalyst API HTTP {code}",
                "detail": e.response.text,
            }
        except httpx.TimeoutException:
            logger.error("Timeout connecting to Zoho Catalyst API (%s)", endpoint)
            return {
                "status": "error",
                "error_code": 504,
                "message": "Zoho Catalyst API request timed out.",
            }
        except Exception as e:
            logger.error("Failed to connect to Zoho Catalyst API: %s", str(e))
            return {
                "status": "error",
                "error_code": 500,
                "message": f"Connection to Zoho Catalyst API failed: {str(e)}",
            }


async def post_quickml_api(
    endpoint: str,
    json_data: Optional[Dict[str, Any]] = None,
    files: Optional[Dict[str, Any]] = None,
    data: Optional[Dict[str, Any]] = None,
    timeout: float = 45.0,
    retry_on_401: bool = True,
) -> Dict[str, Any]:
    """
    Sends an authenticated POST request to a Zoho Catalyst QuickML API endpoint.
    URL pattern: https://api.catalyst.zoho.in/quickml/api/v1/models/zia/audio/transcribe
    Headers:
      Authorization: Zoho-oauthtoken <token>
      CATALYST-ORG: <org_id>
    """
    token = await get_zoho_access_token()
    if not token:
        return {
            "status": "error",
            "error_code": 401,
            "message": "Zoho Catalyst credentials unconfigured or token refresh failed.",
        }

    org_id = get_project_id()
    base_url = get_catalyst_base_url()
    
    if endpoint.startswith("http"):
        url = endpoint
    else:
        url = f"{base_url}/{endpoint.lstrip('/')}"

    headers = {
        "Authorization": f"Zoho-oauthtoken {token}",
        "CATALYST-ORG": str(org_id),
    }

    async with httpx.AsyncClient(timeout=timeout) as client:
        try:
            if files:
                response = await client.post(url, headers=headers, data=data, files=files)
            else:
                headers["Content-Type"] = "application/json"
                response = await client.post(url, headers=headers, json=json_data)

            # Check for HTTP 401 retry
            if response.status_code == 401 and retry_on_401:
                logger.warning("Zoho QuickML API returned HTTP 401 Unauthorized. Retrying with a fresh OAuth token...")
                invalidate_token()
                fresh_token = await get_zoho_access_token(force_refresh=True)
                if fresh_token:
                    headers["Authorization"] = f"Zoho-oauthtoken {fresh_token}"
                    if files:
                        response = await client.post(url, headers=headers, data=data, files=files)
                    else:
                        response = await client.post(url, headers=headers, json=json_data)

            response.raise_for_status()
            return response.json()

        except httpx.HTTPStatusError as e:
            code = e.response.status_code
            logger.error("Zoho QuickML API HTTP error (%d): %s", code, e.response.text[:200])
            return {
                "status": "error",
                "error_code": code,
                "message": f"Zoho QuickML API HTTP {code}",
                "detail": e.response.text,
            }
        except httpx.TimeoutException:
            logger.error("Timeout connecting to Zoho QuickML API (%s)", endpoint)
            return {
                "status": "error",
                "error_code": 504,
                "message": "Zoho QuickML API request timed out.",
            }
        except Exception as e:
            logger.error("Failed to connect to Zoho QuickML API: %s", str(e))
            return {
                "status": "error",
                "error_code": 500,
                "message": f"Connection to Zoho QuickML API failed: {str(e)}",
            }


async def post_quickml_api_binary(
    endpoint: str,
    json_data: Optional[Dict[str, Any]] = None,
    timeout: float = 45.0,
    retry_on_401: bool = True,
) -> tuple[Optional[bytes], Optional[Dict[str, Any]]]:
    """
    Sends an authenticated request to a Zoho Catalyst QuickML endpoint and returns binary bytes (e.g. audio/wav for TTS).
    URL pattern: https://api.catalyst.zoho.in/quickml/api/v1/models/zia/tts/synthesize
    Headers:
      Authorization: Zoho-oauthtoken <token>
      CATALYST-ORG: <org_id>
    """
    token = await get_zoho_access_token()
    if not token:
        return None, {
            "status": "error",
            "error_code": 401,
            "message": "Zoho Catalyst credentials unconfigured or token refresh failed.",
        }

    org_id = get_project_id()
    base_url = get_catalyst_base_url()
    
    if endpoint.startswith("http"):
        url = endpoint
    else:
        url = f"{base_url}/{endpoint.lstrip('/')}"

    headers = {
        "Authorization": f"Zoho-oauthtoken {token}",
        "CATALYST-ORG": str(org_id),
        "Content-Type": "application/json",
    }

    async with httpx.AsyncClient(timeout=timeout) as client:
        try:
            response = await client.post(url, headers=headers, json=json_data)

            if response.status_code == 401 and retry_on_401:
                logger.warning("Zoho QuickML API returned HTTP 401. Retrying binary request with fresh token...")
                invalidate_token()
                fresh_token = await get_zoho_access_token(force_refresh=True)
                if fresh_token:
                    headers["Authorization"] = f"Zoho-oauthtoken {fresh_token}"
                    response = await client.post(url, headers=headers, json=json_data)

            response.raise_for_status()
            return response.content, None

        except httpx.HTTPStatusError as e:
            logger.error("Zoho QuickML TTS HTTP error (%d): %s", e.response.status_code, e.response.text[:200])
            return None, {
                "status": "error",
                "error_code": e.response.status_code,
                "message": f"Zoho QuickML TTS API HTTP {e.response.status_code}",
                "detail": e.response.text,
            }
        except Exception as e:
            logger.error("Failed to fetch audio from Zoho QuickML TTS: %s", str(e))
            return None, {
                "status": "error",
                "error_code": 500,
                "message": f"Zoho QuickML TTS connection failed: {str(e)}",
            }


async def post_catalyst_api_binary(
    endpoint: str,
    json_data: Optional[Dict[str, Any]] = None,
    timeout: float = 30.0,
    retry_on_401: bool = True,
) -> tuple[Optional[bytes], Optional[Dict[str, Any]]]:
    """
    Sends a request and returns raw binary bytes (e.g. for Audio/TTS streaming).
    Returns (audio_bytes, error_dict).
    """
    token = await get_zoho_access_token()
    if not token:
        return None, {
            "status": "error",
            "error_code": 401,
            "message": "Zoho Catalyst credentials unconfigured or token refresh failed.",
        }

    project_id = get_project_id()
    base_url = get_catalyst_base_url()
    url = f"{base_url}/baas/v1/project/{project_id}/{endpoint.lstrip('/')}"

    headers = {
        "Authorization": f"Zoho-oauthtoken {token}",
        "Content-Type": "application/json",
    }

    async with httpx.AsyncClient(timeout=timeout) as client:
        try:
            response = await client.post(url, headers=headers, json=json_data)

            if response.status_code == 401 and retry_on_401:
                logger.warning("Zoho API returned HTTP 401. Retrying binary request with fresh token...")
                invalidate_token()
                fresh_token = await get_zoho_access_token(force_refresh=True)
                if fresh_token:
                    headers["Authorization"] = f"Zoho-oauthtoken {fresh_token}"
                    response = await client.post(url, headers=headers, json=json_data)

            response.raise_for_status()
            return response.content, None

        except httpx.HTTPStatusError as e:
            logger.error("Zoho Catalyst TTS HTTP error (%d): %s", e.response.status_code, e.response.text[:200])
            return None, {
                "status": "error",
                "error_code": e.response.status_code,
                "message": f"Zoho Catalyst TTS API HTTP {e.response.status_code}",
            }
        except Exception as e:
            logger.error("Failed to fetch audio from Zoho Catalyst TTS: %s", str(e))
            return None, {
                "status": "error",
                "error_code": 500,
                "message": f"Zoho Catalyst TTS connection failed: {str(e)}",
            }
