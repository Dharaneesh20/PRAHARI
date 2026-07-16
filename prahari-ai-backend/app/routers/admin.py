from typing import List, Optional
from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.dependencies import require_level_3
from app.core.db import get_auth_db
from app.models.user import User
from app.services.auth_service import _hash_password

router = APIRouter()

class UserCreate(BaseModel):
    name: str
    badgeId: str
    rank: str
    station: str
    role: str
    email: str
    phone: str
    clearance_level: int
    password: str

class UserUpdate(BaseModel):
    name: Optional[str] = None
    rank: Optional[str] = None
    station: Optional[str] = None
    role: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    clearance_level: Optional[int] = None
    password: Optional[str] = None

class UserResponse(BaseModel):
    id: str
    name: str
    badgeId: str
    rank: str
    station: str
    role: str
    email: Optional[str]
    phone: Optional[str]
    clearance_level: int

@router.get("/users", response_model=List[UserResponse], summary="List all users")
async def get_all_users(current_user: User = Depends(require_level_3), db: Session = Depends(get_auth_db)):
    """List all users. Requires Level 3 (Commander) clearance."""
    users = db.query(User).all()
    return [
        UserResponse(
            id=str(u.id),
            name=u.name,
            badgeId=u.badge_id,
            rank=u.rank or "",
            station=u.station or "",
            role=u.role,
            email=u.email,
            phone=u.phone,
            clearance_level=u.clearance_level
        ) for u in users
    ]

@router.post("/users", response_model=UserResponse, summary="Create a new user")
async def create_user(user: UserCreate, current_user: User = Depends(require_level_3), db: Session = Depends(get_auth_db)):
    """Create a new user. Requires Level 3 clearance."""
    if db.query(User).filter(User.badge_id == user.badgeId).first():
        raise HTTPException(status_code=400, detail="User with this badgeId already exists.")
    
    db_user = User(
        name=user.name,
        badge_id=user.badgeId,
        rank=user.rank,
        station=user.station,
        role=user.role,
        email=user.email,
        phone=user.phone,
        clearance_level=user.clearance_level,
        hashed_password=_hash_password(user.password)
    )
    
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    
    return UserResponse(
        id=str(db_user.id),
        name=db_user.name,
        badgeId=db_user.badge_id,
        rank=db_user.rank or "",
        station=db_user.station or "",
        role=db_user.role,
        email=db_user.email,
        phone=db_user.phone,
        clearance_level=db_user.clearance_level
    )

@router.put("/users/{badgeId}", response_model=UserResponse, summary="Update a user")
async def update_user(badgeId: str, user_update: UserUpdate, current_user: User = Depends(require_level_3), db: Session = Depends(get_auth_db)):
    target_user = db.query(User).filter(User.badge_id == badgeId).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")
        
    update_data = user_update.model_dump(exclude_unset=True)
    if "password" in update_data:
        target_user.hashed_password = _hash_password(update_data.pop("password"))
        
    # Map badgeId to badge_id
    if "badgeId" in update_data:
        target_user.badge_id = update_data.pop("badgeId")
        
    for k, v in update_data.items():
        setattr(target_user, k, v)
        
    db.commit()
    db.refresh(target_user)
    
    return UserResponse(
        id=str(target_user.id),
        name=target_user.name,
        badgeId=target_user.badge_id,
        rank=target_user.rank or "",
        station=target_user.station or "",
        role=target_user.role,
        email=target_user.email,
        phone=target_user.phone,
        clearance_level=target_user.clearance_level
    )

@router.delete("/users/{badgeId}", summary="Delete a user")
async def delete_user(badgeId: str, current_user: User = Depends(require_level_3), db: Session = Depends(get_auth_db)):
    target_user = db.query(User).filter(User.badge_id == badgeId).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")
        
    # Prevent deleting oneself
    if current_user.badge_id == badgeId:
        raise HTTPException(status_code=400, detail="Cannot delete your own account.")
        
    db.delete(target_user)
    db.commit()
    return {"status": "success", "message": f"User {badgeId} deleted."}
