"""
Prahari AI Backend — Auth Dependencies
JWT Bearer token validation for protected endpoints.
"""
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from app.services.auth_service import decode_token
from app.core.db import get_auth_db
from app.models.user import User

bearer_scheme = HTTPBearer(auto_error=False)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Session = Depends(get_auth_db)
) -> User:
    """
    FastAPI dependency that validates the Bearer JWT and returns the User model.
    Raises HTTP 401 if the token is missing or invalid.
    """
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Provide a Bearer token.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user = decode_token(credentials.credentials, db)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user


class RoleChecker:
    """
    Dependency for Role-Based Access Control.
    Checks if the current user has a sufficient clearance level.
    Levels:
      3: Commander (DG & IGP, ADGP, IGP, DIG)
      2: Senior Officer (SP, DCP, Addl. SP, ASP / DySP, ACP)
      1: Field Officer (CPI, PSI, ASI, HC, PC)
    """
    def __init__(self, required_level: int):
        self.required_level = required_level

    def __call__(self, user: User = Depends(get_current_user)) -> User:
        user_level = user.clearance_level
        if user_level < self.required_level:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Insufficient clearance. Level {self.required_level} required.",
            )
        return user


require_level_1 = RoleChecker(1)
require_level_2 = RoleChecker(2)
require_level_3 = RoleChecker(3)

