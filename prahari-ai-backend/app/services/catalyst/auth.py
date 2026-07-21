"""
Prahari AI — Zoho Catalyst OAuth Token Manager
Manages automated access token generation and refresh using OAuth Refresh Token.
Features:
- Memory caching of access token & expiry time
- Refresh lock (asyncio.Lock) to prevent concurrent refresh requests
- Automatic refresh approximately 2 minutes before expiration
- Strict isolation: Secrets & tokens are NEVER logged or exposed to the frontend
"""
import asyncio
import logging
import os
import time
import httpx
from typing import Optional
from app.config import settings

logger = logging.getLogger("zoho.oauth")

# In-memory token cache & lock
_cached_access_token: Optional[str] = None
_token_expiry_timestamp: float = 0.0
_token_refresh_lock = asyncio.Lock()

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


def get_zoho_credentials() -> tuple[str, str, str, str]:
    """Retrieves Zoho OAuth credentials from environment variables."""
    client_id = settings.ZOHO_CLIENT_ID or os.getenv("ZOHO_CLIENT_ID") or settings.CATALYST_CLIENT_ID or os.getenv("CATALYST_CLIENT_ID", "")
    client_secret = settings.ZOHO_CLIENT_SECRET or os.getenv("ZOHO_CLIENT_SECRET") or settings.CATALYST_CLIENT_SECRET or os.getenv("CATALYST_CLIENT_SECRET", "")
    refresh_token = settings.ZOHO_REFRESH_TOKEN or os.getenv("ZOHO_REFRESH_TOKEN") or settings.CATALYST_REFRESH_TOKEN or os.getenv("CATALYST_REFRESH_TOKEN", "")
    org_id = settings.ZOHO_ORG_ID or os.getenv("ZOHO_ORG_ID") or settings.CATALYST_PROJECT_ID or os.getenv("CATALYST_PROJECT_ID", "")
    return client_id, client_secret, refresh_token, org_id


def is_catalyst_configured() -> bool:
    client_id, client_secret, refresh_token, org_id = get_zoho_credentials()
    return bool(client_id and client_secret and refresh_token and org_id)


def invalidate_token():
    """Invalidates the currently cached token to force an immediate refresh on next request."""
    global _cached_access_token, _token_expiry_timestamp
    _cached_access_token = None
    _token_expiry_timestamp = 0.0


async def get_zoho_access_token(force_refresh: bool = False) -> Optional[str]:
    """
    Returns an active Zoho access token.
    Uses asyncio.Lock so multiple simultaneous requests wait for a single refresh.
    Refreshes token approximately 2 minutes (120s) before expiration.
    """
    global _cached_access_token, _token_expiry_timestamp

    current_time = time.time()
    # Check if cached token is still valid (with 2-minute / 120s buffer)
    if not force_refresh and _cached_access_token and current_time < (_token_expiry_timestamp - 120):
        return _cached_access_token

    # Acquire lock so only one refresh request runs at a time
    async with _token_refresh_lock:
        current_time = time.time()
        # Double-check inside lock in case another coroutine refreshed it while waiting
        if not force_refresh and _cached_access_token and current_time < (_token_expiry_timestamp - 120):
            return _cached_access_token

        client_id, client_secret, refresh_token, _ = get_zoho_credentials()
        if not (client_id and client_secret and refresh_token):
            logger.error("OAuth Refresh Failed: Missing ZOHO_CLIENT_ID, ZOHO_CLIENT_SECRET, or ZOHO_REFRESH_TOKEN.")
            return None

        logger.info("Refreshing OAuth Token...")
        accounts_url = get_accounts_url()
        token_url = f"{accounts_url}/oauth/v2/token"

        params = {
            "refresh_token": refresh_token,
            "client_id": client_id,
            "client_secret": client_secret,
            "grant_type": "refresh_token",
        }

        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                response = await client.post(token_url, data=params)
                response.raise_for_status()
                data = response.json()

                if "access_token" in data:
                    _cached_access_token = data["access_token"]
                    expires_in = int(data.get("expires_in", 3600))
                    _token_expiry_timestamp = current_time + expires_in
                    logger.info("OAuth Refresh Success (Token valid for %d seconds)", expires_in)
                    return _cached_access_token
                else:
                    logger.error("OAuth Refresh Failed: Response did not contain access_token.")
                    return None
        except Exception as e:
            logger.error("OAuth Refresh Failed: %s", str(e))
            return None


# Alias for backward compatibility
get_catalyst_access_token = get_zoho_access_token
