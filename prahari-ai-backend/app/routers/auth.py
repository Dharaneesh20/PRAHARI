"""Authentication router — /auth/login, /auth/logout, /auth/session"""
from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.models.auth import LoginRequest, LoginResponse, SessionResponse, LogoutResponse
from app.services.auth_service import authenticate_user, create_access_token, blacklist_token
from app.dependencies import get_current_user
from app.core.db import get_auth_db
from app.models.user import User

router = APIRouter()
bearer = HTTPBearer(auto_error=False)


def serialize_user(user: User) -> dict:
    return {
        "id": str(user.id),
        "name": user.name,
        "username": user.username,
        "badgeId": user.badge_id,
        "rank": user.rank or "",
        "station": user.station or "",
        "role": user.role,
        "email": user.email,
        "phone": user.phone,
        "bio": user.bio,
        "avatar": user.avatar,
        "clearance_level": user.clearance_level,
    }


@router.post("/login", response_model=LoginResponse, summary="Officer login")
async def login(body: LoginRequest, db: Session = Depends(get_auth_db)):
    """Authenticate an officer using Badge ID and password."""
    user = authenticate_user(db, body.badgeId, body.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Badge ID or password.",
        )
    token = create_access_token({"sub": user.badge_id})
    return {
        "token": token,
        "user": serialize_user(user),
    }


@router.post("/logout", response_model=LogoutResponse, summary="Sign out")
async def logout(
    credentials: HTTPAuthorizationCredentials = Depends(bearer),
    current_user: User = Depends(get_current_user),
):
    """Invalidate the current session token."""
    if credentials:
        blacklist_token(credentials.credentials)
    return {"status": "success", "message": "Session invalidated"}


@router.get("/session", response_model=SessionResponse, summary="Get current session")
async def get_session(current_user: User = Depends(get_current_user)):
    """Return the profile for the currently authenticated officer."""
    return serialize_user(current_user)
