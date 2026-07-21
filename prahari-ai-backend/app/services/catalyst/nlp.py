"""
Prahari AI — Zoho Catalyst QuickML / Zia NLP Microservices
Provides pre-trained NLP models for Audio-to-Text (STT), Text-to-Audio (TTS), and Text Translation.
"""
import logging
from typing import Dict, Any
from app.services.catalyst.client import post_catalyst_api, post_quickml_api
from app.services.catalyst.auth import is_catalyst_configured
from app.services.catalyst.voice import transcribe_audio_zia, synthesize_speech_zia

logger = logging.getLogger("zoho.nlp")


async def transcribe_audio_catalyst(
    audio_bytes: bytes,
    filename: str = "audio.wav",
    content_type: str = "audio/wav",
    language: str = "kn-IN",
) -> Dict[str, Any]:
    """
    Transcribes audio speech recording using Zoho Catalyst QuickML Audio-to-Text model.
    """
    return await transcribe_audio_zia(audio_bytes, filename=filename, content_type=content_type, language=language)


async def synthesize_speech_catalyst(
    text: str,
    language: str = "kn-IN",
) -> Dict[str, Any]:
    """
    Synthesizes spoken audio from input text using Zoho Catalyst QuickML Text-to-Audio model.
    """
    audio_bytes, res = await synthesize_speech_zia(text, language=language)
    if audio_bytes:
        return {"status": "success", "bytes": len(audio_bytes), "provider": "Powered by Zoho Catalyst QuickML"}
    return res


async def translate_text_catalyst(
    text: str,
    source_lang: str = "en-IN",
    target_lang: str = "kn-IN",
) -> Dict[str, Any]:
    """
    Translates text using Zoho Catalyst QuickML Zia Text Translation endpoint:
    https://api.catalyst.zoho.in/quickml/api/v1/models/zia/translate
    """
    if not is_catalyst_configured():
        return {
            "status": "error",
            "error_code": 401,
            "message": "Zoho Catalyst QuickML credentials are not configured.",
        }

    src = source_lang.split("-")[0].lower() if source_lang else "en"
    tgt = target_lang.split("-")[0].lower() if target_lang else "kn"

    payload = {
        "text": text,
        "src_lang": src,
        "tgt_lang": tgt,
    }
    endpoint = "quickml/api/v1/models/zia/translate"
    res = await post_quickml_api(endpoint, json_data=payload)

    if "translated_text" in res:
        return {
            "status": "success",
            "translated_text": res["translated_text"],
            "original_text": res.get("original_text", text),
            "src_lang": src,
            "tgt_lang": tgt,
            "provider": "Powered by Zoho Catalyst QuickML (Zia NLP)",
            "processing_time_ms": res.get("processing_time_ms", 0),
        }
    return res
