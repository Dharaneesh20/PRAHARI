"""
voice_service.py — Voice input/output processing using Sarvam AI APIs
===================================================================
Bridges Speech-to-Text (Saaras v3), translation, and Text-to-Speech (Bulbul v3).
Provides graceful fallback mechanisms if API calls fail or time out.
"""
import os
import io
import json
import base64
import requests
from dotenv import load_dotenv

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
load_dotenv(os.path.join(BASE_DIR, ".env"))

SARVAM_API_KEY = os.environ.get("SARVAM_API_KEY")

def transcribe(audio_bytes: bytes, language_hint: str | None = "kn-IN") -> tuple[str, str]:
    """
    Transcribes raw audio bytes using Sarvam Speech-to-Text (Saaras v3).
    Auto-detects language if language_hint is None (by passing "unknown").
    Returns a tuple of (transcribed_text, detected_language_code).
    """
    if not SARVAM_API_KEY:
        raise ValueError("SARVAM_API_KEY not found in environment variables.")

    url = "https://api.sarvam.ai/speech-to-text"
    headers = {
        "api-subscription-key": SARVAM_API_KEY
    }
    
    # Pack audio bytes as file-like object for requests
    files = {
        "file": ("audio.wav", io.BytesIO(audio_bytes), "audio/wav")
    }
    
    data = {
        "model": "saaras:v3",
        "language_code": language_hint if language_hint else "unknown",
        "mode": "transcribe"
    }

    try:
        # Pinned 15 second timeout to handle API network issues gracefully
        response = requests.post(url, headers=headers, files=files, data=data, timeout=15)
        if response.status_code == 200:
            res_json = response.json()
            transcript = res_json.get("transcript", "").strip()
            detected_lang = res_json.get("language_code", "kn-IN")
            return transcript, detected_lang
        else:
            raise RuntimeError(f"Sarvam STT returned status {response.status_code}: {response.text}")
    except Exception as e:
        print(f"Error during Sarvam STT transcription: {e}")
        # Return fallback values
        return "", "kn-IN"

def translate_to_english(text: str, source_lang: str = "kn-IN") -> str:
    """
    Translates non-English text to English (en-IN) using Sarvam Translate.
    """
    if not text.strip():
        return ""
    if source_lang.startswith("en"):
        return text

    if not SARVAM_API_KEY:
        raise ValueError("SARVAM_API_KEY not found in environment variables.")

    url = "https://api.sarvam.ai/translate"
    headers = {
        "api-subscription-key": SARVAM_API_KEY,
        "Content-Type": "application/json"
    }
    
    payload = {
        "input": text,
        "source_language_code": source_lang,
        "target_language_code": "en-IN",
        "model": "sarvam-translate:v1",
        "mode": "formal"
    }

    try:
        response = requests.post(url, json=payload, headers=headers, timeout=10)
        if response.status_code == 200:
            return response.json().get("translated_text", "").strip()
        else:
            raise RuntimeError(f"Sarvam Translate to English returned status {response.status_code}: {response.text}")
    except Exception as e:
        print(f"Error during Sarvam Translate to English: {e}")
        return text  # Fallback to source text

def translate_and_speak(text: str, target_lang: str = "kn-IN") -> bytes:
    """
    Translates English answer to target language (e.g. kn-IN) if not English,
    then synthesizes audio using Sarvam Text-to-Speech (Bulbul v3) using "anushka" speaker.
    Returns raw WAV audio bytes.
    """
    if not text.strip():
        return b""

    if not SARVAM_API_KEY:
        raise ValueError("SARVAM_API_KEY not found in environment variables.")

    # 1. Translate from English (en-IN) to Target Language if required
    text_to_speak = text
    if target_lang and not target_lang.startswith("en"):
        url_trans = "https://api.sarvam.ai/translate"
        headers_trans = {
            "api-subscription-key": SARVAM_API_KEY,
            "Content-Type": "application/json"
        }
        payload_trans = {
            "input": text,
            "source_language_code": "en-IN",
            "target_language_code": target_lang,
            "model": "sarvam-translate:v1",
            "mode": "formal"
        }
        try:
            response_trans = requests.post(url_trans, json=payload_trans, headers=headers_trans, timeout=10)
            if response_trans.status_code == 200:
                text_to_speak = response_trans.json().get("translated_text", "").strip()
            else:
                print(f"Translation to target lang failed, falling back to English speech: {response_trans.text}")
        except Exception as trans_err:
            print(f"Error during translation in speak: {trans_err}")

    # 2. Text-to-Speech synthesis (Bulbul v3)
    url_tts = "https://api.sarvam.ai/text-to-speech"
    headers_tts = {
        "api-subscription-key": SARVAM_API_KEY,
        "Content-Type": "application/json"
    }
    payload_tts = {
        "text": text_to_speak,
        "target_language_code": target_lang if target_lang else "kn-IN",
        "speaker": "ritu",
        "model": "bulbul:v3",
        "pace": 1.0
    }

    try:
        response_tts = requests.post(url_tts, json=payload_tts, headers=headers_tts, timeout=15)
        if response_tts.status_code == 200:
            audios_list = response_tts.json().get("audios", [])
            audio_b64 = audios_list[0] if audios_list else ""
            return base64.b64decode(audio_b64)
        else:
            raise RuntimeError(f"Sarvam TTS returned status {response_tts.status_code}: {response_tts.text}")
    except Exception as e:
        print(f"Error during Sarvam TTS synthesis: {e}")
        return b""  # Fallback to empty audio
