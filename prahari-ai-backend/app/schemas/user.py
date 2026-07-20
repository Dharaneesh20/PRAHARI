from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime

class UserBase(BaseModel):
    badge_id: str
    name: str
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    role: str
    clearance_level: int
    department: Optional[str] = None
    district: Optional[str] = None
    station: Optional[str] = None
    avatar: Optional[str] = None
    is_active: bool = True

class UserCreate(UserBase):
    password: str

class UserUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    role: Optional[str] = None
    clearance_level: Optional[int] = None
    department: Optional[str] = None
    district: Optional[str] = None
    station: Optional[str] = None
    avatar: Optional[str] = None
    is_active: Optional[bool] = None
    password: Optional[str] = None

class UserInDBBase(UserBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class UserProfile(UserInDBBase):
    pass
