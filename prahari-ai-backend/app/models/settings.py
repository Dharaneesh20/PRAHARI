"""Settings & Audit Log schemas."""
from pydantic import BaseModel
from typing import Any, Optional
from datetime import datetime


class UpdateProfileRequest(BaseModel):
    name: Optional[str] = None
    username: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    bio: Optional[str] = None
    avatar: Optional[str] = None


class UpdatedProfile(BaseModel):
    id: str
    name: str
    username: Optional[str] = None
    badgeId: str
    rank: str
    station: str
    role: str
    email: Optional[str] = None
    phone: Optional[str] = None
    bio: Optional[str] = None
    avatar: Optional[str] = None
    clearance_level: int


class UpdateProfileResponse(BaseModel):
    status: str
    profile: UpdatedProfile


class AuditEntry(BaseModel):
    id: str
    action: str
    timestamp: datetime
    resource: str
    hash: str


class SettingsResponse(BaseModel):
    preferences: dict[str, Any]
    notificationPreferences: dict[str, Any]


class UpdateSettingsRequest(BaseModel):
    preferences: Optional[dict[str, Any]] = None
    notificationPreferences: Optional[dict[str, Any]] = None


class ChangePasswordRequest(BaseModel):
    currentPassword: str
    newPassword: str


class DeleteAccountRequest(BaseModel):
    password: str


class Notification(BaseModel):
    id: str
    title: str
    message: str
    category: str
    resource: Optional[str] = None
    read: bool
    createdAt: datetime
