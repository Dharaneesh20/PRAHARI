# PRAHARI AI — API Documentation Specification (FastAPI Target)

This document specifies the REST and WebSocket API endpoints expected by the Prahari AI frontend. This serves as the design contract for implementing the FastAPI backend.

---

## 1. Authentication Endpoints

### POST /auth/login
**Used by:** Login Page
**Purpose:** Authenticate an officer with Badge ID and Secure Access Code.

**Request body:**
```json
{
  "badgeId": "KSP-INS-8921",
  "password": "secure_password_hash"
}
```

**Response body (200 OK):**
```json
{
  "token": "jwt_session_token_here",
  "user": {
    "id": "USR-001",
    "name": "Inspector Rajesh Kumar",
    "badgeId": "KSP-INS-8921",
    "rank": "Inspector",
    "station": "Koramangala Police Station",
    "role": "Investigator",
    "email": "raj.kumar@ksp.gov.in",
    "phone": "+91-94481-XXXXX"
  }
}
```

---

### POST /auth/logout
**Used by:** Settings Page (Sign out)
**Purpose:** Invalidate session token.

**Response body (200 OK):**
```json
{
  "status": "success",
  "message": "Session invalidated"
}
```

---

### GET /auth/session
**Used by:** App Initialization
**Purpose:** Get user profile for current active session.

**Response body (200 OK):**
```json
{
  "id": "USR-001",
  "name": "Inspector Rajesh Kumar",
  "badgeId": "KSP-INS-8921",
  "rank": "Inspector",
  "station": "Koramangala Police Station",
  "role": "Investigator"
}
```

---

## 2. KPI Dashboard Endpoints

### GET /kpi/summary
**Used by:** KPI Dashboard
**Purpose:** Retrieve top-level summary metrics.
**Query params:**
- `range` (string, optional): `today`, `7d`, `30d`. Default: `7d`

**Response body:**
```json
{
  "totalActiveCases": 14,
  "openCases": 14,
  "closedCases": 6,
  "alertsToday": 7,
  "avgResponseTime": 8.6,
  "clearanceRate": 72.4,
  "clearanceRateTrend": 3.2,
  "onDutyUnits": 11,
  "offDutyUnits": 1
}
```

---

### GET /kpi/trend
**Used by:** KPI Dashboard Trend Chart
**Purpose:** Get incident history counts for trend plotting.
**Query params:**
- `range` (string, optional): `today`, `7d`, `30d`

**Response body:**
```json
[
  { "date": "Jun 15", "value": 8 },
  { "date": "Jun 16", "value": 11 }
]
```

---

### GET /kpi/hotspots
**Used by:** KPI Dashboard Hotspot List
**Purpose:** Fetch top crime hotspots with geo-coordinates.

**Response body:**
```json
[
  {
    "id": "HS-1",
    "zone": "Koramangala",
    "incidents": 34,
    "severity": "critical",
    "coords": { "lat": 12.9352, "lng": 77.6245 }
  }
]
```

---

## 3. Incident Endpoints

### GET /incidents
**Used by:** Live Incidents Feed, Crime Map
**Purpose:** Retrieve list of incidents. Filterable by status and severity.

**Query params:**
- `severity` (string, optional): `low`, `medium`, `high`, `critical`, `all`
- `status` (string, optional): `new`, `dispatched`, `in-progress`, `resolved`, `all`

**Response body:**
```json
[
  {
    "id": "INC-001",
    "type": "Assault",
    "severity": "critical",
    "status": "in-progress",
    "location": {
      "lat": 12.9716,
      "lng": 77.5946,
      "zone": "Koramangala",
      "address": "80 Feet Rd, Koramangala 4th Block"
    },
    "timestamp": "2026-07-14T17:00:00Z",
    "description": "Armed assault reported near commercial complex.",
    "source": "citizen",
    "assignedUnitId": "UNIT-03",
    "stationId": "STN-BLR-01",
    "timeline": [
      { "time": "2026-07-14T17:00:00Z", "action": "Incident reported", "by": "System" }
    ]
  }
]
```

---

### PATCH /incidents/{id}/status
**Used by:** Live Incidents Triage
**Purpose:** Update an incident's status.

**Request body:**
```json
{
  "status": "resolved"
}
```

**Response body:**
```json
{
  "id": "INC-001",
  "status": "resolved",
  "updatedAt": "2026-07-14T17:15:00Z"
}
```

---

### POST /incidents/{id}/assign
**Used by:** Live Incidents Triage
**Purpose:** Assign a patrol unit to a specific active incident.

**Request body:**
```json
{
  "unitId": "UNIT-03"
}
```

**Response body:**
```json
{
  "id": "INC-001",
  "assignedUnitId": "UNIT-03",
  "status": "dispatched"
}
```

---

### WS /incidents/stream
**Used by:** Live Incidents Feed (SSE/WebSocket)
**Purpose:** Push new incidents in real time to logged-in dispatchers.

**Message payload pushed:**
```json
{
  "event": "new_incident",
  "data": {
    "id": "INC-SIM-12345",
    "type": "Theft",
    "severity": "high",
    "status": "new",
    "location": { "lat": 12.97, "lng": 77.60, "zone": "MG Road", "address": "Commercial St" },
    "timestamp": "2026-07-14T17:50:00Z",
    "description": "Mugging reported.",
    "source": "citizen",
    "assignedUnitId": null,
    "stationId": "STN-BLR-01",
    "timeline": []
  }
}
```

---

## 4. Patrol Unit Endpoints

### GET /units
**Used by:** Patrol Roster Feed, Crime Map
**Purpose:** List all patrol units.

**Response body:**
```json
[
  {
    "id": "UNIT-01",
    "callsign": "KSP-Alpha-01",
    "officers": ["Inspector Rajesh Kumar", "HC Suresh P"],
    "vehicle": "Bolero (KA-51-G-1234)",
    "status": "responding",
    "zone": "Banashankari",
    "stationId": "STN-BLR-07",
    "position": { "lat": 12.9141, "lng": 77.6101 },
    "shiftStart": "06:00",
    "shiftEnd": "14:00",
    "incidentsThisMonth": 28,
    "avgResponseTime": 7.2,
    "sparkline": [4, 3, 5, 2, 4, 6, 4]
  }
]
```

---

### PATCH /units/{id}/status
**Used by:** Patrol Unit Management
**Purpose:** Update status of a patrol unit.

**Request body:**
```json
{
  "status": "on-break"
}
```

**Response body:**
```json
{
  "id": "UNIT-01",
  "status": "on-break"
}
```

---

### WS /units/stream
**Used by:** Crime Map Live Positioning
**Purpose:** Real-time updates of GPS coordinates for active patrol units.

**Message payload pushed:**
```json
{
  "unitId": "UNIT-01",
  "position": { "lat": 12.9145, "lng": 77.6109 }
}
```

---

## 5. Analytics Endpoints

### GET /analytics/patterns
**Used by:** Analytics Tab (Crime Patterns)
**Purpose:** Returns category breakdown data.

**Response body:**
```json
{
  "categories": [
    { "type": "Theft", "count": 142, "pct": 28, "color": "#C9A227" }
  ]
}
```

---

### GET /analytics/risk
**Used by:** Analytics Tab (Predictive Risk)
**Purpose:** Predict future incident probability scores per zone.

**Response body:**
```json
[
  {
    "zone": "Koramangala",
    "score": 87,
    "trend": 8,
    "confidence": 91,
    "factors": ["Footfall +12%", "Repeat offenders +8%"]
  }
]
```

---

### GET /analytics/stations
**Used by:** Analytics Tab (Station Comparisons)
**Purpose:** Comparative clearance performance.

**Response body:**
```json
[
  {
    "station": "Koramangala PS",
    "zone": "Central South",
    "clearanceRate": 68,
    "avgResponse": 7.2,
    "caseVolume": 142,
    "rank": 4
  }
]
```

---

### GET /analytics/demographics
**Used by:** Analytics Tab (Demographics)
**Purpose:** Anonymized statistics on offender and victim age groups.

**Response body:**
```json
{
  "ageGroups": [
    { "group": "15-24", "offenderPct": 28, "victimPct": 22 }
  ],
  "timeDistribution": [
    { "slot": "00:00-06:00", "incidents": 48 }
  ]
}
```

---

## 6. Reports & AI Drafting Endpoints

### GET /reports
**Used by:** Reports Workspace
**Purpose:** List available case reports and summaries.

**Response body:**
```json
[
  {
    "id": "RPT-001",
    "title": "Koramangala Robbery Incident Summary",
    "caseId": "INC-007",
    "type": "Incident Summary",
    "status": "Finalized",
    "createdAt": "2026-07-14T08:30:00Z",
    "updatedAt": "2026-07-14T11:15:00Z",
    "lastEditedBy": "Inspector Raj",
    "sections": [
      { "heading": "Incident Overview", "content": "Armed robbery details..." }
    ],
    "versionHistory": [
      { "version": 1, "editedAt": "2026-07-14T08:30:00Z", "editedBy": "SI Kumar B", "note": "Initial draft" }
    ]
  }
]
```

---

### POST /reports/generate
**Used by:** Reports AI Draft Builder
**Purpose:** Generate FIR/Chargesheet draft content using LLM based on key facts.

**Request body:**
```json
{
  "caseId": "INC-007",
  "type": "Incident Summary",
  "notes": "Add key facts and suspect description."
}
```

**Response stream (Server-Sent Events):**
```
data: {"token": "CHARGESHEET"}
data: {"token": " /"}
data: {"token": " INCIDENT"}
data: {"token": " SUMMARY"}
```

---

### PATCH /reports/{id}
**Used by:** Reports Editor
**Purpose:** Save revisions to report draft sections.

**Request body:**
```json
{
  "title": "Updated Title",
  "sections": [
    { "heading": "Incident Overview", "content": "Edited content here." }
  ]
}
```

**Response body:**
```json
{
  "status": "success",
  "updatedAt": "2026-07-14T17:55:00Z"
}
```

---

## 7. Settings & Audit Ledger Endpoints

### PATCH /settings/profile
**Used by:** Profile Edit Section
**Purpose:** Update logged-in user profile details.

**Request body:**
```json
{
  "email": "raj.kumar.new@ksp.gov.in",
  "phone": "+91-94481-11111"
}
```

**Response body:**
```json
{
  "status": "success",
  "profile": {
    "email": "raj.kumar.new@ksp.gov.in",
    "phone": "+91-94481-11111"
  }
}
```

---

### GET /audit-log
**Used by:** Settings (Privacy & Audit)
**Purpose:** Read-only blockchain verification logs for current user session actions.

**Response body:**
```json
[
  {
    "id": "AUD-001",
    "action": "Viewed incident details",
    "timestamp": "2026-07-14T22:45:00Z",
    "resource": "INC-007",
    "hash": "0xA1B2C3D4E5F6..."
  }
]
```
