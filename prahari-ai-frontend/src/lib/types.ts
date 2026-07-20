// ============================================================
// PRAHARI AI — Shared Types
// All frontend data shapes consumed from backend APIs.
// ============================================================

export type Severity = "low" | "medium" | "high" | "critical";
export type IncidentStatus = "new" | "dispatched" | "in-progress" | "resolved";
export type UnitStatus = "on-patrol" | "responding" | "on-break" | "off-duty" | "available" | "dispatched";
export type ReportType = "Incident Summary" | "Chargesheet Draft" | "FIR Draft" | "Analytics Export";
export type ReportStatus = "Draft" | "Under Review" | "Finalized" | "Submitted" | "In Progress";
export type CrimeType = string; // open-ended — comes from backend

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
  source: "citizen" | "officer" | "sensor" | "patrol" | "cctv" | "anonymous";
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
  avgResponseTime: number;
  sparkline: number[];
}

export interface KpiSummary {
  totalActiveCases: number;
  openCases: number;
  closedCases: number;
  alertsToday: number;
  avgResponseTime: number;
  clearanceRate: number;
  clearanceRateTrend: number;
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

export interface AppPreferences {
  density: "comfortable" | "compact";
  reduceMotion: boolean;
  soundAlerts: boolean;
  language: "en" | "kn";
  syncFilters: boolean;
}

export interface NotificationPreferences {
  newIncident: boolean;
  assignedCase: boolean;
  reportReady: boolean;
  systemAlerts: boolean;
  channels: { inApp: boolean; email: boolean; sms: boolean };
}

export interface AppSettings {
  preferences: AppPreferences;
  notificationPreferences: NotificationPreferences;
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  category: string;
  resource: string | null;
  read: boolean;
  createdAt: string;
}

export interface UserProfile {
  id: string;
  name: string;
  username?: string | null;
  badgeId: string;
  rank: string;
  station: string;
  role: string;
  email: string;
  phone: string;
  bio?: string | null;
  avatar?: string | null;
  clearance_level: number;
}

// Analytics types
export interface CrimeCategory { type: string; count: number; pct: number; color: string; }
export interface RiskZone { zone: string; score: number; trend: number; confidence: number; factors: string[]; }
export interface StationStats { station: string; zone: string; clearanceRate: number; avgResponse: number; caseVolume: number; rank: number; }
export interface AgeGroup { group: string; offenderPct: number; victimPct: number; }
export interface TimeSlot { slot: string; incidents: number; }
