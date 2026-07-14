// Analytics mock data — crime patterns, risk scores, station comparisons, demographics

export const CRIME_BY_CATEGORY = [
  { type: "Theft", count: 142, pct: 28, color: "#C9A227" },
  { type: "Assault", count: 98, pct: 19, color: "#D14343" },
  { type: "Burglary", count: 87, pct: 17, color: "#3F5C86" },
  { type: "Traffic", count: 76, pct: 15, color: "#2E9E6C" },
  { type: "Drug Offence", count: 54, pct: 11, color: "#8B5CF6" },
  { type: "Fraud", count: 32, pct: 6, color: "#F59E0B" },
  { type: "Vandalism", count: 20, pct: 4, color: "#6B7280" },
];

// Time-of-day × day-of-week incident heatmap (0-10 intensity)
// 7 days × 24 hours
export const TIME_HEATMAP: { day: string; hour: number; value: number }[] = [];
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const BASE = [[1,1,0,0,0,1,1,2,3,4,4,5,4,5,4,3,3,4,5,6,7,5,3,2],
              [1,0,0,0,1,1,2,2,3,3,4,4,5,4,4,3,3,5,6,6,7,5,3,2],
              [0,0,0,0,0,1,1,2,3,4,5,4,4,4,3,3,4,5,5,6,7,6,4,2],
              [1,1,0,0,0,1,2,2,3,4,4,5,5,5,4,3,3,4,5,7,7,6,3,2],
              [1,0,0,0,1,1,2,3,3,4,5,5,5,5,4,4,4,5,6,8,9,7,5,3],
              [2,1,1,0,1,2,3,3,4,5,5,6,6,6,5,5,6,7,8,9,9,8,6,4],
              [3,2,1,0,0,1,2,3,4,4,5,5,5,4,4,5,5,6,7,8,8,7,5,3]];
DAYS.forEach((day, d) => {
  for (let h = 0; h < 24; h++) {
    TIME_HEATMAP.push({ day, hour: h, value: BASE[d][h] });
  }
});

// Year-over-year comparison
export const YOY_DATA = [
  { month: "Jan", current: 98, previous: 112 }, { month: "Feb", current: 85, previous: 98 },
  { month: "Mar", current: 102, previous: 89 }, { month: "Apr", current: 118, previous: 105 },
  { month: "May", current: 124, previous: 108 }, { month: "Jun", current: 110, previous: 115 },
  { month: "Jul", current: 72, previous: 103 },
];

// Risk score per zone (0-100)
export const RISK_ZONES = [
  { zone: "Koramangala", score: 87, trend: +8, confidence: 91,
    factors: ["Footfall +12%", "Repeat offenders +8%", "Evening incidents +15%"] },
  { zone: "Indiranagar", score: 74, trend: +4, confidence: 88,
    factors: ["Commercial density high", "Late-night bars", "Insufficient lighting"] },
  { zone: "Banaswadi", score: 71, trend: +12, confidence: 82,
    factors: ["Narcotics activity rising", "New transit hub", "Low unit coverage"] },
  { zone: "Hebbal", score: 65, trend: +3, confidence: 79,
    factors: ["Highway proximity", "Night truck movement", "Limited CCTV"] },
  { zone: "Whitefield", score: 58, trend: -2, confidence: 85,
    factors: ["High tech-park density", "Improving CCTV coverage", "Active patrol"] },
  { zone: "Yelahanka", score: 52, trend: +6, confidence: 76,
    factors: ["Rapid urbanization", "New residential areas", "Patrol coverage thin"] },
  { zone: "Jayanagar", score: 38, trend: -5, confidence: 90,
    factors: ["Good patrol coverage", "Active CCTV", "Community policing"] },
  { zone: "JP Nagar", score: 33, trend: -8, confidence: 87,
    factors: ["Low commercial activity", "Resident vigilance", "Night patrol active"] },
];

// Station comparison
export const STATION_COMPARISON = [
  { station: "Koramangala PS", zone: "Central South", clearanceRate: 68, avgResponse: 7.2, caseVolume: 142, rank: 4 },
  { station: "Indiranagar PS", zone: "Central East", clearanceRate: 74, avgResponse: 8.1, caseVolume: 108, rank: 3 },
  { station: "Hebbal PS", zone: "North", clearanceRate: 81, avgResponse: 9.5, caseVolume: 87, rank: 2 },
  { station: "Jayanagar PS", zone: "South", clearanceRate: 89, avgResponse: 6.8, caseVolume: 95, rank: 1 },
  { station: "BTM Layout PS", zone: "South Central", clearanceRate: 62, avgResponse: 10.2, caseVolume: 130, rank: 6 },
  { station: "Whitefield PS", zone: "East", clearanceRate: 71, avgResponse: 12.5, caseVolume: 78, rank: 5 },
  { station: "Yelahanka PS", zone: "North", clearanceRate: 58, avgResponse: 11.8, caseVolume: 65, rank: 7 },
  { station: "Rajajinagar PS", zone: "West", clearanceRate: 76, avgResponse: 8.9, caseVolume: 92, rank: 3 },
];

// Demographics — aggregate, anonymized
export const DEMOGRAPHICS_AGE = [
  { group: "15-24", offenderPct: 28, victimPct: 22 },
  { group: "25-34", offenderPct: 35, victimPct: 31 },
  { group: "35-44", offenderPct: 19, victimPct: 24 },
  { group: "45-54", offenderPct: 11, victimPct: 15 },
  { group: "55+", offenderPct: 7, victimPct: 8 },
];

export const DEMOGRAPHICS_TIME = [
  { slot: "00:00-06:00", incidents: 48 }, { slot: "06:00-12:00", incidents: 112 },
  { slot: "12:00-18:00", incidents: 198 }, { slot: "18:00-24:00", incidents: 232 },
];
