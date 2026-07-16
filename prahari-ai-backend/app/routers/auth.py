"""Authentication router — /auth/login, /auth/logout, /auth/session"""
from fastapi import APIRouter, HTTPException, Depends, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.models.auth import LoginRequest, LoginResponse, SessionResponse, LogoutResponse, UserProfile
from app.services.auth_service import authenticate_user, create_access_token, blacklist_token, decode_token
from app.dependencies import get_current_user

router = APIRouter()
bearer = HTTPBearer(auto_error=False)


@router.post("/login", response_model=LoginResponse, summary="Officer login")
async def login(body: LoginRequest):
    """Authenticate an officer using Badge ID and password."""
    user = authenticate_user(body.badgeId, body.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Badge ID or password.",
        )
    token = create_access_token({"sub": user["badgeId"]})
    return {
        "token": token,
        "user": {
            "id": user["id"],
            "name": user["name"],
            "badgeId": user["badgeId"],
            "rank": user["rank"],
            "station": user["station"],
            "role": user["role"],
            "email": user.get("email"),
            "phone": user.get("phone"),
        },
    }


@router.post("/logout", response_model=LogoutResponse, summary="Sign out")
async def logout(
    credentials: HTTPAuthorizationCredentials = Depends(bearer),
    current_user: dict = Depends(get_current_user),
):
    """Invalidate the current session token."""
    if credentials:
        blacklist_token(credentials.credentials)
    return {"status": "success", "message": "Session invalidated"}


@router.get("/session", response_model=SessionResponse, summary="Get current session")
async def get_session(current_user: dict = Depends(get_current_user)):
    """Return the profile for the currently authenticated officer."""
    return {
        "id": current_user["id"],
        "name": current_user["name"],
        "badgeId": current_user["badgeId"],
        "rank": current_user["rank"],
        "station": current_user["station"],
        "role": current_user["role"],
    }
