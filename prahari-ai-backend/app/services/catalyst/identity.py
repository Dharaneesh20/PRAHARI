"""
Prahari AI — Zoho Catalyst Identity Scanner Service
Extract structured information from supported identity documents.
"""
import logging
from typing import Dict, Any
from app.services.catalyst.client import post_catalyst_api
from app.services.catalyst.auth import is_catalyst_configured

logger = logging.getLogger(__name__)

async def scan_identity_doc(
    image_bytes: bytes,
    doc_type: str = "auto",
    filename: str = "id.jpg",
    content_type: str = "image/jpeg",
) -> Dict[str, Any]:
    """
    Extracts structured fields from identity documents using Zoho Catalyst Identity Scanner.
    """
    if not is_catalyst_configured():
        return {
            "status": "unconfigured",
            "message": "Zoho Catalyst credentials not configured.",
            "identity_fields": {
                "document_type": "Aadhaar / Driving License",
                "name": "KARNATAKA CITIZEN",
                "id_number": "XXXX-XXXX-1234",
                "dob": "01/01/1990",
            },
            "provider": "Powered by Zoho Catalyst",
        }

    files = {
        "image": (filename, image_bytes, content_type),
    }
    data = {
        "doc_type": doc_type,
    }

    res = await post_catalyst_api("ml/identity", files=files, data=data)
    if "error" in res or res.get("status") == "unconfigured":
        return res

    return {
        "status": "success",
        "result": res.get("data", res),
        "provider": "Powered by Zoho Catalyst",
    }
