"""
Prahari AI — NVIDIA AI Services Router
FastAPI endpoints powered by NVIDIA AI Hosted APIs:
  POST /api/v1/ai/speech-to-text  — High-accuracy multilingual speech recognition
  POST /api/v1/ai/text-to-speech  — Voice synthesis using hosted endpoints
  POST /api/v1/ai/translate       — Real-time multilingual translation
  POST /api/v1/ai/chat            — LLM chat inference with open-source models
  POST /api/v1/ai/summarize       — Document and intelligence summarization
"""

import logging
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, File, Form, HTTPException, Response, UploadFile
from pydantic import BaseModel, Field

from app.services.nvidia.speech import transcribe_audio
from app.services.nvidia.tts import synthesize_speech
from app.services.nvidia.translation import translate_text
from app.services.nvidia.llm import chat_completion, summarize_text
from app.dependencies import get_current_user
from app.models.user import User

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/ai", tags=["NVIDIA AI Services"])


# ── Request / Response Models ─────────────────────────────────────────────────

class TranslationRequest(BaseModel):
    text: str
    target_lang: str = "kn-IN"
    source_lang: str = "en-IN"


class TTSRequest(BaseModel):
    text: str
    language: str = "kn-IN"


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    messages: List[ChatMessage]
    model: str = "meta/llama-3.1-70b-instruct"
    temperature: float = 0.2
    max_tokens: int = 1024


class SummarizeRequest(BaseModel):
    text: str
    max_length: int = 250


# ── Speech-to-Text ────────────────────────────────────────────────────────────

@router.post(
    "/speech-to-text",
    summary="NVIDIA AI — Multilingual Speech-to-Text",
)
async def speech_to_text(
    file: Optional[UploadFile] = File(None),
    language: str = Form("kn-IN"),
):
    """
    Accepts an audio file upload and returns transcribed text using
    NVIDIA's hosted open-source speech models.
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
        logger.error("NVIDIA STT endpoint exception: %s", e)
        raise HTTPException(status_code=500, detail=f"NVIDIA STT processing failed: {str(e)}")


# ── Text-to-Speech ────────────────────────────────────────────────────────────

@router.post(
    "/text-to-speech",
    summary="NVIDIA AI — Text-to-Speech Voice Synthesis",
)
async def text_to_speech(req: TTSRequest):
    """
    Converts text to speech audio bytes using NVIDIA Hosted APIs.
    Returns audio/mpeg binary content, or client fallback directive if unconfigured.
    """
    try:
        audio_bytes = await synthesize_speech(req.text, req.language)
        if not audio_bytes:
            return {
                "status": "client_fallback",
                "message": "NVIDIA API key not set or speech synthesis fallback requested. Use Web Speech API for voice playback.",
                "provider": "NVIDIA AI Hosted APIs",
            }
        return Response(content=audio_bytes, media_type="audio/mpeg")
    except Exception as e:
        logger.error("NVIDIA TTS endpoint exception: %s", e)
        raise HTTPException(status_code=500, detail=f"NVIDIA TTS processing failed: {str(e)}")


# ── Translation ───────────────────────────────────────────────────────────────

@router.post(
    "/translate",
    summary="NVIDIA AI — Multilingual Neural Translation",
)
async def translate(req: TranslationRequest):
    """
    Translates text between English and Kannada using NVIDIA Hosted Models.
    """
    try:
        res = await translate_text(
            req.text,
            target_lang=req.target_lang,
            source_lang=req.source_lang,
        )
        return res
    except Exception as e:
        logger.error("NVIDIA Translation endpoint exception: %s", e)
        raise HTTPException(status_code=500, detail=f"NVIDIA Translation failed: {str(e)}")


# ── Chat ──────────────────────────────────────────────────────────────────────

@router.post(
    "/chat",
    summary="NVIDIA AI — LLM Chat Completion",
)
async def chat(req: ChatRequest):
    """
    Executes conversational AI queries using NVIDIA hosted open-source LLMs.
    """
    try:
        msg_dicts = [{"role": m.role, "content": m.content} for m in req.messages]
        res = await chat_completion(
            messages=msg_dicts,
            model=req.model,
            temperature=req.temperature,
            max_tokens=req.max_tokens,
        )
        return res
    except Exception as e:
        logger.error("NVIDIA Chat endpoint exception: %s", e)
        raise HTTPException(status_code=500, detail=f"NVIDIA Chat failed: {str(e)}")


# ── Summarize ─────────────────────────────────────────────────────────────────

@router.post(
    "/summarize",
    summary="NVIDIA AI — Text & Report Summarization",
)
async def summarize(req: SummarizeRequest):
    """
    Summarizes long FIR texts, incident logs, or evidence documents using NVIDIA Hosted LLMs.
    """
    try:
        res = await summarize_text(req.text, max_length=req.max_length)
        return res
    except Exception as e:
        logger.error("NVIDIA Summarize endpoint exception: %s", e)
        raise HTTPException(status_code=500, detail=f"NVIDIA Summarize failed: {str(e)}")
