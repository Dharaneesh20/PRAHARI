"""
JWT token encode/decode and user authentication service.
Now backed by SQLite via SQLAlchemy.
"""
import hashlib
from datetime import datetime, timedelta, timezone
from typing import Optional
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from app.config import settings
from app.models.user import User

# Simple token blacklist (for logout in this hackathon)
_BLACKLISTED_TOKENS: set[str] = set()

def _hash_password(plain: str) -> str:
    """Simple SHA-256 hash for demo purposes. Replace with bcrypt in production."""
    return hashlib.sha256(plain.encode()).hexdigest()

def verify_password(plain: str, hashed: str) -> bool:
    return _hash_password(plain) == hashed

def authenticate_user(db: Session, badge_id: str, password: str) -> Optional[User]:
    user = db.query(User).filter(User.badge_id == badge_id).first()
    if not user:
        return None
    if not verify_password(password, user.hashed_password):
        return None
    return user

def create_access_token(data: dict) -> str:
    payload = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    payload.update({"exp": expire})
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)

def decode_token(token: str, db: Session) -> Optional[User]:
    if token in _BLACKLISTED_TOKENS:
        return None
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        badge_id: str = payload.get("sub")
        if badge_id is None:
            return None
        return db.query(User).filter(User.badge_id == badge_id).first()
    except JWTError:
        return None

def blacklist_token(token: str) -> None:
    _BLACKLISTED_TOKENS.add(token)

def get_user_by_badge(db: Session, badge_id: str) -> Optional[User]:
    return db.query(User).filter(User.badge_id == badge_id).first()

def get_users(db: Session, skip: int = 0, limit: int = 100):
    return db.query(User).offset(skip).limit(limit).all()

def update_user_profile(
    db: Session,
    badge_id: str,
    name: Optional[str] = None,
    username: Optional[str] = None,
    email: Optional[str] = None,
    phone: Optional[str] = None,
    bio: Optional[str] = None,
    avatar: Optional[str] = None,
) -> Optional[User]:
    user = get_user_by_badge(db, badge_id)
    if not user:
        return None
    if name is not None:
        user.name = name.strip()
    if username is not None:
        user.username = username.strip() or None
    if email is not None:
        user.email = email.strip() or None
    if phone is not None:
        user.phone = phone.strip() or None
    if bio is not None:
        user.bio = bio.strip() or None
    if avatar is not None:
        user.avatar = avatar.strip() or None
    db.commit()
    db.refresh(user)
    return user
