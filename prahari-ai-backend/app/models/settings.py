"""Settings & Audit Log schemas."""
from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class UpdateProfileRequest(BaseModel):
    email: Optional[str] = None
    phone: Optional[str] = None


class UpdatedProfile(BaseModel):
    email: Optional[str] = None
    phone: Optional[str] = None


class UpdateProfileResponse(BaseModel):
    status: str
    profile: UpdatedProfile


class AuditEntry(BaseModel):
    id: str
    action: str
    timestamp: datetime
    resource: str
    hash: str
