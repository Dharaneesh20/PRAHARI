"""Auth request/response schemas."""
from pydantic import BaseModel
from typing import Optional


class LoginRequest(BaseModel):
    badgeId: str
    password: str


class UserProfile(BaseModel):
    id: str
    name: str
    badgeId: str
    rank: str
    station: str
    role: str
    email: Optional[str] = None
    phone: Optional[str] = None


class LoginResponse(BaseModel):
    token: str
    user: UserProfile


class SessionResponse(BaseModel):
    id: str
    name: str
    badgeId: str
    rank: str
    station: str
    role: str


class LogoutResponse(BaseModel):
    status: str
    message: str
