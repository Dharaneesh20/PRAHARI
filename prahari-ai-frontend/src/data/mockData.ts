import type {
  AgeGroup,
  CrimeCategory,
  HotspotZone,
  Incident,
  KpiSummary,
  NotificationItem,
  PatrolUnit,
  Report,
  RiskZone,
  StationStats,
  TimeSlot,
  TrendPoint,
} from "../lib/types";

const now = Date.now();

export const mockKpiSummary: KpiSummary = {
  totalActiveCases: 128,
  openCases: 128,
  closedCases: 342,
  alertsToday: 18,
  avgResponseTime: 7.4,
  clearanceRate: 72.8,
  clearanceRateTrend: 4.2,
  onDutyUnits: 36,
  offDutyUnits: 8,
};

export const mockTrend: TrendPoint[] = ["Jul 11", "Jul 12", "Jul 13", "Jul 14", "Jul 15", "Jul 16", "Jul 17"].map((date, index) => ({
  date,
  value: [38, 42, 35, 51, 47, 58, 44][index],
}));

export const mockHotspots: HotspotZone[] = [
  { id: "HS-1", zone: "Majestic", incidents: 42, severity: "critical", coords: { lat: 12.9767, lng: 77.5713 } },
  { id: "HS-2", zone: "KR Market", incidents: 34, severity: "high", coords: { lat: 12.9619, lng: 77.5761 } },
  { id: "HS-3", zone: "Indiranagar", incidents: 27, severity: "high", coords: { lat: 12.9719, lng: 77.6412 } },
  { id: "HS-4", zone: "Whitefield", incidents: 19, severity: "medium", coords: { lat: 12.9698, lng: 77.7499 } },
  { id: "HS-5", zone: "Jayanagar", incidents: 12, severity: "low", coords: { lat: 12.9250, lng: 77.5938 } },
];

export const mockIncidents: Incident[] = [
  {
    id: "INC-1007",
    type: "Theft",
    severity: "high",
    status: "dispatched",
    location: { lat: 12.9767, lng: 77.5713, zone: "Majestic", address: "Kempegowda bus terminal" },
    timestamp: new Date(now - 22 * 60000).toISOString(),
    description: "Chain snatching reported near the terminal entrance. CCTV review requested.",
    source: "citizen",
    assignedUnitId: "KSP-12",
    stationId: "ST-01",
    timeline: [],
  },
  {
    id: "INC-1011",
    type: "Assault",
    severity: "critical",
    status: "in-progress",
    location: { lat: 12.9619, lng: 77.5761, zone: "KR Market", address: "Market road east gate" },
    timestamp: new Date(now - 48 * 60000).toISOString(),
    description: "Multiple callers reported a violent altercation. Patrol unit is on scene.",
    source: "patrol",
    assignedUnitId: "KSP-04",
    stationId: "ST-02",
    timeline: [],
  },
  {
    id: "INC-1020",
    type: "Vehicle Theft",
    severity: "medium",
    status: "new",
    location: { lat: 12.9719, lng: 77.6412, zone: "Indiranagar", address: "100 Feet Road" },
    timestamp: new Date(now - 3 * 3600000).toISOString(),
    description: "Two-wheeler theft complaint filed with registration details and nearby camera locations.",
    source: "officer",
    assignedUnitId: null,
    stationId: "ST-03",
    timeline: [],
  },
];

export const mockUnits: PatrolUnit[] = [
  { id: "KSP-12", callsign: "Bravo 12", officers: ["Asha Rao", "Nikhil S"], vehicle: "SUV", status: "responding", zone: "Majestic", stationId: "ST-01", position: { lat: 12.9772, lng: 77.5720 }, shiftStart: "08:00", shiftEnd: "20:00", incidentsThisMonth: 31, avgResponseTime: 6.8, sparkline: [5, 7, 6, 8] },
  { id: "KSP-04", callsign: "Alpha 04", officers: ["Vikram H", "Meera P"], vehicle: "Jeep", status: "on-patrol", zone: "KR Market", stationId: "ST-02", position: { lat: 12.9626, lng: 77.5750 }, shiftStart: "06:00", shiftEnd: "18:00", incidentsThisMonth: 27, avgResponseTime: 7.1, sparkline: [6, 5, 9, 7] },
];

export const mockCategories: CrimeCategory[] = [
  { type: "Theft", count: 148, pct: 38, color: "#C9A227" },
  { type: "Assault", count: 86, pct: 22, color: "#D14343" },
  { type: "Vehicle Theft", count: 64, pct: 16, color: "#3F5C86" },
  { type: "Cyber Crime", count: 51, pct: 13, color: "#2E9E6C" },
];

export const mockRiskZones: RiskZone[] = [
  { zone: "Majestic", score: 91, trend: 12, confidence: 87, factors: ["Transit crowd density", "Repeat theft reports", "Late-night incidents"] },
  { zone: "KR Market", score: 82, trend: 8, confidence: 84, factors: ["Market congestion", "Repeat assault clusters"] },
  { zone: "Whitefield", score: 58, trend: -4, confidence: 76, factors: ["Vehicle theft reports", "Weekend concentration"] },
];

export const mockStations: StationStats[] = [
  { station: "Upparpet PS", zone: "Majestic", clearanceRate: 78, avgResponse: 6.9, caseVolume: 124, rank: 2 },
  { station: "City Market PS", zone: "KR Market", clearanceRate: 69, avgResponse: 8.4, caseVolume: 118, rank: 4 },
  { station: "Indiranagar PS", zone: "Indiranagar", clearanceRate: 82, avgResponse: 7.6, caseVolume: 92, rank: 1 },
];

export const mockAgeGroups: AgeGroup[] = [
  { group: "18-24", offenderPct: 28, victimPct: 18 },
  { group: "25-34", offenderPct: 36, victimPct: 30 },
  { group: "35-44", offenderPct: 22, victimPct: 27 },
  { group: "45+", offenderPct: 14, victimPct: 25 },
];

export const mockTimeDistribution: TimeSlot[] = [
  { slot: "Morning", incidents: 42 },
  { slot: "Afternoon", incidents: 61 },
  { slot: "Evening", incidents: 88 },
  { slot: "Night", incidents: 73 },
];

export const mockReports: Report[] = [
  {
    id: "RPT-204",
    title: "Majestic Theft Cluster Brief",
    caseId: "INC-1007",
    type: "Incident Summary",
    status: "Under Review",
    createdAt: new Date(now - 86400000).toISOString(),
    updatedAt: new Date(now - 3600000).toISOString(),
    lastEditedBy: "Inspector Asha Rao",
    sections: [
      { heading: "Incident Overview", content: "A cluster of theft complaints has been detected around the Majestic terminal corridor." },
      { heading: "Recommended Action", content: "Increase patrol visibility during evening peak hours and review CCTV feeds from entry points." },
    ],
    versionHistory: [{ version: 1, editedAt: new Date(now - 3600000).toISOString(), editedBy: "Inspector Asha Rao", note: "Initial draft prepared" }],
  },
];

export const mockNotifications: NotificationItem[] = [
  { id: "N-1", title: "New high-risk alert", message: "Majestic theft cluster crossed the watch threshold.", category: "system", resource: "INC-1007", read: false, createdAt: new Date(now - 600000).toISOString() },
  { id: "N-2", title: "Report ready", message: "Majestic Theft Cluster Brief is ready for review.", category: "report", resource: "RPT-204", read: false, createdAt: new Date(now - 3600000).toISOString() },
];
