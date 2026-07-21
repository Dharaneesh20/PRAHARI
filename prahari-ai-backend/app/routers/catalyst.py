"""
Prahari AI — Zoho Catalyst Services Router
FastAPI endpoints powered by Zoho Catalyst Supported Microservices:
  POST /api/v1/catalyst/ocr                — OCR scanning of FIRs & evidence
  POST /api/v1/catalyst/text-analysis     — Entity extraction & sentiment analysis
  POST /api/v1/catalyst/face-analysis     — Face detection & attribute analysis
  POST /api/v1/catalyst/object-recognition — Vehicle & weapon identification
  POST /api/v1/catalyst/image-moderation  — Content safety moderation
  POST /api/v1/catalyst/barcode           — QR code & barcode scanning
  POST /api/v1/catalyst/identity          — Government ID card parsing
"""

import asyncio
import json
import logging
from typing import Optional
from fastapi import APIRouter, Depends, File, Form, HTTPException, Response, UploadFile
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from app.services.catalyst.ocr import extract_text_from_image
from app.services.catalyst.text_analytics import analyze_text
from app.services.catalyst.face import analyze_face
from app.services.catalyst.object import recognize_objects
from app.services.catalyst.barcode import scan_barcode
from app.services.catalyst.identity import scan_identity_doc
from app.services.catalyst.moderation import moderate_image
from app.services.catalyst.nlp import (
    transcribe_audio_catalyst,
    synthesize_speech_catalyst,
    translate_text_catalyst,
)
from app.dependencies import get_current_user
from app.models.user import User

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/catalyst", tags=["Zoho Catalyst Services"])


class TextAnalysisRequest(BaseModel):
    text: str


# ── OCR (Optical Character Recognition) ──────────────────────────────────────

@router.post(
    "/ocr",
    summary="Zoho Catalyst OCR — Optical Character Recognition (SSE Stream)",
)
async def image_ocr(
    file: UploadFile = File(..., description="Image file (PNG, JPG, TIFF, BMP, PDF — max 20 MB)"),
    language: str = Form("eng", description="Language code: eng, kan ..."),
    current_user: User = Depends(get_current_user),
):
    """
    Extracts text from an uploaded image using **Powered by Zoho Catalyst OCR**.
    Returns a Server-Sent Events (SSE) stream for live UI scan animations.
    """
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

    lang_map = {
        "en": "eng", "kn": "kan", "eng": "eng", "kan": "kan",
        "en-IN": "eng", "kn-IN": "kan",
    }
    catalyst_lang = lang_map.get(language, "eng")
    filename = file.filename or "upload.png"

    async def _sse_stream():
        yield (
            "data: " + json.dumps({
                "status": "scanning",
                "provider": "Powered by Zoho Catalyst OCR",
                "service": "Zoho Catalyst",
            }) + "\n\n"
        )

        try:
            result = await extract_text_from_image(
                image_bytes,
                filename=filename,
                content_type=ct,
                language=catalyst_lang,
            )
        except Exception as e:
            logger.exception("Catalyst OCR call error: %s", e)
            yield "data: " + json.dumps({"error": str(e)[:300]}) + "\n\n"
            yield 'data: {"token": "[DONE]"}\n\n'
            return

        if result.get("status") == "unconfigured":
            yield (
                "data: " + json.dumps({
                    "status": "unconfigured",
                    "provider": "Powered by Zoho Catalyst OCR",
                    "message": result.get("message", ""),
                }) + "\n\n"
            )
            yield 'data: {"token": "[DONE]"}\n\n'
            return

        extracted_text = result.get("text", "").strip()
        if not extracted_text:
            yield 'data: {"token": "No text detected in the image."}\n\n'
        else:
            chunk_size = 60
            for i in range(0, len(extracted_text), chunk_size):
                chunk = extracted_text[i : i + chunk_size]
                token = chunk.replace('"', '\\"').replace("\n", "\\n")
                yield f'data: {{"token": "{token}"}}\n\n'
                await asyncio.sleep(0.04)

        confidence = result.get("confidence", 0.0)
        if confidence:
            yield (
                "data: " + json.dumps({
                    "meta": {
                        "confidence": confidence,
                        "provider": "Powered by Zoho Catalyst OCR",
                        "chars": len(extracted_text),
                    }
                }) + "\n\n"
            )

        yield 'data: {"token": "[DONE]"}\n\n'

    return StreamingResponse(
        _sse_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
            "X-Catalyst-Service": "Zoho Catalyst OCR",
        },
    )


# ── Text Analytics ───────────────────────────────────────────────────────────

@router.post("/text-analysis", summary="Zoho Catalyst — Text Analytics")
async def text_analysis(req: TextAnalysisRequest, current_user: User = Depends(get_current_user)):
    try:
        return await analyze_text(req.text)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Text Analytics failed: {str(e)}")


# ── Face Analytics ───────────────────────────────────────────────────────────

@router.post("/face-analysis", summary="Zoho Catalyst — Face Analytics")
async def face_analysis(file: UploadFile = File(...), current_user: User = Depends(get_current_user)):
    try:
        bytes_data = await file.read()
        return await analyze_face(bytes_data, filename=file.filename or "face.jpg", content_type=file.content_type or "image/jpeg")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Face Analytics failed: {str(e)}")


# ── Object Recognition ────────────────────────────────────────────────────────

@router.post("/object-recognition", summary="Zoho Catalyst — Object Recognition")
async def object_recognition(file: UploadFile = File(...), current_user: User = Depends(get_current_user)):
    try:
        bytes_data = await file.read()
        return await recognize_objects(bytes_data, filename=file.filename or "object.jpg", content_type=file.content_type or "image/jpeg")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Object Recognition failed: {str(e)}")


# ── Image Moderation ──────────────────────────────────────────────────────────

@router.post("/image-moderation", summary="Zoho Catalyst — Image Moderation")
async def image_moderation(file: UploadFile = File(...), current_user: User = Depends(get_current_user)):
    try:
        bytes_data = await file.read()
        return await moderate_image(bytes_data, filename=file.filename or "mod.jpg", content_type=file.content_type or "image/jpeg")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Image Moderation failed: {str(e)}")


# ── Barcode Scanner ───────────────────────────────────────────────────────────

@router.post("/barcode", summary="Zoho Catalyst — Barcode & QR Scanner")
async def barcode_scanner(file: UploadFile = File(...), current_user: User = Depends(get_current_user)):
    try:
        bytes_data = await file.read()
        return await scan_barcode(bytes_data, filename=file.filename or "code.jpg", content_type=file.content_type or "image/jpeg")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Barcode Scanner failed: {str(e)}")


# ── Identity Scanner ──────────────────────────────────────────────────────────

@router.post("/identity", summary="Zoho Catalyst — Identity Document Scanner")
async def identity_scanner(
    file: UploadFile = File(...),
    doc_type: str = Form("auto"),
    current_user: User = Depends(get_current_user),
):
    try:
        bytes_data = await file.read()
        return await scan_identity_doc(bytes_data, doc_type=doc_type, filename=file.filename or "id.jpg", content_type=file.content_type or "image/jpeg")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Identity Scanner failed: {str(e)}")


# ── QuickML Speech-to-Text ────────────────────────────────────────────────────

@router.post("/speech-to-text", summary="Zoho Catalyst QuickML — Speech-to-Text")
async def catalyst_stt(
    file: Optional[UploadFile] = File(None),
    language: str = Form("kn-IN"),
):
    try:
        content = b""
        ct = "audio/wav"
        filename = "audio.wav"
        if file:
            content = await file.read()
            if file.content_type:
                ct = file.content_type
            if file.filename:
                filename = file.filename
        return await transcribe_audio_catalyst(content, filename=filename, content_type=ct, language=language)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Catalyst QuickML STT failed: {str(e)}")


# ── QuickML Text-to-Speech ────────────────────────────────────────────────────

class CatalystTTSRequest(BaseModel):
    text: str
    language: str = "kn-IN"


@router.post("/text-to-speech", summary="Zoho Catalyst QuickML — Text-to-Speech")
async def catalyst_tts(req: CatalystTTSRequest):
    try:
        return await synthesize_speech_catalyst(req.text, req.language)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Catalyst QuickML TTS failed: {str(e)}")


# ── QuickML Text Translation ──────────────────────────────────────────────────

class CatalystTranslationRequest(BaseModel):
    text: str
    source_lang: str = "en-IN"
    target_lang: str = "kn-IN"


@router.post("/translate", summary="Zoho Catalyst QuickML — Text Translation")
async def catalyst_translation(req: CatalystTranslationRequest):
    try:
        return await translate_text_catalyst(req.text, req.source_lang, req.target_lang)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Catalyst QuickML Translation failed: {str(e)}")

