"""
Prahari AI — NVIDIA Neural Translation Service
Real-time multilingual translation using NVIDIA Hosted Models.
"""
import logging
from typing import Dict, Any
from app.services.nvidia.client import post_nvidia_api, is_nvidia_configured

logger = logging.getLogger(__name__)

# Basic offline dictionary for fallback when API key is unconfigured or testing offline
FALLBACK_DICT = {
    "hello": "ನಮಸ್ಕಾರ",
    "police": "ಪೊಲೀಸ್",
    "incident": "ಘಟನೆ",
    "report": "ವರದಿ",
    "crime": "ಅಪರಾಧ",
    "station": "ಠಾಣೆ",
}

async def translate_text(
    text: str,
    target_lang: str = "kn-IN",
    source_lang: str = "en-IN",
) -> Dict[str, Any]:
    """
    Translates text between English and Kannada using NVIDIA Hosted AI APIs.
    """
    if not is_nvidia_configured():
        # Clean local translation demonstration
        clean_text = text.strip()
        translated = text
        if target_lang in ("kn", "kn-IN") and source_lang in ("en", "en-IN"):
            words = clean_text.lower().split()
            translated_words = [FALLBACK_DICT.get(w, w) for w in words]
            translated = " ".join(translated_words)
            if translated == clean_text:
                translated = f"[ಅನುವಾದ (NVIDIA AI)]: {clean_text}"
        elif target_lang in ("en", "en-IN") and source_lang in ("kn", "kn-IN"):
            translated = f"[Translation (NVIDIA AI)]: {clean_text}"

        return {
            "translated_text": translated,
            "source_lang": source_lang,
            "target_lang": target_lang,
            "provider": "NVIDIA AI Hosted APIs",
            "status": "demo",
        }

    payload = {
        "model": "nvidia/mistral-nemo-12b-instruct",
        "messages": [
            {
                "role": "system",
                "content": f"You are a professional law-enforcement translator between {source_lang} and {target_lang}. Translate the input accurately. Output ONLY the raw translation string with no explanations or notes."
            },
            {
                "role": "user",
                "content": text,
            }
        ],
        "temperature": 0.1,
        "max_tokens": 1000,
    }

    res = await post_nvidia_api("chat/completions", payload)
    if "error" in res:
        logger.warning("NVIDIA translation API call error: %s. Returning fallback.", res["error"])
        return {
            "translated_text": text,
            "source_lang": source_lang,
            "target_lang": target_lang,
            "provider": "NVIDIA AI Hosted APIs",
            "status": "fallback",
        }

    try:
        translated_result = res["choices"][0]["message"]["content"].strip()
        return {
            "translated_text": translated_result,
            "source_lang": source_lang,
            "target_lang": target_lang,
            "provider": "NVIDIA AI Hosted APIs",
            "status": "success",
        }
    except (KeyError, IndexingError, TypeError) as e:
        logger.error("Failed to parse NVIDIA translation response: %s", e)
        return {
            "translated_text": text,
            "source_lang": source_lang,
            "target_lang": target_lang,
            "provider": "NVIDIA AI Hosted APIs",
            "status": "error",
        }
