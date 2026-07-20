"""
Prahari AI — Zoho Catalyst Zia Router
======================================
FastAPI endpoints powered by Zoho Catalyst Zia Services:
  /zia/speech-to-text   — Kannada/English audio transcription
  /zia/text-to-speech   — Neural text-to-audio synthesis
  /zia/translate        — Kannada ↔ English neural translation
  /zia/ocr              — Image text extraction via Catalyst Zia ML OCR
"""

import asyncio
import json
import logging
from typing import Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, Response, UploadFile
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from app.services.zia_service import (
    transcribe_audio,
    synthesize_speech,
    translate_text,
    extract_text_from_image,
)
from app.dependencies import get_current_user
from app.models.user import User

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/zia", tags=["Zoho Catalyst Zia Services"])


# ── Request / Response Models ─────────────────────────────────────────────────

class TranslationRequest(BaseModel):
    text: str
    target_lang: str = "kn-IN"
    source_lang: str = "en-IN"


class TTSRequest(BaseModel):
    text: str
    language: str = "kn-IN"


# ── Speech-to-Text ────────────────────────────────────────────────────────────

@router.post(
    "/speech-to-text",
    summary="Zoho Catalyst Zia — Speech to Text (Kannada / English)",
)
async def speech_to_text(
    file: Optional[UploadFile] = File(None),
    language: str = Form("kn-IN"),
):
    """
    Accepts an audio file upload and returns transcribed query text
    using Zoho Catalyst Zia Speech-to-Text API.
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


# ── Text-to-Speech ────────────────────────────────────────────────────────────

@router.post(
    "/text-to-speech",
    summary="Zoho Catalyst Zia — Text to Speech",
)
async def text_to_speech(req: TTSRequest):
    """
    Converts text to audio bytes using Zoho Catalyst Zia Text-to-Speech.
    Returns audio/mpeg binary, or a JSON fallback directive for Web Speech API.
    """
    try:
        audio_bytes = await synthesize_speech(req.text, req.language)
        if not audio_bytes:
            return {
                "status":  "client_fallback",
                "message": "Use Web Speech API for voice playback.",
            }
        return Response(content=audio_bytes, media_type="audio/mpeg")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Zia TTS processing failed: {str(e)}")


# ── Translation ───────────────────────────────────────────────────────────────

@router.post(
    "/translate",
    summary="Zoho Catalyst Zia — Neural Translation (Kannada ↔ English)",
)
async def translate(req: TranslationRequest):
    """
    Translates text between English and Kannada using
    Zoho Catalyst Zia Neural Translation API.
    """
    try:
        res = await translate_text(
            req.text,
            target_lang=req.target_lang,
            source_lang=req.source_lang,
        )
        return res
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Zia Translation failed: {str(e)}")


# ── OCR — Zoho Catalyst Zia ML OCR ───────────────────────────────────────────

@router.post(
    "/ocr",
    summary="Zoho Catalyst Zia — Optical Character Recognition (SSE stream)",
)
async def image_ocr(
    file: UploadFile = File(..., description="Image file (PNG, JPG, TIFF, BMP, PDF — max 20 MB)"),
    language: str = Form("eng", description="Tesseract language code: eng, kan, hin …"),
    current_user: User = Depends(get_current_user),
):
    """
    Extracts text from an uploaded image using **Zoho Catalyst Zia ML OCR API**.

    The response is a Server-Sent Events (SSE) stream so the frontend can
    animate a live scan effect while the OCR result arrives.

    SSE events:
      data: {"status": "scanning", "provider": "Zoho Catalyst Zia OCR"}
      data: {"token": "<text chunk>"}          ← one or more per response
      data: {"token": "[DONE]"}                ← stream complete
      data: {"error": "<message>"}             ← error event
      data: {"status": "unconfigured", ...}    ← Catalyst not configured
    """

    # Validate mime type
    allowed_types = {
        "image/png", "image/jpeg", "image/jpg", "image/tiff",
        "image/bmp", "image/gif", "image/webp", "application/pdf",
    }
    ct = (file.content_type or "image/png").lower()
    if ct not in allowed_types:
        raise HTTPException(
            status_code=415,
            detail=f"Unsupported file type '{ct}'. Accepted: PNG, JPG, TIFF, BMP, GIF, WEBP, PDF.",
        )

    image_bytes = await file.read()
    if len(image_bytes) > 20 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="File too large. Maximum 20 MB.")

    # Map UI language selector ("en" / "kn") to Tesseract / Catalyst lang codes
    lang_map = {
        "en": "eng", "kn": "kan", "eng": "eng", "kan": "kan",
        "en-IN": "eng", "kn-IN": "kan",
    }
    catalyst_lang = lang_map.get(language, "eng")

    filename = file.filename or "upload.png"

    async def _sse_stream():
        """
        Yields SSE-formatted events:
          1. A "scanning" status event immediately (triggers UI animation)
          2. The extracted text broken into ~50-char chunks (simulates streaming)
          3. A [DONE] event
        """
        # ── 1. Announce that scanning has started ──────────────────────────
        yield (
            "data: " + json.dumps({
                "status":   "scanning",
                "provider": "Zoho Catalyst Zia OCR",
                "service":  "Zoho Catalyst",
            }) + "\n\n"
        )

        # ── 2. Call Catalyst OCR (non-streaming HTTP) ──────────────────────
        try:
            result = await extract_text_from_image(
                image_bytes,
                filename=filename,
                content_type=ct,
                language=catalyst_lang,
            )
        except Exception as e:
            logger.exception("Catalyst OCR call raised: %s", e)
            yield "data: " + json.dumps({"error": str(e)[:300]}) + "\n\n"
            yield 'data: {"token": "[DONE]"}\n\n'
            return

        # ── 3. Handle "unconfigured" state ─────────────────────────────────
        if result["status"] == "unconfigured":
            yield (
                "data: " + json.dumps({
                    "status":   "unconfigured",
                    "provider": "Zoho Catalyst Zia OCR",
                    "message":  result.get("message", ""),
                }) + "\n\n"
            )
            yield 'data: {"token": "[DONE]"}\n\n'
            return

        # ── 4. Stream the extracted text in small chunks ────────────────────
        #    (Simulates live token-by-token to drive the scan animation)
        extracted_text = result.get("text", "").strip()

        if not extracted_text:
            yield 'data: {"token": "No text detected in the image."}\n\n'
        else:
            chunk_size = 60  # characters per SSE event
            for i in range(0, len(extracted_text), chunk_size):
                chunk = extracted_text[i : i + chunk_size]
                token = chunk.replace('"', '\\"').replace("\n", "\\n")
                yield f'data: {{"token": "{token}"}}\n\n'
                # Small delay between chunks so the frontend renders them visibly
                await asyncio.sleep(0.04)

        # ── 5. Send confidence and completion ──────────────────────────────
        confidence = result.get("confidence", 0.0)
        if confidence:
            yield (
                "data: " + json.dumps({
                    "meta": {
                        "confidence": confidence,
                        "provider":   "Zoho Catalyst Zia OCR",
                        "chars":      len(extracted_text),
                    }
                }) + "\n\n"
            )

        yield 'data: {"token": "[DONE]"}\n\n'

    return StreamingResponse(
        _sse_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control":    "no-cache",
            "X-Accel-Buffering": "no",
            "Connection":        "keep-alive",
            # Branded header so the UI knows exactly which service responded
            "X-Zia-Service":    "Zoho Catalyst Zia OCR",
        },
    )
