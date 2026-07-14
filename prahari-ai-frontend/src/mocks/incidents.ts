import type { Incident } from "./types";

const now = new Date();
const ago = (minutes: number) => new Date(now.getTime() - minutes * 60000).toISOString();

export const INCIDENTS: Incident[] = [
  {
    id: "INC-001", type: "Assault", severity: "critical", status: "in-progress",
    location: { lat: 12.9716, lng: 77.5946, zone: "Koramangala", address: "80 Feet Rd, Koramangala 4th Block" },
    timestamp: ago(8), description: "Armed assault reported near commercial complex. Victim sustained injuries. Suspect fled on two-wheeler.", source: "citizen", assignedUnitId: "UNIT-03", stationId: "STN-BLR-01",
    timeline: [
      { time: ago(8), action: "Incident reported via citizen app", by: "System" },
      { time: ago(7), action: "Unit KSP-03 dispatched", by: "Dispatch" },
      { time: ago(5), action: "Unit arrived on scene", by: "Cpl. Ramesh K" },
    ],
  },
  {
    id: "INC-002", type: "Theft", severity: "medium", status: "dispatched",
    location: { lat: 12.9352, lng: 77.6245, zone: "BTM Layout", address: "BTM 2nd Stage Main Rd" },
    timestamp: ago(22), description: "Chain snatching incident. Suspect identified on CCTV. Vehicle details noted.", source: "officer", assignedUnitId: "UNIT-07", stationId: "STN-BLR-02",
    timeline: [
      { time: ago(22), action: "Officer filed report", by: "SI Priya M" },
      { time: ago(18), action: "Unit KSP-07 dispatched for investigation", by: "Dispatch" },
    ],
  },
  {
    id: "INC-003", type: "Burglary", severity: "high", status: "new",
    location: { lat: 12.9784, lng: 77.6408, zone: "Indiranagar", address: "100 Feet Rd, Indiranagar" },
    timestamp: ago(3), description: "Residential burglary. Rear window broken. Electronics and jewelry stolen. Estimated loss: ₹2.4L.", source: "citizen", assignedUnitId: null, stationId: "STN-BLR-03",
    timeline: [{ time: ago(3), action: "Reported via emergency helpline", by: "System" }],
  },
  {
    id: "INC-004", type: "Traffic Violation", severity: "low", status: "resolved",
    location: { lat: 12.9279, lng: 77.6271, zone: "Jayanagar", address: "Jayanagar 4th Block Circle" },
    timestamp: ago(120), description: "DUI checkpoint violation. Driver arrested. Vehicle impounded.", source: "sensor", assignedUnitId: "UNIT-02", stationId: "STN-BLR-04",
    timeline: [
      { time: ago(120), action: "Sensor alert triggered", by: "System" },
      { time: ago(115), action: "Unit KSP-02 responded", by: "Dispatch" },
      { time: ago(100), action: "Incident resolved. FIR filed.", by: "SI Ravi C" },
    ],
  },
  {
    id: "INC-005", type: "Drug Offence", severity: "high", status: "in-progress",
    location: { lat: 13.0358, lng: 77.5970, zone: "Hebbal", address: "Outer Ring Road, Hebbal Flyover" },
    timestamp: ago(45), description: "Narcotics possession. Suspect apprehended. Search operation ongoing for associates.", source: "officer", assignedUnitId: "UNIT-05", stationId: "STN-BLR-05",
    timeline: [
      { time: ago(45), action: "Officer spotted suspect", by: "HC Suresh P" },
      { time: ago(40), action: "Suspect apprehended", by: "HC Suresh P" },
      { time: ago(35), action: "Search operation initiated", by: "Inspector Raj" },
    ],
  },
  {
    id: "INC-006", type: "Vandalism", severity: "low", status: "resolved",
    location: { lat: 12.9623, lng: 77.5897, zone: "Rajajinagar", address: "Chord Rd, Rajajinagar" },
    timestamp: ago(240), description: "Public property vandalism. Graffiti on government building wall. CCTV footage recovered.", source: "citizen", assignedUnitId: "UNIT-09", stationId: "STN-BLR-06",
    timeline: [
      { time: ago(240), action: "Complaint received", by: "System" },
      { time: ago(235), action: "Unit KSP-09 dispatched", by: "Dispatch" },
      { time: ago(200), action: "Resolved. FIR filed.", by: "ASI Kumar V" },
    ],
  },
  {
    id: "INC-007", type: "Robbery", severity: "critical", status: "dispatched",
    location: { lat: 12.9141, lng: 77.6101, zone: "Banashankari", address: "Banashankari 3rd Stage" },
    timestamp: ago(12), description: "Armed robbery at petrol bunk. Two suspects with country-made weapons. Cash stolen. Panic button activated.", source: "sensor", assignedUnitId: "UNIT-01", stationId: "STN-BLR-07",
    timeline: [
      { time: ago(12), action: "Panic button alert received", by: "System" },
      { time: ago(10), action: "Two units dispatched", by: "Dispatch" },
    ],
  },
  {
    id: "INC-008", type: "Fraud", severity: "medium", status: "in-progress",
    location: { lat: 12.9719, lng: 77.5937, zone: "MG Road", address: "MG Road, Commercial Area" },
    timestamp: ago(360), description: "Online fraud complaint. Victim defrauded ₹85,000 via UPI. Cybercrime unit notified.", source: "citizen", assignedUnitId: "UNIT-11", stationId: "STN-BLR-08",
    timeline: [
      { time: ago(360), action: "Complaint lodged", by: "System" },
      { time: ago(350), action: "Cybercrime unit assigned", by: "Inspector Raj" },
      { time: ago(200), action: "Digital forensics initiated", by: "SI Deepa R" },
    ],
  },
  {
    id: "INC-009", type: "Assault", severity: "high", status: "new",
    location: { lat: 13.0298, lng: 77.5952, zone: "Yeshwanthpur", address: "Yeshwanthpur Circle" },
    timestamp: ago(5), description: "Bar fight. Multiple persons injured. Crowd control required.", source: "citizen", assignedUnitId: null, stationId: "STN-BLR-05",
    timeline: [{ time: ago(5), action: "Emergency call received", by: "System" }],
  },
  {
    id: "INC-010", type: "Theft", severity: "low", status: "resolved",
    location: { lat: 12.9580, lng: 77.6430, zone: "Ejipura", address: "Vivek Nagar, Ejipura" },
    timestamp: ago(1440), description: "Mobile phone theft. Suspect traced via IMEI. Device recovered.", source: "officer", assignedUnitId: "UNIT-04", stationId: "STN-BLR-01",
    timeline: [
      { time: ago(1440), action: "Complaint filed", by: "System" },
      { time: ago(1400), action: "Investigation initiated", by: "SI Priya M" },
      { time: ago(720), action: "Suspect identified", by: "SI Priya M" },
      { time: ago(300), action: "Device recovered. Case resolved.", by: "Inspector Raj" },
    ],
  },
  {
    id: "INC-011", type: "Drug Offence", severity: "medium", status: "dispatched",
    location: { lat: 12.9952, lng: 77.7135, zone: "Whitefield", address: "ITPL Main Rd, Whitefield" },
    timestamp: ago(30), description: "Suspected drug peddling. Informer tip received. Surveillance in progress.", source: "officer", assignedUnitId: "UNIT-08", stationId: "STN-BLR-09",
    timeline: [
      { time: ago(30), action: "Informer tip received", by: "HC Mohan T" },
      { time: ago(25), action: "Plainclothes unit dispatched", by: "Inspector Raj" },
    ],
  },
  {
    id: "INC-012", type: "Burglary", severity: "high", status: "in-progress",
    location: { lat: 13.0671, lng: 77.5964, zone: "Yelahanka", address: "Yelahanka New Town" },
    timestamp: ago(90), description: "Commercial break-in at jewelry store. Safe tampered. Forensics team en route.", source: "sensor", assignedUnitId: "UNIT-06", stationId: "STN-BLR-10",
    timeline: [
      { time: ago(90), action: "Alarm triggered", by: "System" },
      { time: ago(85), action: "Police unit notified", by: "Dispatch" },
      { time: ago(70), action: "Unit KSP-06 on scene", by: "SI Kumar" },
      { time: ago(40), action: "Forensics team requested", by: "SI Kumar" },
    ],
  },
  {
    id: "INC-013", type: "Traffic Violation", severity: "low", status: "resolved",
    location: { lat: 12.9810, lng: 77.6408, zone: "Domlur", address: "Airport Rd, Domlur Flyover" },
    timestamp: ago(500), description: "Reckless driving. Over-speeding 120 kmph in 60 zone. Challan issued.", source: "sensor", assignedUnitId: "UNIT-10", stationId: "STN-BLR-03",
    timeline: [
      { time: ago(500), action: "Speed sensor alert", by: "System" },
      { time: ago(498), action: "Traffic unit stopped vehicle", by: "HC Anand K" },
      { time: ago(490), action: "Challan issued. Case closed.", by: "HC Anand K" },
    ],
  },
  {
    id: "INC-014", type: "Robbery", severity: "high", status: "new",
    location: { lat: 12.9000, lng: 77.5995, zone: "Electronic City", address: "Hosur Rd, Electronic City Phase 1" },
    timestamp: ago(2), description: "Mugging reported near tech park. Victim's laptop bag stolen. Suspect description: male, blue hoodie, ~25 yrs.", source: "citizen", assignedUnitId: null, stationId: "STN-BLR-11",
    timeline: [{ time: ago(2), action: "Victim called helpline", by: "System" }],
  },
  {
    id: "INC-015", type: "Vandalism", severity: "medium", status: "dispatched",
    location: { lat: 12.9718, lng: 77.5953, zone: "Shivajinagar", address: "Palace Rd, Shivajinagar" },
    timestamp: ago(60), description: "Vehicle vandalism. 4 cars with tires slashed in government parking lot.", source: "citizen", assignedUnitId: "UNIT-12", stationId: "STN-BLR-06",
    timeline: [
      { time: ago(60), action: "Multiple complaints received", by: "System" },
      { time: ago(55), action: "Unit KSP-12 dispatched", by: "Dispatch" },
    ],
  },
  {
    id: "INC-016", type: "Fraud", severity: "high", status: "in-progress",
    location: { lat: 13.0120, lng: 77.5513, zone: "Peenya", address: "Peenya Industrial Area" },
    timestamp: ago(720), description: "Corporate fraud. Fake invoices worth ₹12L. Accounts frozen. 3 suspects identified.", source: "officer", assignedUnitId: "UNIT-11", stationId: "STN-BLR-12",
    timeline: [
      { time: ago(720), action: "Complaint from company MD", by: "System" },
      { time: ago(700), action: "Financial crimes unit assigned", by: "Inspector Raj" },
      { time: ago(400), action: "Suspects identified via bank records", by: "SI Deepa R" },
    ],
  },
  {
    id: "INC-017", type: "Assault", severity: "medium", status: "resolved",
    location: { lat: 12.9306, lng: 77.6762, zone: "Marathahalli", address: "Marathahalli Bridge" },
    timestamp: ago(2880), description: "Domestic disturbance escalated to assault. Mediation conducted. Shelter arranged for victim.", source: "citizen", assignedUnitId: "UNIT-04", stationId: "STN-BLR-02",
    timeline: [
      { time: ago(2880), action: "Neighbor complaint", by: "System" },
      { time: ago(2875), action: "Unit KSP-04 responded", by: "Dispatch" },
      { time: ago(2820), action: "Mediation completed. Case closed.", by: "SI Priya M" },
    ],
  },
  {
    id: "INC-018", type: "Theft", severity: "high", status: "in-progress",
    location: { lat: 12.9762, lng: 77.6033, zone: "Cubbon Park", address: "Cubbon Park Road, near Vidhana Soudha" },
    timestamp: ago(150), description: "Pickpocketing ring operating in tourist area. 6 complaints. CCTV analysis ongoing. 2 suspects identified.", source: "sensor", assignedUnitId: "UNIT-03", stationId: "STN-BLR-08",
    timeline: [
      { time: ago(150), action: "Pattern detected via AI analysis", by: "Prahari AI" },
      { time: ago(140), action: "Plainclothes unit deployed", by: "Inspector Raj" },
      { time: ago(80), action: "2 suspects ID'd on CCTV", by: "SI Kumar" },
    ],
  },
  {
    id: "INC-019", type: "Drug Offence", severity: "critical", status: "new",
    location: { lat: 13.0433, lng: 77.6101, zone: "Banaswadi", address: "Banaswadi Main Rd" },
    timestamp: ago(1), description: "Large consignment of narcotics intercepted at warehouse. Tip from CI. Backup required immediately.", source: "officer", assignedUnitId: null, stationId: "STN-BLR-05",
    timeline: [{ time: ago(1), action: "Undercover officer alert", by: "HC Suresh P" }],
  },
  {
    id: "INC-020", type: "Burglary", severity: "medium", status: "dispatched",
    location: { lat: 12.9102, lng: 77.5937, zone: "JP Nagar", address: "JP Nagar 6th Phase" },
    timestamp: ago(18), description: "House break-in while owners away. Neighbor noticed open door. Entry via backdoor. Forensics en route.", source: "citizen", assignedUnitId: "UNIT-07", stationId: "STN-BLR-07",
    timeline: [
      { time: ago(18), action: "Neighbor reported", by: "System" },
      { time: ago(15), action: "Unit KSP-07 dispatched", by: "Dispatch" },
    ],
  },
];

// Helper: fresh incidents (last 24 hours)
export const RECENT_INCIDENTS = INCIDENTS.filter(i => {
  const diff = (new Date().getTime() - new Date(i.timestamp).getTime()) / 60000;
  return diff <= 1440;
});

// Total non-resolved count
export const ACTIVE_INCIDENT_COUNT = INCIDENTS.filter(i => i.status !== "resolved").length;
