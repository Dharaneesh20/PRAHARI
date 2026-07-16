from sqlalchemy import Column, Integer, String, Boolean, DateTime
from sqlalchemy.sql import func
from app.core.db import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    badge_id = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=True)
    phone = Column(String, nullable=True)
    hashed_password = Column(String, nullable=False)
    
    # RBAC attributes
    role = Column(String, nullable=False, default="Level 1 Officer")
    clearance_level = Column(Integer, nullable=False, default=1)
    
    # Profile information
    rank = Column(String, nullable=True)
    department = Column(String, nullable=True)
    district = Column(String, nullable=True)
    station = Column(String, nullable=True)
    avatar = Column(String, nullable=True)
    
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
