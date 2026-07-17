"""Persistent operational data tables for dashboard workflows."""
from sqlalchemy import Boolean, Column, DateTime, Integer, String, Text
from sqlalchemy.sql import func

from app.core.db import Base


class IncidentRecord(Base):
    __tablename__ = "incidents"

    id = Column(String, primary_key=True, index=True)
    type = Column(String, nullable=False)
    severity = Column(String, nullable=False)
    status = Column(String, nullable=False)
    location_json = Column(Text, nullable=False)
    timestamp = Column(DateTime(timezone=True), nullable=False)
    description = Column(Text, nullable=False)
    source = Column(String, nullable=False)
    assigned_unit_id = Column(String, nullable=True)
    station_id = Column(String, nullable=False)
    timeline_json = Column(Text, nullable=False, default="[]")
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


class PatrolUnitRecord(Base):
    __tablename__ = "patrol_units"

    id = Column(String, primary_key=True, index=True)
    callsign = Column(String, nullable=False)
    officers_json = Column(Text, nullable=False)
    vehicle = Column(String, nullable=False)
    status = Column(String, nullable=False)
    zone = Column(String, nullable=False)
    station_id = Column(String, nullable=False)
    position_json = Column(Text, nullable=False)
    shift_start = Column(String, nullable=False)
    shift_end = Column(String, nullable=False)
    incidents_this_month = Column(Integer, nullable=False, default=0)
    avg_response_time = Column(Integer, nullable=False, default=0)
    sparkline_json = Column(Text, nullable=False, default="[]")
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


class ReportRecord(Base):
    __tablename__ = "reports"

    id = Column(String, primary_key=True, index=True)
    title = Column(String, nullable=False)
    case_id = Column(String, nullable=False, index=True)
    type = Column(String, nullable=False)
    status = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), nullable=False)
    updated_at = Column(DateTime(timezone=True), nullable=False)
    last_edited_by = Column(String, nullable=False)
    sections_json = Column(Text, nullable=False, default="[]")
    version_history_json = Column(Text, nullable=False, default="[]")


class AuditEntryRecord(Base):
    __tablename__ = "audit_entries"

    id = Column(String, primary_key=True, index=True)
    action = Column(String, nullable=False)
    timestamp = Column(DateTime(timezone=True), nullable=False)
    resource = Column(String, nullable=False)
    hash = Column(String, nullable=False)


class UserSettingsRecord(Base):
    __tablename__ = "user_settings"

    user_id = Column(Integer, primary_key=True, index=True)
    preferences_json = Column(Text, nullable=False)
    notification_preferences_json = Column(Text, nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


class NotificationRecord(Base):
    __tablename__ = "notifications"

    id = Column(String, primary_key=True, index=True)
    user_id = Column(Integer, nullable=False, index=True)
    title = Column(String, nullable=False)
    message = Column(Text, nullable=False)
    category = Column(String, nullable=False)
    resource = Column(String, nullable=True)
    read = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime(timezone=True), nullable=False)
