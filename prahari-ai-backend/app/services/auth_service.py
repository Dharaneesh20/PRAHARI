"""
JWT token encode/decode and user authentication service.
Uses a simple in-memory user store seeded with realistic Karnataka police data.
Uses hashlib SHA-256 for demo password hashing to avoid bcrypt version issues.
"""
import hashlib
from datetime import datetime, timedelta, timezone
from typing import Optional

from jose import JWTError, jwt

from app.config import settings


def _hash_password(plain: str) -> str:
    """Simple SHA-256 hash for demo purposes. Replace with bcrypt in production."""
    return hashlib.sha256(plain.encode()).hexdigest()


# Password for all demo users: "prahari@2026"
_HASHED_PASSWORD = _hash_password("prahari@2026")

USERS_DB: dict[str, dict] = {
    "KSP-INS-8921": {
        "id": "USR-001",
        "name": "Inspector Rajesh Kumar",
        "badgeId": "KSP-INS-8921",
        "rank": "Police Inspector",
        "station": "Koramangala Police Station",
        "role": "Investigator",
        "email": "raj.kumar@ksp.gov.in",
        "phone": "+91-94481-11111",
        "clearance_level": 1,
        "hashed_password": _HASHED_PASSWORD,
    },
    "KSP-SI-4412": {
        "id": "USR-002",
        "name": "Sub-Inspector Priya Nair",
        "badgeId": "KSP-SI-4412",
        "rank": "Sub-Inspector",
        "station": "MG Road Police Station",
        "role": "Dispatcher",
        "email": "priya.nair@ksp.gov.in",
        "phone": "+91-94482-22222",
        "clearance_level": 1,
        "hashed_password": _HASHED_PASSWORD,
    },
    "KSP-DSP-0071": {
        "id": "USR-003",
        "name": "DSP Arvind Shankar",
        "badgeId": "KSP-DSP-0071",
        "rank": "DySP",
        "station": "Central Division HQ",
        "role": "Supervisor",
        "email": "a.shankar@ksp.gov.in",
        "phone": "+91-94483-33333",
        "clearance_level": 2,
        "hashed_password": _HASHED_PASSWORD,
    },
    "KSP-HC-3301": {
        "id": "USR-004",
        "name": "HC Suresh Patil",
        "badgeId": "KSP-HC-3301",
        "rank": "Head Constable",
        "station": "Banashankari Police Station",
        "role": "Patrol",
        "email": "s.patil@ksp.gov.in",
        "phone": "+91-94484-44444",
        "clearance_level": 1,
        "hashed_password": _HASHED_PASSWORD,
    },
    "KSP-ACP-0002": {
        "id": "USR-005",
        "name": "ACP Meera Desai",
        "badgeId": "KSP-ACP-0002",
        "rank": "ACP",
        "station": "South Division HQ",
        "role": "Analyst",
        "email": "m.desai@ksp.gov.in",
        "phone": "+91-94485-55555",
        "clearance_level": 2,
        "hashed_password": _HASHED_PASSWORD,
    },
    "KSP-IGP-9999": {
        "id": "USR-006",
        "name": "IGP Prakash Rao",
        "badgeId": "KSP-IGP-9999",
        "rank": "IGP",
        "station": "State Police HQ",
        "role": "Commander",
        "email": "p.rao@ksp.gov.in",
        "phone": "+91-94486-66666",
        "clearance_level": 3,
        "hashed_password": _HASHED_PASSWORD,
    },
}

# Simple token blacklist (for logout)
_BLACKLISTED_TOKENS: set[str] = set()


def verify_password(plain: str, hashed: str) -> bool:
    return _hash_password(plain) == hashed


def authenticate_user(badge_id: str, password: str) -> Optional[dict]:
    user = USERS_DB.get(badge_id)
    if not user:
        return None
    if not verify_password(password, user["hashed_password"]):
        return None
    return user


def create_access_token(data: dict) -> str:
    payload = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    payload.update({"exp": expire})
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def decode_token(token: str) -> Optional[dict]:
    if token in _BLACKLISTED_TOKENS:
        return None
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        badge_id: str = payload.get("sub")
        if badge_id is None:
            return None
        return USERS_DB.get(badge_id)
    except JWTError:
        return None


def blacklist_token(token: str) -> None:
    _BLACKLISTED_TOKENS.add(token)


def update_user_profile(badge_id: str, email: Optional[str], phone: Optional[str]) -> dict:
    user = USERS_DB.get(badge_id)
    if not user:
        return {}
    if email is not None:
        user["email"] = email
    if phone is not None:
        user["phone"] = phone
    return {"email": user.get("email"), "phone": user.get("phone")}
