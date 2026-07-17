"""Database-backed operational data service."""
import hashlib
import json
from datetime import datetime, timedelta, timezone
from typing import Optional

from sqlalchemy.orm import Session

from app.models.operational import (
    AuditEntryRecord,
    IncidentRecord,
    NotificationRecord,
    PatrolUnitRecord,
    ReportRecord,
    UserSettingsRecord,
)
from app.models.user import User
from app.services import seed_data


DEFAULT_PREFERENCES = {
    "density": "comfortable",
    "reduceMotion": False,
    "soundAlerts": True,
    "language": "en",
    "syncFilters": False,
}

DEFAULT_NOTIFICATION_PREFERENCES = {
    "newIncident": True,
    "assignedCase": True,
    "reportReady": True,
    "systemAlerts": True,
    "channels": {"inApp": True, "email": True, "sms": False},
}


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _hash(seed: str) -> str:
    return "0x" + hashlib.sha256(seed.encode()).hexdigest()[:12].upper()


def _loads(value: str, fallback):
    try:
        return json.loads(value)
    except (TypeError, json.JSONDecodeError):
        return fallback


def _parse_dt(value) -> datetime:
    if isinstance(value, datetime):
        return value
    return datetime.fromisoformat(str(value).replace("Z", "+00:00"))


def seed_operational_db(db: Session) -> None:
    if db.query(IncidentRecord).first() is None:
        for item in seed_data.INCIDENTS:
            db.add(IncidentRecord(
                id=item["id"],
                type=item["type"],
                severity=item["severity"],
                status=item["status"],
                location_json=json.dumps(item["location"]),
                timestamp=_parse_dt(item["timestamp"]),
                description=item["description"],
                source=item["source"],
                assigned_unit_id=item.get("assignedUnitId"),
                station_id=item["stationId"],
                timeline_json=json.dumps(item.get("timeline", [])),
            ))

    if db.query(PatrolUnitRecord).first() is None:
        for item in seed_data.UNITS:
            db.add(PatrolUnitRecord(
                id=item["id"],
                callsign=item["callsign"],
                officers_json=json.dumps(item["officers"]),
                vehicle=item["vehicle"],
                status=item["status"],
                zone=item["zone"],
                station_id=item["stationId"],
                position_json=json.dumps(item["position"]),
                shift_start=item["shiftStart"],
                shift_end=item["shiftEnd"],
                incidents_this_month=item["incidentsThisMonth"],
                avg_response_time=item["avgResponseTime"],
                sparkline_json=json.dumps(item["sparkline"]),
            ))

    if db.query(ReportRecord).first() is None:
        for item in seed_data.REPORTS:
            db.add(ReportRecord(
                id=item["id"],
                title=item["title"],
                case_id=item["caseId"],
                type=item["type"],
                status=item["status"],
                created_at=_parse_dt(item["createdAt"]),
                updated_at=_parse_dt(item["updatedAt"]),
                last_edited_by=item["lastEditedBy"],
                sections_json=json.dumps(item["sections"]),
                version_history_json=json.dumps(item.get("versionHistory", [])),
            ))

    if db.query(AuditEntryRecord).first() is None:
        for item in seed_data.get_audit_log():
            db.add(AuditEntryRecord(
                id=item["id"],
                action=item["action"],
                timestamp=_parse_dt(item["timestamp"]),
                resource=item["resource"],
                hash=item["hash"],
            ))

    if db.query(User).first() and db.query(NotificationRecord).first() is None:
        for user in db.query(User).all():
            db.add(NotificationRecord(
                id=f"NTF-{user.id}-001",
                user_id=user.id,
                title="Active incident queue",
                message="Open incidents are ready for operational review.",
                category="newIncident",
                resource="INCIDENTS",
                read=False,
                created_at=_now() - timedelta(minutes=18),
            ))
            db.add(NotificationRecord(
                id=f"NTF-{user.id}-002",
                user_id=user.id,
                title="Daily dashboard refreshed",
                message="KPI summary, patrol status, and hotspot rankings are updated.",
                category="systemAlerts",
                resource="KPI",
                read=False,
                created_at=_now() - timedelta(hours=1),
            ))

    db.commit()


def incident_to_dict(row: IncidentRecord) -> dict:
    return {
        "id": row.id,
        "type": row.type,
        "severity": row.severity,
        "status": row.status,
        "location": _loads(row.location_json, {}),
        "timestamp": row.timestamp,
        "description": row.description,
        "source": row.source,
        "assignedUnitId": row.assigned_unit_id,
        "stationId": row.station_id,
        "timeline": _loads(row.timeline_json, []),
    }


def list_incidents(db: Session, severity: str = "all", status: str = "all") -> list[dict]:
    query = db.query(IncidentRecord)
    if severity != "all":
        query = query.filter(IncidentRecord.severity == severity)
    if status != "all":
        query = query.filter(IncidentRecord.status == status)
    return [incident_to_dict(row) for row in query.order_by(IncidentRecord.timestamp.desc()).all()]


def get_incident(db: Session, incident_id: str) -> Optional[IncidentRecord]:
    return db.query(IncidentRecord).filter(IncidentRecord.id == incident_id).first()


def update_incident_status(db: Session, incident_id: str, status: str, actor: str) -> Optional[dict]:
    row = get_incident(db, incident_id)
    if row is None:
        return None
    timeline = _loads(row.timeline_json, [])
    timeline.append({"time": _now().isoformat(), "action": f"Status updated to {status}", "by": actor})
    row.status = status
    row.timeline_json = json.dumps(timeline)
    add_audit_entry(db, f"Updated incident status to {status}", incident_id)
    db.commit()
    db.refresh(row)
    return incident_to_dict(row)


def assign_unit_to_incident(db: Session, incident_id: str, unit_id: str, actor: str) -> Optional[dict]:
    row = get_incident(db, incident_id)
    unit = db.query(PatrolUnitRecord).filter(PatrolUnitRecord.id == unit_id).first()
    if row is None or unit is None:
        return None
    timeline = _loads(row.timeline_json, [])
    timeline.append({"time": _now().isoformat(), "action": f"{unit_id} assigned to incident", "by": actor})
    row.assigned_unit_id = unit_id
    row.status = "dispatched"
    row.timeline_json = json.dumps(timeline)
    unit.status = "dispatched"
    add_audit_entry(db, f"Assigned {unit_id} to {incident_id}", incident_id)
    db.commit()
    db.refresh(row)
    return incident_to_dict(row)


def unit_to_dict(row: PatrolUnitRecord) -> dict:
    return {
        "id": row.id,
        "callsign": row.callsign,
        "officers": _loads(row.officers_json, []),
        "vehicle": row.vehicle,
        "status": row.status,
        "zone": row.zone,
        "stationId": row.station_id,
        "position": _loads(row.position_json, {}),
        "shiftStart": row.shift_start,
        "shiftEnd": row.shift_end,
        "incidentsThisMonth": row.incidents_this_month,
        "avgResponseTime": row.avg_response_time,
        "sparkline": _loads(row.sparkline_json, []),
    }


def list_units(db: Session) -> list[dict]:
    return [unit_to_dict(row) for row in db.query(PatrolUnitRecord).order_by(PatrolUnitRecord.id).all()]


def update_unit_status(db: Session, unit_id: str, status: str) -> Optional[dict]:
    row = db.query(PatrolUnitRecord).filter(PatrolUnitRecord.id == unit_id).first()
    if row is None:
        return None
    row.status = status
    add_audit_entry(db, f"Updated unit status to {status}", unit_id)
    db.commit()
    db.refresh(row)
    return unit_to_dict(row)


def report_to_dict(row: ReportRecord) -> dict:
    return {
        "id": row.id,
        "title": row.title,
        "caseId": row.case_id,
        "type": row.type,
        "status": row.status,
        "createdAt": row.created_at,
        "updatedAt": row.updated_at,
        "lastEditedBy": row.last_edited_by,
        "sections": _loads(row.sections_json, []),
        "versionHistory": _loads(row.version_history_json, []),
    }


def list_reports(db: Session) -> list[dict]:
    return [report_to_dict(row) for row in db.query(ReportRecord).order_by(ReportRecord.updated_at.desc()).all()]


def update_report(db: Session, report_id: str, title: Optional[str], sections: Optional[list], actor: str) -> Optional[dict]:
    row = db.query(ReportRecord).filter(ReportRecord.id == report_id).first()
    if row is None:
        return None
    if title is not None:
        row.title = title
    if sections is not None:
        row.sections_json = json.dumps(sections)
    row.updated_at = _now()
    row.last_edited_by = actor
    history = _loads(row.version_history_json, [])
    history.append({
        "version": len(history) + 1,
        "editedAt": row.updated_at.isoformat(),
        "editedBy": actor,
        "note": "Manual edit saved from report builder",
    })
    row.version_history_json = json.dumps(history)
    add_audit_entry(db, "Updated report", report_id)
    db.commit()
    db.refresh(row)
    return report_to_dict(row)


def add_audit_entry(db: Session, action: str, resource: str) -> dict:
    count = db.query(AuditEntryRecord).count() + 1
    entry_id = f"AUD-{count:03d}"
    row = AuditEntryRecord(
        id=entry_id,
        action=action,
        timestamp=_now(),
        resource=resource,
        hash=_hash(f"{entry_id}:{action}:{resource}"),
    )
    db.add(row)
    return audit_to_dict(row)


def audit_to_dict(row: AuditEntryRecord) -> dict:
    return {
        "id": row.id,
        "action": row.action,
        "timestamp": row.timestamp,
        "resource": row.resource,
        "hash": row.hash,
    }


def list_audit_entries(db: Session) -> list[dict]:
    return [audit_to_dict(row) for row in db.query(AuditEntryRecord).order_by(AuditEntryRecord.timestamp.desc()).all()]


def get_or_create_user_settings(db: Session, user_id: int) -> UserSettingsRecord:
    row = db.query(UserSettingsRecord).filter(UserSettingsRecord.user_id == user_id).first()
    if row is None:
        row = UserSettingsRecord(
            user_id=user_id,
            preferences_json=json.dumps(DEFAULT_PREFERENCES),
            notification_preferences_json=json.dumps(DEFAULT_NOTIFICATION_PREFERENCES),
        )
        db.add(row)
        db.commit()
        db.refresh(row)
    return row


def get_settings(db: Session, user_id: int) -> dict:
    row = get_or_create_user_settings(db, user_id)
    return {
        "preferences": _loads(row.preferences_json, DEFAULT_PREFERENCES),
        "notificationPreferences": _loads(row.notification_preferences_json, DEFAULT_NOTIFICATION_PREFERENCES),
    }


def update_settings(db: Session, user_id: int, preferences: Optional[dict], notification_preferences: Optional[dict]) -> dict:
    row = get_or_create_user_settings(db, user_id)
    if preferences is not None:
        row.preferences_json = json.dumps({**DEFAULT_PREFERENCES, **preferences})
    if notification_preferences is not None:
        current = _loads(row.notification_preferences_json, DEFAULT_NOTIFICATION_PREFERENCES)
        merged_channels = {**DEFAULT_NOTIFICATION_PREFERENCES["channels"], **current.get("channels", {})}
        incoming_channels = (notification_preferences or {}).get("channels", {})
        row.notification_preferences_json = json.dumps({
            **DEFAULT_NOTIFICATION_PREFERENCES,
            **current,
            **notification_preferences,
            "channels": {**merged_channels, **incoming_channels},
        })
    add_audit_entry(db, "Updated user settings", "SETTINGS")
    db.commit()
    return get_settings(db, user_id)


def notification_to_dict(row: NotificationRecord) -> dict:
    return {
        "id": row.id,
        "title": row.title,
        "message": row.message,
        "category": row.category,
        "resource": row.resource,
        "read": row.read,
        "createdAt": row.created_at,
    }


def list_notifications(db: Session, user_id: int) -> list[dict]:
    rows = db.query(NotificationRecord).filter(NotificationRecord.user_id == user_id).order_by(NotificationRecord.created_at.desc()).all()
    return [notification_to_dict(row) for row in rows]


def unread_notification_count(db: Session, user_id: int) -> int:
    return db.query(NotificationRecord).filter(NotificationRecord.user_id == user_id, NotificationRecord.read.is_(False)).count()


def mark_notification_read(db: Session, user_id: int, notification_id: str) -> Optional[dict]:
    row = db.query(NotificationRecord).filter(NotificationRecord.user_id == user_id, NotificationRecord.id == notification_id).first()
    if row is None:
        return None
    row.read = True
    db.commit()
    db.refresh(row)
    return notification_to_dict(row)


def delete_notification(db: Session, user_id: int, notification_id: str) -> bool:
    row = db.query(NotificationRecord).filter(NotificationRecord.user_id == user_id, NotificationRecord.id == notification_id).first()
    if row is None:
        return False
    db.delete(row)
    db.commit()
    return True
