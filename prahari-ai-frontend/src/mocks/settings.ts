import type { UserProfile, AuditEntry } from "./types";

export const USER_PROFILE: UserProfile = {
  id: "USR-001",
  name: "Inspector Rajesh Kumar",
  badgeId: "KSP-INS-8921",
  rank: "Inspector",
  station: "Koramangala Police Station",
  role: "Investigator",
  email: "raj.kumar@ksp.gov.in",
  phone: "+91-94481-XXXXX",
};

export const NOTIFICATION_PREFS = {
  newIncident: true, assignedCase: true, reportReady: true, systemAlerts: true,
  channels: { inApp: true, email: true, sms: false },
};

export const ACTIVE_SESSIONS = [
  { id: "SES-001", device: "Windows 11 — Chrome 126", location: "Bangalore, Karnataka", ip: "10.0.1.XX", lastActive: "Now", current: true },
  { id: "SES-002", device: "Android 14 — KSP Mobile App", location: "Koramangala Field Unit", ip: "10.0.2.XX", lastActive: "2h ago", current: false },
  { id: "SES-003", device: "Windows 10 — Edge 124", location: "Koramangala Police Station", ip: "10.0.3.XX", lastActive: "Yesterday 18:30", current: false },
];

export const AUDIT_LOG: AuditEntry[] = [
  { id: "AUD-001", action: "Viewed incident details", timestamp: "2026-07-14T22:45:00Z", resource: "INC-007", hash: "0xA1B2C3D4E5F6..." },
  { id: "AUD-002", action: "Assigned patrol unit to incident", timestamp: "2026-07-14T22:30:00Z", resource: "INC-001 → UNIT-03", hash: "0xB2C3D4E5F6A1..." },
  { id: "AUD-003", action: "Generated AI report draft", timestamp: "2026-07-14T21:00:00Z", resource: "RPT-003", hash: "0xC3D4E5F6A1B2..." },
  { id: "AUD-004", action: "Updated incident status", timestamp: "2026-07-14T20:15:00Z", resource: "INC-004 → resolved", hash: "0xD4E5F6A1B2C3..." },
  { id: "AUD-005", action: "Accessed Undercover Assets panel", timestamp: "2026-07-14T18:00:00Z", resource: "Dashboard/assets", hash: "0xE5F6A1B2C3D4..." },
  { id: "AUD-006", action: "Exported analytics report", timestamp: "2026-07-14T14:30:00Z", resource: "RPT-004", hash: "0xF6A1B2C3D4E5..." },
  { id: "AUD-007", action: "Searched case database", timestamp: "2026-07-14T12:00:00Z", resource: "Query: INC-005", hash: "0xA1B2C3D4E5F7..." },
  { id: "AUD-008", action: "Login", timestamp: "2026-07-14T06:00:00Z", resource: "auth/session", hash: "0xB2C3D4E5F6A2..." },
  { id: "AUD-009", action: "Viewed patrol unit positions", timestamp: "2026-07-13T22:00:00Z", resource: "UNIT-01,UNIT-03,UNIT-07", hash: "0xC3D4E5F6A1B3..." },
  { id: "AUD-010", action: "Finalized report", timestamp: "2026-07-13T18:00:00Z", resource: "RPT-001", hash: "0xD4E5F6A1B2C4..." },
  { id: "AUD-011", action: "Updated case status", timestamp: "2026-07-13T14:00:00Z", resource: "INC-010 → resolved", hash: "0xE5F6A1B2C3D5..." },
  { id: "AUD-012", action: "Accessed predictive risk scores", timestamp: "2026-07-13T10:00:00Z", resource: "Analytics/risk", hash: "0xF6A1B2C3D4E6..." },
  { id: "AUD-013", action: "Bulk-assigned incidents", timestamp: "2026-07-13T08:30:00Z", resource: "INC-015, INC-016 → UNIT-12", hash: "0xA1B2C3D4E5F8..." },
  { id: "AUD-014", action: "Login", timestamp: "2026-07-13T06:00:00Z", resource: "auth/session", hash: "0xB2C3D4E5F6A3..." },
  { id: "AUD-015", action: "Generated weekly analytics export", timestamp: "2026-07-07T09:00:00Z", resource: "RPT-008", hash: "0xC3D4E5F6A1B4..." },
];

export const APP_PREFERENCES = {
  density: "comfortable" as "comfortable" | "compact",
  reduceMotion: false,
  soundAlerts: true,
  language: "en" as "en" | "kn",
  syncFilters: false,
};
