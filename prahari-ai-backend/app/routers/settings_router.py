"""Settings router — /settings/profile, /audit-log"""
from typing import List

from fastapi import APIRouter, Depends

from app.dependencies import get_current_user
from app.models.settings import UpdateProfileRequest, UpdateProfileResponse, AuditEntry
from app.services import mock_store
from app.services.auth_service import update_user_profile
from sqlalchemy.orm import Session
from app.core.db import get_auth_db
from app.models.user import User

router = APIRouter()


@router.patch("/profile", response_model=UpdateProfileResponse, summary="Update officer profile")
async def update_profile(
    body: UpdateProfileRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_auth_db)
):
    """Update the logged-in officer's email and/or phone number."""
    updated = update_user_profile(
        db,
        current_user.badge_id,
        email=body.email,
        phone=body.phone,
    )
    return {"status": "success", "profile": {"email": updated.email, "phone": updated.phone}}


@router.get("/audit-log", response_model=List[AuditEntry], summary="Blockchain audit ledger")
async def get_audit_log(current_user: User = Depends(get_current_user)):
    """Return the read-only audit log of all session actions."""
    return mock_store.get_audit_log()
