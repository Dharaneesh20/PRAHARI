"""
Prahari AI — NVIDIA Text-to-Speech Service
Voice synthesis using NVIDIA Hosted Inference Endpoints.
"""
import logging
import httpx
from typing import Optional
from app.services.nvidia.client import get_nvidia_api_key, is_nvidia_configured, NVIDIA_BASE_URL

logger = logging.getLogger(__name__)

async def synthesize_speech(text: str, language: str = "kn-IN") -> Optional[bytes]:
    """
    Converts text to speech audio bytes using NVIDIA AI Hosted APIs.
    Returns audio binary bytes if available, or None for client Web Speech API fallback.
    """
    if not is_nvidia_configured():
        logger.info("NVIDIA API key unconfigured for TTS. Returning None for Web Speech API fallback.")
        return None

    try:
        url = f"{NVIDIA_BASE_URL}/audio/speech"
        headers = {
            "Authorization": f"Bearer {get_nvidia_api_key()}",
            "Content-Type": "application/json",
        }
        payload = {
            "model": "nvidia/fastpitch-hifi-gan",
            "input": text,
            "voice": "kn_IN_female" if language in ("kn", "kn-IN") else "en_US_female",
            "response_format": "mp3",
        }

        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(url, headers=headers, json=payload)
            if response.status_code == 200 and response.content:
                return response.content
            else:
                logger.warning("NVIDIA TTS API status %d: %s", response.status_code, response.text[:200])
                return None
    except Exception as e:
        logger.error("NVIDIA Text-to-Speech error: %s", e)
        return None
