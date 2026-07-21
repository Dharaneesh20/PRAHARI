"""
Prahari AI — Zoho Catalyst OAuth Token Manager
Handles automatic access token generation and refresh using OAuth Refresh Token.
"""
import logging
import os
import time
import httpx
from typing import Optional
from app.config import settings

logger = logging.getLogger(__name__)

# Global in-memory token cache
_cached_access_token: Optional[str] = None
_token_expiry_timestamp: float = 0.0

DC_ACCOUNTS_MAP = {
    "IN": "https://accounts.zoho.in",
    "US": "https://accounts.zoho.com",
    "EU": "https://accounts.zoho.eu",
    "AU": "https://accounts.zoho.com.au",
    "CN": "https://accounts.zoho.com.cn",
}

def get_accounts_url() -> str:
    dc = (settings.CATALYST_DC or os.getenv("CATALYST_DC", "IN")).upper()
    return DC_ACCOUNTS_MAP.get(dc, "https://accounts.zoho.in")

def is_catalyst_configured() -> bool:
    project_id = settings.CATALYST_PROJECT_ID or os.getenv("CATALYST_PROJECT_ID", "")
    client_id = settings.CATALYST_CLIENT_ID or os.getenv("CATALYST_CLIENT_ID", "")
    client_secret = settings.CATALYST_CLIENT_SECRET or os.getenv("CATALYST_CLIENT_SECRET", "")
    refresh_token = settings.CATALYST_REFRESH_TOKEN or os.getenv("CATALYST_REFRESH_TOKEN", "")
    return bool(project_id and client_id and client_secret and refresh_token)

async def get_catalyst_access_token() -> Optional[str]:
    """
    Returns an active Zoho Catalyst access token. Automatically refreshes
    the token if missing or expired.
    """
    global _cached_access_token, _token_expiry_timestamp

    # Check if current cached token is still valid (with 60-second buffer)
    current_time = time.time()
    if _cached_access_token and current_time < (_token_expiry_timestamp - 60):
        return _cached_access_token

    if not is_catalyst_configured():
        logger.warning("Zoho Catalyst OAuth credentials not configured.")
        return None

    accounts_url = get_accounts_url()
    token_url = f"{accounts_url}/oauth/v2/token"

    client_id = settings.CATALYST_CLIENT_ID or os.getenv("CATALYST_CLIENT_ID", "")
    client_secret = settings.CATALYST_CLIENT_SECRET or os.getenv("CATALYST_CLIENT_SECRET", "")
    refresh_token = settings.CATALYST_REFRESH_TOKEN or os.getenv("CATALYST_REFRESH_TOKEN", "")

    params = {
        "refresh_token": refresh_token,
        "client_id": client_id,
        "client_secret": client_secret,
        "grant_type": "refresh_token",
    }

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.post(token_url, params=params)
            response.raise_for_status()
            data = response.json()

            if "access_token" in data:
                _cached_access_token = data["access_token"]
                expires_in = data.get("expires_in", 3600)
                _token_expiry_timestamp = current_time + expires_in
                logger.info("Successfully refreshed Zoho Catalyst OAuth Access Token (valid for %d seconds).", expires_in)
                return _cached_access_token
            else:
                logger.error("Zoho Catalyst OAuth refresh failed: %s", data)
                return None
    except Exception as e:
        logger.error("Failed to execute Zoho Catalyst OAuth token refresh: %s", e)
        return None
