"""Settings router — /settings/profile, /audit-log"""
from typing import List

from fastapi import APIRouter, Depends

from app.dependencies import get_current_user
from app.models.settings import UpdateProfileRequest, UpdateProfileResponse, AuditEntry
from app.services import mock_store
from app.services.auth_service import update_user_profile

router = APIRouter()


@router.patch("/profile", response_model=UpdateProfileResponse, summary="Update officer profile")
async def update_profile(
    body: UpdateProfileRequest,
    current_user: dict = Depends(get_current_user),
):
    """Update the logged-in officer's email and/or phone number."""
    updated = update_user_profile(
        current_user["badgeId"],
        email=body.email,
        phone=body.phone,
    )
    return {"status": "success", "profile": updated}


@router.get("/audit-log", response_model=List[AuditEntry], summary="Blockchain audit ledger")
async def get_audit_log(current_user: dict = Depends(get_current_user)):
    """Return the read-only audit log of all session actions."""
    return mock_store.get_audit_log()
