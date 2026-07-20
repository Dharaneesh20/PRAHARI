"""Settings router — /settings/profile, /audit-log"""
from typing import List

from fastapi import APIRouter, Depends, HTTPException

from app.dependencies import get_current_user
from app.models.settings import (
    AuditEntry,
    ChangePasswordRequest,
    DeleteAccountRequest,
    Notification,
    SettingsResponse,
    UpdateProfileRequest,
    UpdateProfileResponse,
    UpdateSettingsRequest,
)
from app.services import operational_store
from app.services.auth_service import _hash_password, update_user_profile, verify_password
from app.routers.auth import serialize_user
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
    """Update the logged-in officer's editable profile fields."""
    if body.email:
        existing_email = db.query(User).filter(User.email == body.email, User.id != current_user.id).first()
        if existing_email:
            raise HTTPException(status_code=400, detail="Email is already in use.")
    if body.username:
        existing_username = db.query(User).filter(User.username == body.username, User.id != current_user.id).first()
        if existing_username:
            raise HTTPException(status_code=400, detail="Username is already in use.")
    updated = update_user_profile(
        db,
        current_user.badge_id,
        name=body.name,
        username=body.username,
        email=body.email,
        phone=body.phone,
        bio=body.bio,
        avatar=body.avatar,
    )
    if updated is None:
        raise HTTPException(status_code=404, detail="User profile not found.")
    operational_store.add_audit_entry(db, "Updated profile details", "PROFILE")
    db.commit()
    return {"status": "success", "profile": serialize_user(updated)}


@router.patch("/password", summary="Change current user's password")
async def change_password(
    body: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_auth_db),
):
    if not verify_password(body.currentPassword, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Current password is incorrect.")
    if len(body.newPassword) < 8:
        raise HTTPException(status_code=400, detail="New password must be at least 8 characters.")
    current_user.hashed_password = _hash_password(body.newPassword)
    operational_store.add_audit_entry(db, "Changed account password", "SECURITY")
    db.commit()
    return {"status": "success", "message": "Password updated."}


@router.delete("/account", summary="Delete current user account")
async def delete_account(
    body: DeleteAccountRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_auth_db),
):
    if not verify_password(body.password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Password is incorrect.")
    db.delete(current_user)
    db.commit()
    return {"status": "success", "message": "Account deleted."}


@router.get("", response_model=SettingsResponse, summary="Get user settings")
async def get_settings(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_auth_db),
):
    return operational_store.get_settings(db, current_user.id)


@router.patch("", response_model=SettingsResponse, summary="Update user settings")
async def update_settings(
    body: UpdateSettingsRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_auth_db),
):
    return operational_store.update_settings(db, current_user.id, body.preferences, body.notificationPreferences)


@router.get("/audit-log", response_model=List[AuditEntry], summary="Blockchain audit ledger")
async def get_audit_log(current_user: User = Depends(get_current_user), db: Session = Depends(get_auth_db)):
    """Return the read-only audit log of all session actions."""
    return operational_store.list_audit_entries(db)


@router.get("/notifications", response_model=List[Notification], summary="List notifications")
async def list_notifications(current_user: User = Depends(get_current_user), db: Session = Depends(get_auth_db)):
    return operational_store.list_notifications(db, current_user.id)


@router.get("/notifications/unread-count", summary="Unread notification count")
async def unread_notification_count(current_user: User = Depends(get_current_user), db: Session = Depends(get_auth_db)):
    return {"count": operational_store.unread_notification_count(db, current_user.id)}


@router.patch("/notifications/{notification_id}/read", response_model=Notification, summary="Mark notification read")
async def mark_notification_read(
    notification_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_auth_db),
):
    notification = operational_store.mark_notification_read(db, current_user.id, notification_id)
    if notification is None:
        raise HTTPException(status_code=404, detail=f"Notification {notification_id} not found.")
    return notification


@router.delete("/notifications/{notification_id}", summary="Delete notification")
async def delete_notification(
    notification_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_auth_db),
):
    deleted = operational_store.delete_notification(db, current_user.id, notification_id)
    if not deleted:
        raise HTTPException(status_code=404, detail=f"Notification {notification_id} not found.")
    return {"status": "success"}
