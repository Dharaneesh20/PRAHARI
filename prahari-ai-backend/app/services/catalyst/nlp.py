"""
Prahari AI — Zoho Catalyst QuickML / Zia NLP Microservices
Provides pre-trained NLP models for Audio-to-Text (STT), Text-to-Audio (TTS), and Text Translation.
"""
import logging
from typing import Dict, Any
from app.services.catalyst.client import post_catalyst_api
from app.services.catalyst.auth import is_catalyst_configured

logger = logging.getLogger(__name__)


async def transcribe_audio_catalyst(
    audio_bytes: bytes,
    filename: str = "audio.wav",
    content_type: str = "audio/wav",
    language: str = "kn-IN",
) -> Dict[str, Any]:
    """
    Transcribes audio speech recording using Zoho Catalyst QuickML Audio-to-Text model.
    """
    if not is_catalyst_configured():
        logger.info("Catalyst credentials unconfigured. Returning mock QuickML STT extract.")
        return {
            "status": "unconfigured",
            "message": "Zoho Catalyst QuickML credentials not set.",
            "text": "Commercial Street police station incident report audio log transcribed successfully.",
            "language": language,
            "provider": "Powered by Zoho Catalyst QuickML",
        }

    files = {"audio": (filename, audio_bytes, content_type)}
    data = {"language": language, "model_type": "AUDIO_TO_TEXT"}

    res = await post_catalyst_api("ml/stt", files=files, data=data)
    if "error" in res or res.get("status") == "unconfigured":
        return res

    return {
        "status": "success",
        "text": res.get("data", {}).get("text", "") or res.get("text", ""),
        "provider": "Powered by Zoho Catalyst QuickML",
    }


async def synthesize_speech_catalyst(
    text: str,
    language: str = "kn-IN",
) -> Dict[str, Any]:
    """
    Synthesizes spoken audio from input text using Zoho Catalyst QuickML Text-to-Audio model.
    """
    if not is_catalyst_configured():
        logger.info("Catalyst credentials unconfigured. Returning mock QuickML TTS response.")
        return {
            "status": "unconfigured",
            "message": "Zoho Catalyst QuickML credentials not set.",
            "text": text,
            "provider": "Powered by Zoho Catalyst QuickML",
        }

    payload = {"text": text, "language": language, "model_type": "TEXT_TO_AUDIO"}
    res = await post_catalyst_api("ml/tts", json=payload)
    return res


async def translate_text_catalyst(
    text: str,
    source_lang: str = "en-IN",
    target_lang: str = "kn-IN",
) -> Dict[str, Any]:
    """
    Translates text using Zoho Catalyst QuickML Text Translation model.
    """
    if not is_catalyst_configured():
        logger.info("Catalyst credentials unconfigured. Returning mock QuickML Translation response.")
        return {
            "status": "unconfigured",
            "message": "Zoho Catalyst QuickML credentials not set.",
            "source_text": text,
            "translated_text": f"[Zoho Catalyst QuickML Translation] {text}",
            "source_lang": source_lang,
            "target_lang": target_lang,
            "provider": "Powered by Zoho Catalyst QuickML",
        }

    payload = {
        "text": text,
        "source_language": source_lang,
        "target_language": target_lang,
        "model_type": "TEXT_TRANSLATION",
    }
    res = await post_catalyst_api("ml/translate", json=payload)
    return res
