// ============================================================
// PRAHARI AI — Shared Mock Data Types
// ============================================================

export type Severity = "low" | "medium" | "high" | "critical";
export type IncidentStatus = "new" | "dispatched" | "in-progress" | "resolved";
export type UnitStatus = "on-patrol" | "responding" | "on-break" | "off-duty";
export type ReportType = "Incident Summary" | "Chargesheet Draft" | "FIR Draft" | "Analytics Export";
export type ReportStatus = "Draft" | "Under Review" | "Finalized" | "Submitted";
export type CrimeType = "Theft" | "Assault" | "Burglary" | "Traffic Violation" | "Vandalism" | "Drug Offence" | "Robbery" | "Fraud";

export interface GeoPoint { lat: number; lng: number; }

export interface TimelineEntry { time: string; action: string; by: string; }

export interface Incident {
  id: string;
  type: CrimeType;
  severity: Severity;
  status: IncidentStatus;
  location: GeoPoint & { zone: string; address: string };
  timestamp: string;
  description: string;
  source: "citizen" | "officer" | "sensor";
  assignedUnitId: string | null;
  stationId: string;
  timeline: TimelineEntry[];
}

export interface PatrolUnit {
  id: string;
  callsign: string;
  officers: string[];
  vehicle: string;
  status: UnitStatus;
  zone: string;
  stationId: string;
  position: GeoPoint;
  shiftStart: string;
  shiftEnd: string;
  incidentsThisMonth: number;
  avgResponseTime: number; // minutes
  sparkline: number[];    // last 7 days incident count
}

export interface KpiSummary {
  totalActiveCases: number;
  openCases: number;
  closedCases: number;
  alertsToday: number;
  avgResponseTime: number; // minutes
  clearanceRate: number;   // percentage 0-100
  clearanceRateTrend: number; // delta vs last period
  onDutyUnits: number;
  offDutyUnits: number;
}

export interface TrendPoint { date: string; value: number; }

export interface HotspotZone {
  id: string;
  zone: string;
  incidents: number;
  severity: Severity;
  coords: GeoPoint;
}

export interface Report {
  id: string;
  title: string;
  caseId: string;
  type: ReportType;
  status: ReportStatus;
  createdAt: string;
  updatedAt: string;
  lastEditedBy: string;
  sections: { heading: string; content: string }[];
  versionHistory: { version: number; editedAt: string; editedBy: string; note: string }[];
}

export interface AuditEntry {
  id: string;
  action: string;
  timestamp: string;
  resource: string;
  hash: string;
}

export interface UserProfile {
  id: string;
  name: string;
  badgeId: string;
  rank: string;
  station: string;
  role: "Investigator" | "Station Admin" | "Commander";
  email: string;
  phone: string;
}
