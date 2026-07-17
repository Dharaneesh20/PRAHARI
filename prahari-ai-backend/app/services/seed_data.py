"""
Initial operational seed records.
Seeds incidents, patrol units, KPI metrics, reports, and audit entries
matching the frontend API contract.
"""
import hashlib
import random
from copy import deepcopy
from datetime import datetime, timedelta, timezone

# ─── Helpers ─────────────────────────────────────────────────────────────────
def _now() -> datetime:
    return datetime.now(timezone.utc)

def _dt(hours_ago: int = 0) -> datetime:
    return _now() - timedelta(hours=hours_ago)

def _iso(dt: datetime) -> str:
    return dt.isoformat()

def _seed_hash(seed: str) -> str:
    return "0x" + hashlib.sha256(seed.encode()).hexdigest()[:12].upper()


# ─── Incidents ────────────────────────────────────────────────────────────────
INCIDENTS: list[dict] = [
    {
        "id": "INC-001",
        "type": "Assault",
        "severity": "critical",
        "status": "in-progress",
        "location": {"lat": 12.9716, "lng": 77.5946, "zone": "Koramangala", "address": "80 Feet Rd, Koramangala 4th Block"},
        "timestamp": _iso(_dt(2)),
        "description": "Armed assault reported near commercial complex. Suspect armed with blunt object.",
        "source": "citizen",
        "assignedUnitId": "UNIT-03",
        "stationId": "STN-BLR-01",
        "timeline": [
            {"time": _iso(_dt(2)), "action": "Incident reported via emergency line", "by": "System"},
            {"time": _iso(_dt(1, )), "action": "UNIT-03 dispatched", "by": "Dispatcher Priya Nair"},
        ],
    },
    {
        "id": "INC-002",
        "type": "Theft",
        "severity": "high",
        "status": "new",
        "location": {"lat": 12.9783, "lng": 77.6408, "zone": "Indiranagar", "address": "100 Feet Road, Indiranagar"},
        "timestamp": _iso(_dt(1)),
        "description": "Motorcycle theft reported from parking lot. Vehicle: KA-05-MJ-4521.",
        "source": "citizen",
        "assignedUnitId": None,
        "stationId": "STN-BLR-02",
        "timeline": [
            {"time": _iso(_dt(1)), "action": "Incident reported via Prahari app", "by": "System"},
        ],
    },
    {
        "id": "INC-003",
        "type": "Chain Snatching",
        "severity": "high",
        "status": "dispatched",
        "location": {"lat": 12.9352, "lng": 77.6245, "zone": "BTM Layout", "address": "BTM 2nd Stage, Near Madiwala Lake"},
        "timestamp": _iso(_dt(3)),
        "description": "Gold chain snatching incident. Suspect on red scooter fled towards Silk Board.",
        "source": "citizen",
        "assignedUnitId": "UNIT-05",
        "stationId": "STN-BLR-03",
        "timeline": [
            {"time": _iso(_dt(3)), "action": "Incident reported", "by": "System"},
            {"time": _iso(_dt(2, )), "action": "UNIT-05 dispatched to scene", "by": "Dispatcher"},
        ],
    },
    {
        "id": "INC-004",
        "type": "Cyber Crime",
        "severity": "medium",
        "status": "in-progress",
        "location": {"lat": 12.9698, "lng": 77.7500, "zone": "Whitefield", "address": "ITPL Main Road, Whitefield"},
        "timestamp": _iso(_dt(5)),
        "description": "Online banking fraud. Victim reports Rs. 3.2 lakhs transferred without consent.",
        "source": "citizen",
        "assignedUnitId": "UNIT-07",
        "stationId": "STN-BLR-04",
        "timeline": [
            {"time": _iso(_dt(5)), "action": "Complaint received at station", "by": "HC Suresh P"},
            {"time": _iso(_dt(4)), "action": "Cyber cell assigned", "by": "Inspector Rajesh Kumar"},
        ],
    },
    {
        "id": "INC-005",
        "type": "Robbery",
        "severity": "critical",
        "status": "resolved",
        "location": {"lat": 12.9141, "lng": 77.6101, "zone": "Banashankari", "address": "Banashankari Temple Road"},
        "timestamp": _iso(_dt(10)),
        "description": "Armed robbery at jewellery shop. Three suspects, one arrested, two absconding.",
        "source": "patrol",
        "assignedUnitId": "UNIT-01",
        "stationId": "STN-BLR-07",
        "timeline": [
            {"time": _iso(_dt(10)), "action": "Patrol unit spotted incident", "by": "UNIT-01"},
            {"time": _iso(_dt(9)), "action": "Backup requested", "by": "HC Suresh Patil"},
            {"time": _iso(_dt(8)), "action": "One suspect arrested", "by": "Inspector Rajesh Kumar"},
            {"time": _iso(_dt(7)), "action": "Case marked resolved — FIR filed", "by": "System"},
        ],
    },
    {
        "id": "INC-006",
        "type": "Drunk Driving",
        "severity": "medium",
        "status": "resolved",
        "location": {"lat": 12.9719, "lng": 77.5937, "zone": "MG Road", "address": "MG Road, Near Trinity Circle"},
        "timestamp": _iso(_dt(12)),
        "description": "Vehicle driving erratically on MG Road. Driver tested positive for alcohol.",
        "source": "patrol",
        "assignedUnitId": "UNIT-02",
        "stationId": "STN-BLR-05",
        "timeline": [
            {"time": _iso(_dt(12)), "action": "Patrol stopped vehicle", "by": "UNIT-02"},
            {"time": _iso(_dt(11)), "action": "Breathalyser test conducted — positive", "by": "SI Priya Nair"},
            {"time": _iso(_dt(10)), "action": "Driver arrested, vehicle impounded", "by": "System"},
        ],
    },
    {
        "id": "INC-007",
        "type": "House Breaking",
        "severity": "high",
        "status": "in-progress",
        "location": {"lat": 13.0358, "lng": 77.5970, "zone": "Hebbal", "address": "Nagawara Ring Road, Hebbal"},
        "timestamp": _iso(_dt(6)),
        "description": "Residential burglary. Valuables and electronics stolen. Neighbours heard noises at 02:00 hrs.",
        "source": "citizen",
        "assignedUnitId": "UNIT-04",
        "stationId": "STN-BLR-06",
        "timeline": [
            {"time": _iso(_dt(6)), "action": "Complaint registered", "by": "System"},
            {"time": _iso(_dt(5)), "action": "Scene inspected, forensics called", "by": "Inspector Rajesh Kumar"},
        ],
    },
    {
        "id": "INC-008",
        "type": "Traffic Accident",
        "severity": "high",
        "status": "dispatched",
        "location": {"lat": 12.9279, "lng": 77.6271, "zone": "Silk Board", "address": "Silk Board Junction, Hosur Road"},
        "timestamp": _iso(_dt(1)),
        "description": "Multi-vehicle accident at Silk Board junction. 2 injured, road partially blocked.",
        "source": "cctv",
        "assignedUnitId": "UNIT-06",
        "stationId": "STN-BLR-08",
        "timeline": [
            {"time": _iso(_dt(1)), "action": "CCTV alert triggered", "by": "AI System"},
            {"time": _iso(_dt(0, )), "action": "UNIT-06 dispatched", "by": "Dispatcher"},
        ],
    },
    {
        "id": "INC-009",
        "type": "Missing Person",
        "severity": "critical",
        "status": "in-progress",
        "location": {"lat": 12.9926, "lng": 77.5930, "zone": "Rajajinagar", "address": "Rajajinagar 5th Block"},
        "timestamp": _iso(_dt(14)),
        "description": "Missing child (age 8). Last seen near Rajajinagar park at 16:00 hrs. Search teams deployed.",
        "source": "citizen",
        "assignedUnitId": "UNIT-01",
        "stationId": "STN-BLR-09",
        "timeline": [
            {"time": _iso(_dt(14)), "action": "Missing person report filed", "by": "System"},
            {"time": _iso(_dt(13)), "action": "Search party organised — 3 teams", "by": "DSP Arvind Shankar"},
            {"time": _iso(_dt(12)), "action": "CCTV footage being reviewed", "by": "Cyber Cell"},
        ],
    },
    {
        "id": "INC-010",
        "type": "Domestic Violence",
        "severity": "high",
        "status": "resolved",
        "location": {"lat": 12.9801, "lng": 77.5882, "zone": "Shivajinagar", "address": "Museum Road, Shivajinagar"},
        "timestamp": _iso(_dt(20)),
        "description": "Domestic violence complaint. Victim provided shelter; accused arrested under Sec 498A IPC.",
        "source": "citizen",
        "assignedUnitId": "UNIT-03",
        "stationId": "STN-BLR-10",
        "timeline": [
            {"time": _iso(_dt(20)), "action": "Emergency call received", "by": "System"},
            {"time": _iso(_dt(19)), "action": "UNIT-03 responded to scene", "by": "SI Priya Nair"},
            {"time": _iso(_dt(18)), "action": "Accused arrested", "by": "Inspector Rajesh Kumar"},
            {"time": _iso(_dt(17)), "action": "Victim transferred to shelter home", "by": "Social Welfare"},
        ],
    },
]


# ─── Patrol Units ─────────────────────────────────────────────────────────────
UNITS: list[dict] = [
    {
        "id": "UNIT-01", "callsign": "KSP-Alpha-01",
        "officers": ["Inspector Rajesh Kumar", "HC Suresh Patil"],
        "vehicle": "Bolero (KA-51-G-1234)", "status": "responding",
        "zone": "Banashankari", "stationId": "STN-BLR-07",
        "position": {"lat": 12.9141, "lng": 77.6101},
        "shiftStart": "06:00", "shiftEnd": "14:00",
        "incidentsThisMonth": 28, "avgResponseTime": 7.2,
        "sparkline": [4, 3, 5, 2, 4, 6, 4],
    },
    {
        "id": "UNIT-02", "callsign": "KSP-Bravo-02",
        "officers": ["SI Priya Nair", "PC Ramu K"],
        "vehicle": "Thar (KA-01-P-5678)", "status": "on-patrol",
        "zone": "MG Road", "stationId": "STN-BLR-05",
        "position": {"lat": 12.9752, "lng": 77.6093},
        "shiftStart": "14:00", "shiftEnd": "22:00",
        "incidentsThisMonth": 21, "avgResponseTime": 6.8,
        "sparkline": [3, 4, 2, 5, 3, 4, 5],
    },
    {
        "id": "UNIT-03", "callsign": "KSP-Charlie-03",
        "officers": ["HC Mohan R", "PC Deepa S"],
        "vehicle": "Scorpio (KA-03-M-9012)", "status": "responding",
        "zone": "Koramangala", "stationId": "STN-BLR-01",
        "position": {"lat": 12.9352, "lng": 77.6245},
        "shiftStart": "22:00", "shiftEnd": "06:00",
        "incidentsThisMonth": 33, "avgResponseTime": 8.1,
        "sparkline": [5, 6, 4, 7, 5, 6, 8],
    },
    {
        "id": "UNIT-04", "callsign": "KSP-Delta-04",
        "officers": ["SI Arun Mehta", "PC Savita L"],
        "vehicle": "Bolero (KA-09-Q-3456)", "status": "on-patrol",
        "zone": "Hebbal", "stationId": "STN-BLR-06",
        "position": {"lat": 13.0358, "lng": 77.5970},
        "shiftStart": "06:00", "shiftEnd": "14:00",
        "incidentsThisMonth": 17, "avgResponseTime": 9.4,
        "sparkline": [2, 3, 3, 2, 4, 3, 2],
    },
    {
        "id": "UNIT-05", "callsign": "KSP-Echo-05",
        "officers": ["HC Venkat B", "PC Latha G"],
        "vehicle": "Gypsy (KA-04-R-7890)", "status": "responding",
        "zone": "BTM Layout", "stationId": "STN-BLR-03",
        "position": {"lat": 12.9097, "lng": 77.6113},
        "shiftStart": "14:00", "shiftEnd": "22:00",
        "incidentsThisMonth": 24, "avgResponseTime": 7.6,
        "sparkline": [4, 4, 5, 3, 5, 4, 6],
    },
    {
        "id": "UNIT-06", "callsign": "KSP-Foxtrot-06",
        "officers": ["SI Ramesh P", "HC Kiran T"],
        "vehicle": "Bolero (KA-51-H-2345)", "status": "dispatched",
        "zone": "Silk Board", "stationId": "STN-BLR-08",
        "position": {"lat": 12.9174, "lng": 77.6199},
        "shiftStart": "22:00", "shiftEnd": "06:00",
        "incidentsThisMonth": 19, "avgResponseTime": 8.9,
        "sparkline": [3, 2, 4, 3, 2, 4, 3],
    },
    {
        "id": "UNIT-07", "callsign": "KSP-Golf-07",
        "officers": ["Inspector Meera Desai", "SI Naresh K"],
        "vehicle": "Innova (KA-19-S-6789)", "status": "on-patrol",
        "zone": "Whitefield", "stationId": "STN-BLR-04",
        "position": {"lat": 12.9698, "lng": 77.7500},
        "shiftStart": "06:00", "shiftEnd": "14:00",
        "incidentsThisMonth": 12, "avgResponseTime": 11.2,
        "sparkline": [2, 2, 1, 3, 2, 2, 1],
    },
    {
        "id": "UNIT-08", "callsign": "KSP-Hotel-08",
        "officers": ["HC Prakash M"],
        "vehicle": "Motorbike (KA-01-EX-0011)", "status": "on-break",
        "zone": "Rajajinagar", "stationId": "STN-BLR-09",
        "position": {"lat": 12.9926, "lng": 77.5530},
        "shiftStart": "14:00", "shiftEnd": "22:00",
        "incidentsThisMonth": 8, "avgResponseTime": 6.1,
        "sparkline": [1, 2, 1, 1, 2, 1, 2],
    },
]


# ─── Reports ──────────────────────────────────────────────────────────────────
REPORTS: list[dict] = [
    {
        "id": "RPT-001",
        "title": "Koramangala Robbery Incident Summary",
        "caseId": "INC-005",
        "type": "Incident Summary",
        "status": "Finalized",
        "createdAt": _iso(_dt(10)),
        "updatedAt": _iso(_dt(8)),
        "lastEditedBy": "Inspector Rajesh Kumar",
        "sections": [
            {"heading": "Incident Overview", "content": "Armed robbery at Banashankari jewellery store on July 6, 2026 at 02:15 hrs. Three armed suspects entered the premises and demanded valuables at knifepoint."},
            {"heading": "Evidence Collected", "content": "CCTV footage secured from 3 cameras. Fingerprints lifted from door handle. One knife recovered from scene."},
            {"heading": "Arrests Made", "content": "One suspect — Mahesh K (26, Mysuru) — apprehended near Silk Board at 04:30 hrs. Two suspects remain at large. Look-out notice issued."},
            {"heading": "Recommended Action", "content": "Increase night patrol frequency in Banashankari zone. Coordinate with Mysuru unit for suspect identification."},
        ],
        "versionHistory": [
            {"version": 1, "editedAt": _iso(_dt(10)), "editedBy": "SI Priya Nair", "note": "Initial draft"},
            {"version": 2, "editedAt": _iso(_dt(8)), "editedBy": "Inspector Rajesh Kumar", "note": "Added arrest details and evidence section"},
        ],
    },
    {
        "id": "RPT-002",
        "title": "Indiranagar Motorcycle Theft — FIR Draft",
        "caseId": "INC-002",
        "type": "FIR Draft",
        "status": "Draft",
        "createdAt": _iso(_dt(1)),
        "updatedAt": _iso(_dt(1)),
        "lastEditedBy": "System (AI Draft)",
        "sections": [
            {"heading": "Complainant Details", "content": "Arjun Sharma, 32, Software Engineer, Indiranagar 5th Cross. Vehicle owner since 2023."},
            {"heading": "Incident Description", "content": "Complainant reports his Royal Enfield Thunderbird (KA-05-MJ-4521) was stolen from parking lot adjacent to 100 Feet Road between 09:00 and 13:00 hrs on July 15, 2026."},
            {"heading": "Action Taken", "content": "Vehicle details circulated to all city units and checkposts. CCTV review in progress."},
        ],
        "versionHistory": [
            {"version": 1, "editedAt": _iso(_dt(1)), "editedBy": "System (AI Draft)", "note": "AI-generated initial draft"},
        ],
    },
    {
        "id": "RPT-003",
        "title": "Missing Child — Rajajinagar Search Report",
        "caseId": "INC-009",
        "type": "Incident Summary",
        "status": "In Progress",
        "createdAt": _iso(_dt(14)),
        "updatedAt": _iso(_dt(10)),
        "lastEditedBy": "DSP Arvind Shankar",
        "sections": [
            {"heading": "Case Overview", "content": "Missing child report — Aarav Mehta, 8 years, reported missing by parents at 17:30 hrs on July 2, 2026."},
            {"heading": "Search Operations", "content": "Three search teams deployed across Rajajinagar sectors. Dog squad activated. Announcements made via local communication networks."},
            {"heading": "CCTV Evidence", "content": "Child spotted on CCTV at 16:14 hrs near Rajajinagar Bus Stop. Investigation ongoing."},
        ],
        "versionHistory": [
            {"version": 1, "editedAt": _iso(_dt(14)), "editedBy": "SI Priya Nair", "note": "Initial search report"},
            {"version": 2, "editedAt": _iso(_dt(10)), "editedBy": "DSP Arvind Shankar", "note": "Added CCTV evidence update"},
        ],
    },
]


# ─── Audit Log ────────────────────────────────────────────────────────────────
_AUDIT_ENTRIES: list[dict] = [
    {"id": "AUD-001", "action": "Authenticated — login", "timestamp": _iso(_dt(4)), "resource": "AUTH", "hash": _seed_hash("AUD-001")},
    {"id": "AUD-002", "action": "Viewed incident details", "timestamp": _iso(_dt(3)), "resource": "INC-005", "hash": _seed_hash("AUD-002")},
    {"id": "AUD-003", "action": "Updated incident status to resolved", "timestamp": _iso(_dt(3)), "resource": "INC-005", "hash": _seed_hash("AUD-003")},
    {"id": "AUD-004", "action": "Viewed KPI dashboard", "timestamp": _iso(_dt(2)), "resource": "KPI", "hash": _seed_hash("AUD-004")},
    {"id": "AUD-005", "action": "Assigned UNIT-03 to INC-001", "timestamp": _iso(_dt(2)), "resource": "INC-001", "hash": _seed_hash("AUD-005")},
    {"id": "AUD-006", "action": "Generated AI report draft", "timestamp": _iso(_dt(1)), "resource": "INC-002", "hash": _seed_hash("AUD-006")},
    {"id": "AUD-007", "action": "Queried NL2SQL: chargesheet rates comparison", "timestamp": _iso(_dt(1)), "resource": "NL2SQL", "hash": _seed_hash("AUD-007")},
    {"id": "AUD-008", "action": "Viewed analytics patterns", "timestamp": _iso(_dt(0)), "resource": "ANALYTICS", "hash": _seed_hash("AUD-008")},
]


# ─── Public accessors ─────────────────────────────────────────────────────────
def get_all_incidents(severity: str = "all", status: str = "all") -> list[dict]:
    result = INCIDENTS
    if severity != "all":
        result = [i for i in result if i["severity"] == severity]
    if status != "all":
        result = [i for i in result if i["status"] == status]
    return result


def get_incident(incident_id: str) -> dict | None:
    return next((i for i in INCIDENTS if i["id"] == incident_id), None)


def update_incident_status(incident_id: str, new_status: str) -> dict | None:
    inc = get_incident(incident_id)
    if inc is None:
        return None
    inc["status"] = new_status
    entry = {"time": _iso(_now()), "action": f"Status updated to {new_status}", "by": "Dispatcher"}
    inc["timeline"].append(entry)
    return inc


def assign_unit_to_incident(incident_id: str, unit_id: str) -> dict | None:
    inc = get_incident(incident_id)
    if inc is None:
        return None
    inc["assignedUnitId"] = unit_id
    inc["status"] = "dispatched"
    entry = {"time": _iso(_now()), "action": f"{unit_id} assigned to incident", "by": "Dispatcher"}
    inc["timeline"].append(entry)
    return inc


def get_all_units() -> list[dict]:
    return UNITS


def get_unit(unit_id: str) -> dict | None:
    return next((u for u in UNITS if u["id"] == unit_id), None)


def update_unit_status(unit_id: str, new_status: str) -> dict | None:
    unit = get_unit(unit_id)
    if unit is None:
        return None
    unit["status"] = new_status
    return unit


def get_all_reports() -> list[dict]:
    return REPORTS


def get_report(report_id: str) -> dict | None:
    return next((r for r in REPORTS if r["id"] == report_id), None)


def update_report(report_id: str, title: str | None, sections: list | None) -> dict | None:
    report = get_report(report_id)
    if report is None:
        return None
    if title is not None:
        report["title"] = title
    if sections is not None:
        report["sections"] = sections
    report["updatedAt"] = _iso(_now())
    # Append version
    v = len(report["versionHistory"]) + 1
    report["versionHistory"].append({
        "version": v,
        "editedAt": report["updatedAt"],
        "editedBy": "Officer (via API)",
        "note": f"Version {v} — manual edit",
    })
    return report


def get_audit_log() -> list[dict]:
    return _AUDIT_ENTRIES


def add_audit_entry(action: str, resource: str) -> dict:
    new_id = f"AUD-{str(len(_AUDIT_ENTRIES) + 1).zfill(3)}"
    entry = {
        "id": new_id,
        "action": action,
        "timestamp": _iso(_now()),
        "resource": resource,
        "hash": _seed_hash(new_id + action),
    }
    _AUDIT_ENTRIES.append(entry)
    return entry
