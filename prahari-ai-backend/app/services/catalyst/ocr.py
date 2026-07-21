"""
Prahari AI — Zoho Catalyst OCR Service
Extract printed text from FIRs, scanned documents, ID cards and evidence images.
"""
import logging
from typing import Dict, Any
from app.services.catalyst.client import post_catalyst_api
from app.services.catalyst.auth import is_catalyst_configured

logger = logging.getLogger(__name__)

async def extract_text_from_image(
    image_bytes: bytes,
    filename: str = "image.png",
    content_type: str = "image/png",
    language: str = "eng",
) -> Dict[str, Any]:
    """
    Extracts text from an image payload using Zoho Catalyst OCR API.
    """
    if not is_catalyst_configured():
        logger.info("Catalyst credentials unconfigured. Returning mock OCR extract for demonstration.")
        return {
            "status": "unconfigured",
            "message": "Zoho Catalyst OCR credentials are not set. Configure CATALYST_PROJECT_ID, CATALYST_CLIENT_ID, CATALYST_CLIENT_SECRET, and CATALYST_REFRESH_TOKEN in backend .env.",
            "text": "FIRST INFORMATION REPORT (Under Section 154 Cr.P.C.)\nDistrict: Bengaluru City | Station: Commercial Street PS\nFIR No: 0142/2026 | Date: 18/07/2026\nActs & Sections: IPC 379, 420\nAccused: Unknown suspect identified via CCTV footage.\nStolen Assets: Gold ornament & electronic items valued at ₹1,50,000.",
            "confidence": 98.4,
            "provider": "Powered by Zoho Catalyst OCR",
        }

    files = {
        "code": (filename, image_bytes, content_type),
    }
    data = {
        "model_type": "OCR",
        "language": language,
    }

    res = await post_catalyst_api("ml/ocr", files=files, data=data)
    if "error" in res or res.get("status") == "unconfigured":
        return res

    # Parse response structure from Catalyst ML OCR API
    ocr_data = res.get("data", {})
    extracted_text = ocr_data.get("text", "") or res.get("text", "")
    confidence = ocr_data.get("confidence", 95.0)

    return {
        "status": "success",
        "text": extracted_text,
        "confidence": confidence,
        "provider": "Powered by Zoho Catalyst OCR",
    }
