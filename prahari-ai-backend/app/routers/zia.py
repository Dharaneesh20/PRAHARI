"""
Prahari AI — Zoho Catalyst Zia Router
======================================
FastAPI endpoints for Voice STT/TTS and Kannada/English Neural Translation.
"""

from fastapi import APIRouter, UploadFile, File, Form, Response, HTTPException
from pydantic import BaseModel
from typing import Optional

from app.services.zia_service import transcribe_audio, synthesize_speech, translate_text

router = APIRouter(prefix="/zia", tags=["Zoho Catalyst Zia Services"])


class TranslationRequest(BaseModel):
    text: str
    target_lang: str = "kn-IN"
    source_lang: str = "en-IN"


class TTSRequest(BaseModel):
    text: str
    language: str = "kn-IN"


@router.post("/speech-to-text")
async def speech_to_text(
    file: Optional[UploadFile] = File(None),
    language: str = Form("kn-IN")
):
    """
    Accepts audio file upload and returns transcribed query text using Zoho Catalyst Zia STT.
    """
    try:
        content = b""
        content_type = "audio/wav"
        if file:
            content = await file.read()
            if file.content_type:
                content_type = file.content_type

        res = await transcribe_audio(content, content_type=content_type, language=language)
        return res
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Zia STT processing failed: {str(e)}")


@router.post("/text-to-speech")
async def text_to_speech(req: TTSRequest):
    """
    Converts text to audio bytes using Zoho Catalyst Zia TTS.
    """
    try:
        audio_bytes = await synthesize_speech(req.text, req.language)
        if not audio_bytes:
            return {"status": "client_fallback", "message": "Use Web Speech API for voice playback."}
        return Response(content=audio_bytes, media_type="audio/mpeg")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Zia TTS processing failed: {str(e)}")


@router.post("/translate")
async def translate(req: TranslationRequest):
    """
    Translates text between English and Kannada using Zoho Catalyst Zia Translation.
    """
    try:
        res = await translate_text(req.text, target_lang=req.target_lang, source_lang=req.source_lang)
        return res
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Zia Translation failed: {str(e)}")
