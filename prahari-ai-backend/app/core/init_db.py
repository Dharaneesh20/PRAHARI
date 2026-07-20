import logging
from sqlalchemy import inspect, text
from sqlalchemy.orm import Session
from app.core.db import engine, Base
from app.models.user import User
from app.models.chat import ChatSession, ChatMessage
from app.models.operational import (
    AuditEntryRecord,
    IncidentRecord,
    NotificationRecord,
    PatrolUnitRecord,
    ReportRecord,
    UserSettingsRecord,
)
from app.services.auth_service import _hash_password
from app.services.operational_store import seed_operational_db

logger = logging.getLogger(__name__)

# Password for all demo users: "prahari@2026"
_HASHED_PASSWORD = _hash_password("prahari@2026")

_DEFAULT_USERS = [
    {
        "badge_id": "KSP-INS-8921",
        "name": "Inspector Rajesh Kumar",
        "email": "raj.kumar@ksp.gov.in",
        "phone": "+91-94481-11111",
        "hashed_password": _HASHED_PASSWORD,
        "role": "Investigator",
        "rank": "Police Inspector",
        "clearance_level": 1,
        "department": "Karnataka State Police",
        "district": "Bengaluru City",
        "station": "Koramangala Police Station",
    },
    {
        "badge_id": "KSP-SI-4412",
        "name": "Sub-Inspector Priya Nair",
        "email": "priya.nair@ksp.gov.in",
        "phone": "+91-94482-22222",
        "hashed_password": _HASHED_PASSWORD,
        "role": "Dispatcher",
        "rank": "Sub-Inspector",
        "clearance_level": 1,
        "department": "Karnataka State Police",
        "district": "Bengaluru City",
        "station": "MG Road Police Station",
    },
    {
        "badge_id": "KSP-DSP-0071",
        "name": "DSP Arvind Shankar",
        "email": "a.shankar@ksp.gov.in",
        "phone": "+91-94483-33333",
        "hashed_password": _HASHED_PASSWORD,
        "role": "Supervisor",
        "rank": "DySP",
        "clearance_level": 2,
        "department": "Karnataka State Police",
        "district": "Bengaluru City",
        "station": "Central Division HQ",
    },
    {
        "badge_id": "KSP-HC-3301",
        "name": "HC Suresh Patil",
        "email": "s.patil@ksp.gov.in",
        "phone": "+91-94484-44444",
        "hashed_password": _HASHED_PASSWORD,
        "role": "Patrol",
        "rank": "Head Constable",
        "clearance_level": 1,
        "department": "Karnataka State Police",
        "district": "Bengaluru City",
        "station": "Banashankari Police Station",
    },
    {
        "badge_id": "KSP-ACP-0002",
        "name": "ACP Meera Desai",
        "email": "m.desai@ksp.gov.in",
        "phone": "+91-94485-55555",
        "hashed_password": _HASHED_PASSWORD,
        "role": "Analyst",
        "rank": "ACP",
        "clearance_level": 2,
        "department": "Karnataka State Police",
        "district": "Bengaluru City",
        "station": "South Division HQ",
    },
    {
        "badge_id": "KSP-ACP-4022",
        "name": "ACP Meera Desai (Senior Officer)",
        "email": "acp.south@ksp.gov.in",
        "phone": "+91-94485-40220",
        "hashed_password": _HASHED_PASSWORD,
        "role": "Senior Officer",
        "rank": "ACP",
        "clearance_level": 2,
        "department": "Karnataka State Police",
        "district": "Bengaluru City",
        "station": "ACP Command Office",
    },
    {
        "badge_id": "KSP-IGP-9999",
        "name": "IGP Prakash Rao",
        "email": "p.rao@ksp.gov.in",
        "phone": "+91-94486-66666",
        "hashed_password": _HASHED_PASSWORD,
        "role": "Super Admin",
        "rank": "IGP",
        "clearance_level": 3,
        "department": "Karnataka State Police",
        "district": "Karnataka State",
        "station": "State Police HQ",
    },
]

def _ensure_user_profile_columns() -> None:
    inspector = inspect(engine)
    if not inspector.has_table("users"):
        return

    existing = {column["name"] for column in inspector.get_columns("users")}
    additions = {
        "username": "ALTER TABLE users ADD COLUMN username VARCHAR",
        "bio": "ALTER TABLE users ADD COLUMN bio VARCHAR",
        "avatar": "ALTER TABLE users ADD COLUMN avatar VARCHAR",
    }
    with engine.begin() as conn:
        for column, statement in additions.items():
            if column not in existing:
                conn.execute(text(statement))

def init_auth_db(db: Session) -> None:
    # Create all tables in the engine. This is equivalent to "Create Table If Not Exists"
    Base.metadata.create_all(bind=engine)
    _ensure_user_profile_columns()
    
    # Ensure all demo users exist and have updated passwords
    logger.info("Ensuring demo users exist in Auth Database...")
    for u in _DEFAULT_USERS:
        existing = db.query(User).filter(User.badge_id == u["badge_id"]).first()
        if not existing:
            db_user = User(**u)
            db.add(db_user)
        else:
            existing.hashed_password = u["hashed_password"]
            existing.clearance_level = u["clearance_level"]
    db.commit()
    logger.info("Successfully verified and seeded all demo users.")

    seed_operational_db(db)
