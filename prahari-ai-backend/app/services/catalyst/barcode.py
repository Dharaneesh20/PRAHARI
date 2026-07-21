"""
Prahari AI — Zoho Catalyst Barcode Scanner Service
Read QR codes and barcodes.
"""
import logging
from typing import Dict, Any
from app.services.catalyst.client import post_catalyst_api
from app.services.catalyst.auth import is_catalyst_configured

logger = logging.getLogger(__name__)

async def scan_barcode(
    image_bytes: bytes,
    filename: str = "code.jpg",
    content_type: str = "image/jpeg",
) -> Dict[str, Any]:
    """
    Scans barcodes / QR codes using Zoho Catalyst Barcode Scanner API.
    """
    if not is_catalyst_configured():
        return {
            "status": "unconfigured",
            "message": "Zoho Catalyst credentials not configured.",
            "barcodes": [{"type": "QR_CODE", "data": "https://ksp.karnataka.gov.in"}],
            "provider": "Powered by Zoho Catalyst",
        }

    files = {
        "code": (filename, image_bytes, content_type),
    }

    res = await post_catalyst_api("ml/barcode", files=files)
    if "error" in res or res.get("status") == "unconfigured":
        return res

    return {
        "status": "success",
        "result": res.get("data", res),
        "provider": "Powered by Zoho Catalyst",
    }
