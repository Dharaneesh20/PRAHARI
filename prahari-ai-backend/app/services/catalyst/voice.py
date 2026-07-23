"""
Prahari AI — Zoho Catalyst QuickML (Zia NLP) Voice Service
Provides production-grade Text-to-Speech (TTS) and Speech-to-Text (STT) services.
No fallbacks, no dummy transcripts, no mock text.
"""
import logging
import time
from typing import Dict, Any, Optional, Tuple
from app.services.catalyst.client import post_catalyst_api, post_quickml_api, post_quickml_api_binary
from app.services.catalyst.auth import is_catalyst_configured

logger = logging.getLogger("zoho.voice")

# Predefined Zia Supported Voice Options
ZIA_VOICE_CONFIG = {
    "supported_languages": [
        {"code": "en-IN", "name": "English (India)"},
        {"code": "kn-IN", "name": "Kannada (India)"},
    ],
    "voices": {
        "en-IN": [
            {"id": "Mary", "name": "Zia Female (Mary - English)", "gender": "female"},
            {"id": "Thomas", "name": "Zia Male (Thomas - English)", "gender": "male"},
        ],
        "kn-IN": [
            {"id": "Anu", "name": "Zia Female (Anu - Kannada)", "gender": "female"},
            {"id": "Suresh", "name": "Zia Male (Suresh - Kannada)", "gender": "male"},
        ],
    },
    "options": {
        "pitch": ["low", "moderate", "high"],
        "speed": ["slow", "moderate", "fast"],
        "emotion": ["neutral", "happy", "sad", "angry"],
    },
}


import re

def clean_text_for_tts(text: str) -> str:
    """
    Cleans markdown formatting, HTML tags, newlines, smart quotes, parentheses,
    and non-speech characters from text before passing to Zoho QuickML Zia TTS API.
    """
    if not text:
        return ""
    
    # 1. Normalize smart quotes and unicode apostrophes
    text = text.replace("’", "'").replace("‘", "'").replace("“", '"').replace("”", '"')

    # 2. Remove code blocks & inline code
    text = re.sub(r'```[\s\S]*?```', '', text)
    text = re.sub(r'`[^`]*`', '', text)

    # 3. Remove markdown headers (#, ##, etc)
    text = re.sub(r'^#{1,6}\s+', '', text, flags=re.MULTILINE)

    # 4. Remove bold/italics markers (*, _)
    text = re.sub(r'[*_]{1,3}(.*?)[*_]{1,3}', r'\1', text)

    # 5. Remove links [text](url) -> text
    text = re.sub(r'\[([^\]]+)\]\([^)]+\)', r'\1', text)

    # 6. Remove HTML tags
    text = re.sub(r'<[^>]+>', '', text)

    # 7. Remove list markers (*, -, +, 1.)
    text = re.sub(r'^\s*[-*+]\s+', '', text, flags=re.MULTILINE)
    text = re.sub(r'^\s*\d+\.\s+', '', text, flags=re.MULTILINE)

    # 8. Remove non-speech punctuation: (), [], {}, #, *, _, ~, |, <>, \, /, :, ;, -, —
    text = re.sub(r'[()\[\]{}#\*\_~`|<>\\\/:\;\-\—]', ' ', text)

    # 9. Normalize multiple newlines and spaces
    text = re.sub(r'\s+', ' ', text).strip()

    # 10. Limit text length to max 300 characters for fast speech synthesis (<4s response time)
    if len(text) > 300:
        sentences = re.split(r'(?<=[.!?])\s+', text)
        shortened = ""
        for s in sentences:
            if len(shortened) + len(s) + 1 <= 300:
                shortened += (" " if shortened else "") + s
            else:
                break
        text = shortened or text[:300].rsplit(' ', 1)[0] + "."

    return text


async def synthesize_speech_zia(
    text: str,
    language: str = "kn-IN",
    voice: Optional[str] = None,
    pitch: Optional[str] = "moderate",
    speed: Optional[str] = "moderate",
    emotion: Optional[str] = "neutral",
) -> Tuple[Optional[bytes], Dict[str, Any]]:
    """
    Synthesizes spoken audio from input text using Zoho Catalyst QuickML Zia Text-to-Speech endpoint:
    https://api.catalyst.zoho.in/quickml/api/v1/models/zia/tts/synthesize
    Headers:
      CATALYST-ORG: <org_id>
      Authorization: Zoho-oauthtoken <token>
    JSON Body:
      { text, language: "kn"/"en", speaker: "Anu"/"Mary", pitch: "moderate", speed: "moderate", emotion: "neutral" }
    """
    start_time = time.time()

    if not is_catalyst_configured():
        return None, {
            "status": "error",
            "error_code": 401,
            "message": "Zoho Catalyst QuickML credentials are not configured in environment.",
        }

    lang_code = language.split("-")[0].lower() if language else "kn"
    if lang_code not in ("en", "hi", "kn"):
        lang_code = "kn"

    speaker = voice or ("Suresh" if lang_code == "kn" else ("Divya" if lang_code == "hi" else "Mary"))

    clean_text = clean_text_for_tts(text)
    if not clean_text:
        return None, {
            "status": "error",
            "error_code": 400,
            "message": "Input text is empty after cleaning markdown formatting.",
        }

    logger.info("Calling Zia QuickML Text-to-Speech API (language: %s, speaker: %s, text_length: %d)", lang_code, speaker, len(clean_text))

    payload = {
        "text": clean_text,
        "language": lang_code,
        "speaker": speaker,
        "pitch": pitch if pitch in ("low", "moderate", "high") else "moderate",
        "speed": speed if speed in ("slow", "moderate", "fast") else "moderate",
        "emotion": emotion if emotion in ("neutral", "happy", "sad", "angry") else "neutral",
    }

    # Call QuickML TTS endpoint
    audio_bytes, error_res = await post_quickml_api_binary("quickml/api/v1/models/zia/tts/synthesize", json_data=payload)
    elapsed_ms = int((time.time() - start_time) * 1000)

    if error_res or not audio_bytes:
        err_msg = error_res.get("message") if error_res else "No audio binary returned."
        logger.error("Calling Zia TTS Failed: %s", err_msg)
        return None, error_res or {"status": "error", "error_code": 500, "message": f"Zia TTS synthesis failed: {err_msg}"}

    logger.info("Zia TTS Audio Generated (%d bytes, Response Time: %d ms)", len(audio_bytes), elapsed_ms)
    return audio_bytes, {
        "status": "success",
        "response_time_ms": elapsed_ms,
        "bytes": len(audio_bytes),
        "provider": "Powered by Zoho Catalyst QuickML (Zia NLP)",
    }


async def transcribe_audio_zia(
    audio_bytes: bytes,
    filename: str = "speech.wav",
    content_type: str = "audio/wav",
    language: str = "kn-IN",
) -> Dict[str, Any]:
    """
    Transcribes audio speech recording using Zoho Catalyst QuickML Zia Speech-to-Text endpoint:
    https://api.catalyst.zoho.in/quickml/api/v1/models/zia/audio/transcribe
    Headers:
      CATALYST-ORG: <org_id>
      Authorization: Zoho-oauthtoken <token>
    Parameters (multipart/form-data):
      file: <binary audio file data>
      language: "hi" / "kn" / "en"
    """
    start_time = time.time()

    if not is_catalyst_configured():
        return {
            "status": "error",
            "error_code": 401,
            "message": "Zoho Catalyst QuickML credentials are not configured in environment.",
        }

    lang_code = language.split("-")[0].lower() if language else "kn"
    if lang_code not in ("en", "hi", "kn"):
        lang_code = "kn"

    # Sanitize upload_filename and upload_content_type for multipart data
    upload_filename = filename if (filename and ("." in filename)) else "speech.wav"
    upload_content_type = content_type if (content_type and "/" in content_type and "octet" not in content_type) else "audio/wav"

    logger.info("Calling Zia QuickML Speech-to-Text API (language: %s, file: %s)", lang_code, upload_filename)
    files = {
        "file": (upload_filename, audio_bytes, upload_content_type),
    }
    data = {
        "language": lang_code,
    }

    quickml_endpoint = "quickml/api/v1/models/zia/audio/transcribe"
    res = await post_quickml_api(quickml_endpoint, files=files, data=data)
    elapsed_ms = int((time.time() - start_time) * 1000)

    if "error" in res or res.get("status") in ("error", "failure") or "text" not in res:
        err_msg = res.get("message", res.get("detail", res.get("code", "Zia STT transcription failed.")))
        logger.error("Calling Zia STT Failed: %s", err_msg)
        return {
            "status": "error",
            "error_code": res.get("error_code", 400),
            "message": f"Zia QuickML STT error: {err_msg}",
        }

    original_transcript = res.get("text", "").strip()
    processing_time = int(res.get("processing_time_ms", elapsed_ms))

    if not original_transcript:
        return {
            "status": "error",
            "error_code": 422,
            "message": "Zia STT could not transcribe clear audio from recording.",
        }

    # Workflow handling:
    # If input is Kannada ("kn"), translate to English for AI backend query processing
    final_text_en = original_transcript
    is_translated = False

    if lang_code == "kn":
        from app.services.catalyst.nlp import translate_text_catalyst
        tr_res = await translate_text_catalyst(original_transcript, source_lang="kn", target_lang="en")
        if tr_res.get("status") == "success" and tr_res.get("translated_text"):
            final_text_en = tr_res["translated_text"]
            is_translated = True
            logger.info("Zia Translation (Kannada -> English): %s -> %s", original_transcript, final_text_en)

    logger.info("Zia STT Transcription Success (Response Time: %d ms)", processing_time)
    return {
        "status": "success",
        "text": final_text_en,                       # English text sent to AI / NL2SQL
        "transcript": final_text_en,                 # English transcript
        "original_text": original_transcript,        # Original spoken transcript (Kannada or English)
        "language": language,
        "is_translated": is_translated,
        "provider": "Powered by Zoho Catalyst QuickML (Zia NLP)",
        "response_time_ms": processing_time,
    }


def get_zia_voice_options() -> Dict[str, Any]:
    """Exposes supported Zia voice and language configuration options."""
    return ZIA_VOICE_CONFIG
