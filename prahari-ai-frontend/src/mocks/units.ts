import type { PatrolUnit } from "./types";

export const UNITS: PatrolUnit[] = [
  {
    id: "UNIT-01", callsign: "KSP-Alpha-01", officers: ["Inspector Rajesh Kumar", "HC Suresh P"],
    vehicle: "Bolero (KA-51-G-1234)", status: "responding", zone: "Banashankari",
    stationId: "STN-BLR-07", position: { lat: 12.9141, lng: 77.6101 },
    shiftStart: "06:00", shiftEnd: "14:00", incidentsThisMonth: 28, avgResponseTime: 7.2,
    sparkline: [4, 3, 5, 2, 4, 6, 4],
  },
  {
    id: "UNIT-02", callsign: "KSP-Bravo-02", officers: ["SI Ravi Chandra", "PC Anil T"],
    vehicle: "Mahindra Thar (KA-01-P-5678)", status: "on-patrol", zone: "Jayanagar",
    stationId: "STN-BLR-04", position: { lat: 12.9279, lng: 77.6271 },
    shiftStart: "14:00", shiftEnd: "22:00", incidentsThisMonth: 19, avgResponseTime: 9.1,
    sparkline: [2, 3, 2, 4, 3, 2, 3],
  },
  {
    id: "UNIT-03", callsign: "KSP-Charlie-03", officers: ["Cpl. Ramesh Kumar", "PC Vinod S"],
    vehicle: "Innova (KA-01-Q-9012)", status: "responding", zone: "Koramangala",
    stationId: "STN-BLR-01", position: { lat: 12.9350, lng: 77.6245 },
    shiftStart: "06:00", shiftEnd: "14:00", incidentsThisMonth: 34, avgResponseTime: 6.5,
    sparkline: [5, 6, 4, 7, 5, 4, 3],
  },
  {
    id: "UNIT-04", callsign: "KSP-Delta-04", officers: ["SI Priya Menon"],
    vehicle: "Swift (KA-05-R-3456)", status: "on-patrol", zone: "Ejipura",
    stationId: "STN-BLR-01", position: { lat: 12.9580, lng: 77.6430 },
    shiftStart: "22:00", shiftEnd: "06:00", incidentsThisMonth: 22, avgResponseTime: 8.3,
    sparkline: [3, 4, 2, 3, 4, 2, 4],
  },
  {
    id: "UNIT-05", callsign: "KSP-Echo-05", officers: ["HC Suresh Patil", "PC Ganesh R"],
    vehicle: "Bolero (KA-51-H-7890)", status: "on-patrol", zone: "Hebbal",
    stationId: "STN-BLR-05", position: { lat: 13.0358, lng: 77.5970 },
    shiftStart: "14:00", shiftEnd: "22:00", incidentsThisMonth: 15, avgResponseTime: 11.0,
    sparkline: [2, 1, 3, 2, 1, 2, 4],
  },
  {
    id: "UNIT-06", callsign: "KSP-Foxtrot-06", officers: ["SI Kumar B", "HC Deepak N"],
    vehicle: "Bolero (KA-01-S-2345)", status: "on-patrol", zone: "Yelahanka",
    stationId: "STN-BLR-10", position: { lat: 13.0671, lng: 77.5964 },
    shiftStart: "06:00", shiftEnd: "14:00", incidentsThisMonth: 18, avgResponseTime: 10.2,
    sparkline: [2, 3, 2, 4, 2, 3, 2],
  },
  {
    id: "UNIT-07", callsign: "KSP-Golf-07", officers: ["HC Mohan Rao", "PC Santhosh K"],
    vehicle: "Tata Safari (KA-03-T-6789)", status: "on-patrol", zone: "BTM Layout",
    stationId: "STN-BLR-02", position: { lat: 12.9102, lng: 77.6101 },
    shiftStart: "22:00", shiftEnd: "06:00", incidentsThisMonth: 25, avgResponseTime: 7.8,
    sparkline: [4, 3, 4, 5, 3, 4, 2],
  },
  {
    id: "UNIT-08", callsign: "KSP-Hotel-08", officers: ["SI Deepa Reddy"],
    vehicle: "Innova (KA-09-U-0123)", status: "on-break", zone: "Whitefield",
    stationId: "STN-BLR-09", position: { lat: 12.9952, lng: 77.7135 },
    shiftStart: "14:00", shiftEnd: "22:00", incidentsThisMonth: 12, avgResponseTime: 12.5,
    sparkline: [1, 2, 1, 2, 2, 1, 3],
  },
  {
    id: "UNIT-09", callsign: "KSP-India-09", officers: ["ASI Vikram Kumar", "PC Manjunath T"],
    vehicle: "Swift (KA-01-V-4567)", status: "on-patrol", zone: "Rajajinagar",
    stationId: "STN-BLR-06", position: { lat: 12.9623, lng: 77.5497 },
    shiftStart: "06:00", shiftEnd: "14:00", incidentsThisMonth: 20, avgResponseTime: 8.9,
    sparkline: [3, 2, 4, 2, 3, 2, 3],
  },
  {
    id: "UNIT-10", callsign: "KSP-Juliet-10", officers: ["HC Anand Krishnan"],
    vehicle: "Motorcycle (KA-01-W-8901)", status: "on-patrol", zone: "Domlur",
    stationId: "STN-BLR-03", position: { lat: 12.9810, lng: 77.6408 },
    shiftStart: "14:00", shiftEnd: "22:00", incidentsThisMonth: 30, avgResponseTime: 5.5,
    sparkline: [5, 4, 6, 3, 5, 4, 3],
  },
  {
    id: "UNIT-11", callsign: "KSP-Kilo-11", officers: ["SI Deepa Reddy", "HC Naveen G"],
    vehicle: "Bolero (KA-05-X-2345)", status: "on-patrol", zone: "Cybercrime Division",
    stationId: "STN-BLR-12", position: { lat: 12.9719, lng: 77.5937 },
    shiftStart: "09:00", shiftEnd: "18:00", incidentsThisMonth: 8, avgResponseTime: 30.0,
    sparkline: [1, 1, 2, 1, 0, 1, 2],
  },
  {
    id: "UNIT-12", callsign: "KSP-Lima-12", officers: ["PC Rajan B", "PC Sathish V"],
    vehicle: "Bolero (KA-01-Y-6789)", status: "off-duty", zone: "Shivajinagar",
    stationId: "STN-BLR-06", position: { lat: 12.9718, lng: 77.5953 },
    shiftStart: "22:00", shiftEnd: "06:00", incidentsThisMonth: 16, avgResponseTime: 9.7,
    sparkline: [2, 3, 1, 2, 3, 2, 3],
  },
];

export const ON_DUTY_COUNT = UNITS.filter(u => u.status !== "off-duty").length;
export const OFF_DUTY_COUNT = UNITS.filter(u => u.status === "off-duty").length;
