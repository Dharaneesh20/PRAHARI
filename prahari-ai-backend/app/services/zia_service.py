"""
Prahari AI — Zoho Catalyst Zia Services Manager
=================================================
Provides Speech-to-Text (STT), Text-to-Speech (TTS), Neural Machine Translation,
and OCR (Optical Character Recognition) powered by Zoho Catalyst Zia Services API.
"""

import os
import io
import logging
import httpx
from typing import Optional, Dict, Any

logger = logging.getLogger(__name__)

# ── Catalyst Configuration ────────────────────────────────────────────────────
CATALYST_PROJECT_ID = os.getenv("CATALYST_PROJECT_ID", "")
CATALYST_ZIA_TOKEN  = os.getenv("CATALYST_ZIA_TOKEN", "")
ZIA_BASE_URL        = os.getenv("ZIA_BASE_URL", "https://api.catalyst.zoho.com/baas/v1/project")


def _catalyst_configured() -> bool:
    return bool(CATALYST_PROJECT_ID and CATALYST_ZIA_TOKEN)


def _auth_headers() -> Dict[str, str]:
    return {"Authorization": f"Zoho-oauthtoken {CATALYST_ZIA_TOKEN}"}


# ── Speech-to-Text ────────────────────────────────────────────────────────────

async def transcribe_audio(
    audio_bytes: bytes,
    content_type: str = "audio/wav",
    language: str = "kn-IN",
) -> Dict[str, Any]:
    """
    Transcribes audio payload to text using Zoho Catalyst Zia Speech-to-Text.
    Supports Kannada (kn-IN) and English (en-IN).
    """
    if _catalyst_configured():
        try:
            url = f"{ZIA_BASE_URL}/{CATALYST_PROJECT_ID}/zia/v1/speech-to-text"
            headers = {**_auth_headers(), "Content-Type": content_type}
            params = {"language": language}
            async with httpx.AsyncClient(timeout=15.0) as client:
                resp = await client.post(url, headers=headers, params=params, content=audio_bytes)
                if resp.status_code == 200:
                    data = resp.json()
                    return {
                        "status":            "success",
                        "text":              data.get("text", data.get("result", "")),
                        "detected_language": language,
                        "confidence":        data.get("confidence", 0.95),
                        "provider":          "Zoho Catalyst Zia Speech",
                    }
        except Exception as e:
            logger.warning("Zia STT failed: %s", e)

    return {
        "status":   "error",
        "text":     "",
        "message":  "Speech-to-Text unavailable at the moment. Kindly use text input.",
        "provider": "Zoho Catalyst Zia Speech",
    }


# ── Text-to-Speech ────────────────────────────────────────────────────────────

async def synthesize_speech(text: str, language: str = "kn-IN") -> bytes:
    """
    Converts text to speech audio using Zoho Catalyst Zia Text-to-Speech.
    Returns audio bytes or empty bytes (frontend falls back to Web Speech API).
    """
    if _catalyst_configured():
        try:
            url = f"{ZIA_BASE_URL}/{CATALYST_PROJECT_ID}/zia/v1/text-to-speech"
            headers = {**_auth_headers(), "Content-Type": "application/json"}
            payload = {
                "text":     text[:500],
                "language": language,
                "voice":    "female" if language == "kn-IN" else "male",
            }
            async with httpx.AsyncClient(timeout=15.0) as client:
                resp = await client.post(url, headers=headers, json=payload)
                if resp.status_code == 200:
                    return resp.content
        except Exception as e:
            logger.warning("Zia TTS failed: %s", e)

    return b""


# ── Translation ───────────────────────────────────────────────────────────────

async def translate_text(
    text: str,
    target_lang: str = "kn-IN",
    source_lang: str = "en-IN",
) -> Dict[str, Any]:
    """
    Translates text between English and Kannada using Zoho Catalyst Zia Translation API.
    """
    if not text.strip():
        return {"translated_text": "", "source_lang": source_lang, "target_lang": target_lang}

    if _catalyst_configured():
        try:
            url = f"{ZIA_BASE_URL}/{CATALYST_PROJECT_ID}/zia/v1/translation"
            headers = {**_auth_headers(), "Content-Type": "application/json"}
            payload = {
                "text":            text,
                "source_language": source_lang,
                "target_language": target_lang,
            }
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.post(url, headers=headers, json=payload)
                if resp.status_code == 200:
                    data = resp.json()
                    return {
                        "translated_text": data.get("translated_text", text),
                        "source_lang":     source_lang,
                        "target_lang":     target_lang,
                        "provider":        "Zoho Catalyst Zia Translation",
                    }
        except Exception as e:
            logger.warning("Zia Translation failed: %s", e)

    return {
        "translated_text": text,
        "source_lang":     source_lang,
        "target_lang":     target_lang,
        "provider":        "Zoho Catalyst Zia Translation",
    }


# ── OCR — Zoho Catalyst Zia ML OCR API ────────────────────────────────────────

async def extract_text_from_image(
    image_bytes: bytes,
    filename: str = "image.png",
    content_type: str = "image/png",
    language: str = "eng",
) -> Dict[str, Any]:
    """
    Extracts text from an image using Zoho Catalyst Zia ML OCR API.

    Endpoint: POST /baas/v1/project/{PROJECT_ID}/ml/ocr
    Auth:     Zoho-oauthtoken header
    Body:     multipart/form-data  (image=<file>, language=<lang_code>)

    Returns a dict with:
        status:    "success" | "error" | "unconfigured"
        text:      extracted text string (may be empty)
        provider:  "Zoho Catalyst Zia OCR" | "Zoho Catalyst Zia OCR (Unconfigured)"
        confidence: float (0-1) if returned by API
    """
    # ── Route 1: Zoho Catalyst OCR ────────────────────────────────────────────
    if _catalyst_configured():
        try:
            url = f"{ZIA_BASE_URL}/{CATALYST_PROJECT_ID}/ml/ocr"

            # Catalyst OCR expects multipart/form-data
            files = {
                "image": (filename, image_bytes, content_type),
            }
            data = {"language": language}

            async with httpx.AsyncClient(timeout=30.0) as client:
                resp = await client.post(
                    url,
                    headers=_auth_headers(),
                    files=files,
                    data=data,
                )

            if resp.status_code == 200:
                result = resp.json()

                # Catalyst response structure:
                # { "status": {"code": 200, "message": "success"},
                #   "data": { "extracted_text": "...", "confidence": 0.95 } }
                data_block = result.get("data", result)
                extracted = (
                    data_block.get("extracted_text")
                    or data_block.get("text")
                    or data_block.get("result")
                    or ""
                )
                confidence = float(data_block.get("confidence", 0.95))

                logger.info(
                    "Catalyst Zia OCR succeeded: %d chars extracted",
                    len(extracted),
                )
                return {
                    "status":     "success",
                    "text":       extracted,
                    "confidence": confidence,
                    "provider":   "Zoho Catalyst Zia OCR",
                }
            else:
                logger.warning(
                    "Catalyst OCR HTTP %s: %s",
                    resp.status_code, resp.text[:200],
                )
        except Exception as e:
            logger.error("Catalyst Zia OCR request failed: %s", e)

    # ── Route 2: Not configured ────────────────────────────────────────────────
    return {
        "status":   "unconfigured",
        "text":     "",
        "provider": "Zoho Catalyst Zia OCR",
        "message":  (
            "Zoho Catalyst credentials are not configured. "
            "Set CATALYST_PROJECT_ID and CATALYST_ZIA_TOKEN in the backend .env file "
            "to enable OCR."
        ),
    }
