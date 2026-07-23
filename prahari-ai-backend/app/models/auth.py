"""Auth request/response schemas."""
from pydantic import BaseModel
from typing import Optional


class LoginRequest(BaseModel):
    badgeId: str
    password: str


class UserProfile(BaseModel):
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
    clearance_level: int = 1


class LoginResponse(BaseModel):
    token: str
    user: UserProfile


class SessionResponse(UserProfile):
    pass


class LogoutResponse(BaseModel):
    status: str
    message: str
