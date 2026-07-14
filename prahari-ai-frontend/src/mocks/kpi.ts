import { ACTIVE_INCIDENT_COUNT } from "./incidents";
import { ON_DUTY_COUNT, OFF_DUTY_COUNT } from "./units";
import type { KpiSummary, TrendPoint, HotspotZone } from "./types";

export const KPI_SUMMARY: KpiSummary = {
  totalActiveCases: ACTIVE_INCIDENT_COUNT,
  openCases: 14,
  closedCases: 6,
  alertsToday: 7,
  avgResponseTime: 8.6,
  clearanceRate: 72.4,
  clearanceRateTrend: +3.2,
  onDutyUnits: ON_DUTY_COUNT,
  offDutyUnits: OFF_DUTY_COUNT,
};

// 30-day crime trend (incidents per day)
export const CRIME_TREND_30D: TrendPoint[] = [
  { date: "Jun 15", value: 8 }, { date: "Jun 16", value: 11 }, { date: "Jun 17", value: 7 },
  { date: "Jun 18", value: 14 }, { date: "Jun 19", value: 9 }, { date: "Jun 20", value: 12 },
  { date: "Jun 21", value: 6 }, { date: "Jun 22", value: 15 }, { date: "Jun 23", value: 10 },
  { date: "Jun 24", value: 13 }, { date: "Jun 25", value: 8 }, { date: "Jun 26", value: 11 },
  { date: "Jun 27", value: 16 }, { date: "Jun 28", value: 9 }, { date: "Jun 29", value: 14 },
  { date: "Jun 30", value: 7 }, { date: "Jul 01", value: 12 }, { date: "Jul 02", value: 18 },
  { date: "Jul 03", value: 11 }, { date: "Jul 04", value: 9 }, { date: "Jul 05", value: 15 },
  { date: "Jul 06", value: 13 }, { date: "Jul 07", value: 8 }, { date: "Jul 08", value: 17 },
  { date: "Jul 09", value: 12 }, { date: "Jul 10", value: 10 }, { date: "Jul 11", value: 14 },
  { date: "Jul 12", value: 11 }, { date: "Jul 13", value: 16 }, { date: "Jul 14", value: ACTIVE_INCIDENT_COUNT },
];

// 90-day trend (weekly aggregates)
export const CRIME_TREND_90D: TrendPoint[] = [
  { date: "W1 Apr", value: 52 }, { date: "W2 Apr", value: 61 }, { date: "W3 Apr", value: 48 },
  { date: "W4 Apr", value: 70 }, { date: "W1 May", value: 55 }, { date: "W2 May", value: 63 },
  { date: "W3 May", value: 58 }, { date: "W4 May", value: 74 }, { date: "W1 Jun", value: 60 },
  { date: "W2 Jun", value: 67 }, { date: "W3 Jun", value: 71 }, { date: "W4 Jun", value: 65 },
  { date: "W1 Jul", value: 55 }, { date: "W2 Jul", value: 72 },
];

export const HOTSPOT_ZONES: HotspotZone[] = [
  { id: "HS-1", zone: "Koramangala", incidents: 34, severity: "critical", coords: { lat: 12.9352, lng: 77.6245 } },
  { id: "HS-2", zone: "Indiranagar", incidents: 28, severity: "high", coords: { lat: 12.9784, lng: 77.6408 } },
  { id: "HS-3", zone: "Hebbal", incidents: 22, severity: "high", coords: { lat: 13.0358, lng: 77.5970 } },
  { id: "HS-4", zone: "MG Road", incidents: 19, severity: "medium", coords: { lat: 12.9719, lng: 77.5937 } },
  { id: "HS-5", zone: "Whitefield", incidents: 15, severity: "medium", coords: { lat: 12.9952, lng: 77.7135 } },
];

export const LIVE_ALERTS = [
  { id: "A1", text: "🔴 Armed robbery at Banashankari — Units dispatched", timestamp: "2m ago" },
  { id: "A2", text: "🟡 Chain snatching BTM Layout — KSP-07 investigating", timestamp: "8m ago" },
  { id: "A3", text: "🔴 Narcotics bust in progress — Banaswadi warehouse", timestamp: "12m ago" },
  { id: "A4", text: "🟠 Burglary Yelahanka — Forensics team en route", timestamp: "25m ago" },
  { id: "A5", text: "🟢 Drug offence resolved — Hebbal, 1 arrested", timestamp: "45m ago" },
];
