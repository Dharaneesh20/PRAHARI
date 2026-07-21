"""
Prahari AI — Zoho Catalyst QuickML (Zia NLP) Voice API Router
FastAPI endpoints for production-grade Voice AI:
  POST /api/voice/tts — Text-to-Speech audio synthesis
  POST /api/voice/stt — Speech-to-Text audio transcription
  GET  /api/voice/options — Supported Zia voice and language configuration
"""
import logging
from typing import Optional
from fastapi import APIRouter, File, Form, HTTPException, Response, UploadFile
from pydantic import BaseModel, Field

from app.services.catalyst.voice import (
    synthesize_speech_zia,
    transcribe_audio_zia,
    get_zia_voice_options,
)

logger = logging.getLogger("zoho.voice.router")

router = APIRouter(tags=["Zoho Catalyst Zia Voice AI"])


class TTSRequest(BaseModel):
    text: str = Field(..., description="Text content to synthesize into speech")
    language: str = Field(default="kn-IN", description="Language code: en-IN, kn-IN")
    voice: Optional[str] = Field(default=None, description="Voice ID: zia-en-female-1, zia-kn-female-1")
    pitch: Optional[str] = Field(default="medium", description="Pitch: low, medium, high")
    speed: Optional[float] = Field(default=1.0, description="Playback speed: 0.75 to 1.5")
    emotion: Optional[str] = Field(default="neutral", description="Emotion: neutral, formal, emphatic")


@router.post("/tts", summary="Zoho Catalyst QuickML Zia — Text-to-Speech (TTS)")
async def voice_text_to_speech(req: TTSRequest):
    """
    Synthesizes input text into audio binary stream using Zoho Catalyst QuickML Zia TTS API.
    Returns audio/mpeg or audio/wav bytes stream.
    """
    if not req.text or not req.text.strip():
        raise HTTPException(status_code=400, detail="Text field cannot be empty.")

    audio_bytes, res_meta = await synthesize_speech_zia(
        text=req.text,
        language=req.language,
        voice=req.voice,
        pitch=req.pitch,
        speed=req.speed,
        emotion=req.emotion,
    )

    if not audio_bytes:
        err_code = res_meta.get("error_code", 500)
        msg = res_meta.get("message", "Zia TTS synthesis failed.")
        raise HTTPException(status_code=err_code if isinstance(err_code, int) and 400 <= err_code < 600 else 500, detail=msg)

    return Response(content=audio_bytes, media_type="audio/wav")


@router.post("/stt", summary="Zoho Catalyst QuickML Zia — Speech-to-Text (STT)")
async def voice_speech_to_text(
    file: Optional[UploadFile] = File(None),
    language: str = Form("kn-IN"),
):
    """
    Transcribes uploaded audio speech recording into text using Zoho Catalyst QuickML Zia STT API.
    Returns transcript JSON payload.
    """
    if not file:
        raise HTTPException(status_code=400, detail="Audio file must be uploaded.")

    audio_bytes = await file.read()
    if not audio_bytes:
        raise HTTPException(status_code=400, detail="Uploaded audio file is empty.")

    filename = file.filename or "speech.wav"
    content_type = file.content_type or "audio/wav"

    res = await transcribe_audio_zia(
        audio_bytes=audio_bytes,
        filename=filename,
        content_type=content_type,
        language=language,
    )

    if res.get("status") == "error":
        err_code = res.get("error_code", 500)
        msg = res.get("message", "Zia STT transcription failed.")
        raise HTTPException(status_code=err_code if isinstance(err_code, int) and 400 <= err_code < 600 else 500, detail=msg)

    return res


@router.get("/options", summary="Zoho Catalyst Zia — Voice Configuration Options")
async def voice_options():
    """
    Returns supported Zia voice options, languages, and pitch/speed settings.
    """
    return get_zia_voice_options()
