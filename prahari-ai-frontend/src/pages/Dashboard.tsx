import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { AlertTriangle, Shield, Map as MapIcon, Activity, Lock, Users, FileWarning, Crosshair, ShieldCheck } from "lucide-react";
import { useTheme } from "../components/theme-provider";

// Clearance Levels for RBAC
type ClearanceLevel = "Officer" | "Inspector" | "Commander";

const HOTSPOTS = [
  { id: 1, city: "Bangalore", coords: [12.9716, 77.5946] as [number, number], risk: "extreme", incidents: 142 },
  { id: 2, city: "Mysore", coords: [12.2958, 76.6394] as [number, number], risk: "medium", incidents: 45 },
  { id: 3, city: "Vellore", coords: [12.9165, 79.1325] as [number, number], risk: "low", incidents: 12 }, // Local context
  { id: 4, city: "Mangalore", coords: [12.9141, 74.8560] as [number, number], risk: "medium", incidents: 38 }
];

const KPI_DATA = [
  { label: "Active Alerts", value: "14", icon: AlertTriangle, color: "text-red-500", req: "Officer" },
  { label: "Patrol Units", value: "86", icon: Shield, color: "text-green-500", req: "Officer" },
  { label: "High Risk Zones", value: "2", icon: MapIcon, color: "text-orange-500", req: "Officer" },
  { label: "Classified Ops", value: "3", icon: Crosshair, color: "text-purple-500", req: "Commander" }
];

export default function KpiDashboard() {
  const { theme } = useTheme();
  const [role, setRole] = useState<ClearanceLevel>("Inspector"); // Default role

  const isDark = theme === "dark" || (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  const tileUrl = isDark 
    ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
    : "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";

  const getRiskColor = (risk: string) => {
    if (risk === "extreme") return "#EF4444"; 
    if (risk === "medium") return "#F59E0B";  
    return "#10B981";                         
  };

  // Helper to check if current role has access
  const hasAccess = (requiredLevel: ClearanceLevel) => {
    const levels = { "Officer": 1, "Inspector": 2, "Commander": 3 };
    return levels[role] >= levels[requiredLevel];
  };

  return (
    <div className="w-full h-full p-4 md:p-6 flex flex-col gap-6 overflow-y-auto scrollbar-hide relative z-10">
      
      {/* 1. Clearance Level Simulator (For Demo Purposes) */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-neutral-100 dark:bg-neutral-900/50 p-4 rounded-2xl border border-neutral-200 dark:border-neutral-800">
        <div>
          <h2 className="text-lg font-bold text-black dark:text-white flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-blue-500" /> Tactical Overview
          </h2>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">Current Authorization: <strong className="text-black dark:text-white uppercase tracking-wider">{role}</strong></p>
        </div>
        <div className="flex bg-white dark:bg-black rounded-lg p-1 border border-neutral-200 dark:border-neutral-800 shadow-sm">
          {(["Officer", "Inspector", "Commander"] as ClearanceLevel[]).map((r) => (
            <button
              key={r}
              onClick={() => setRole(r)}
              className={`px-4 py-1.5 text-xs font-bold uppercase tracking-wider rounded-md transition-all ${
                role === r 
                  ? "bg-black dark:bg-white text-white dark:text-black shadow-sm" 
                  : "text-neutral-500 hover:text-black dark:hover:text-white"
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* 2. Top KPI Strip (Dynamically masked based on RBAC) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {KPI_DATA.map((kpi, idx) => (
          <div key={idx} className="relative overflow-hidden rounded-2xl bg-white dark:bg-neutral-900/50 border border-neutral-200 dark:border-neutral-800 shadow-sm p-4 flex items-center gap-4">
            
            {/* Restricted Overlay Logic */}
            {!hasAccess(kpi.req as ClearanceLevel) && (
              <div className="absolute inset-0 bg-white/60 dark:bg-black/60 backdrop-blur-md flex flex-col items-center justify-center z-10">
                <Lock className="w-5 h-5 text-neutral-500 dark:text-neutral-400 mb-1" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-600 dark:text-neutral-300">Level: {kpi.req}</span>
              </div>
            )}

            <div className={`p-3 rounded-xl bg-neutral-100 dark:bg-black border border-neutral-200 dark:border-neutral-800 ${kpi.color}`}>
              <kpi.icon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">{kpi.label}</p>
              <h3 className="text-2xl font-bold text-black dark:text-white">{kpi.value}</h3>
            </div>
          </div>
        ))}
      </div>

      {/* 3. Main Dashboard Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Map Panel (Spans 2 columns) */}
        <div className="lg:col-span-2 flex flex-col rounded-3xl overflow-hidden border border-neutral-200 dark:border-neutral-800 shadow-sm bg-white dark:bg-neutral-900/50 h-[500px] relative">
          <div className="p-4 border-b border-neutral-200 dark:border-neutral-800 flex justify-between items-center bg-white/50 dark:bg-black/50 backdrop-blur-md absolute top-0 left-0 right-0 z-[400]">
            <h3 className="font-bold text-sm tracking-wide text-black dark:text-white">LIVE HOTSPOT TRACKING</h3>
            <span className="flex h-3 w-3 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
            </span>
          </div>
          
          <div className="flex-1 w-full h-full pt-14">
            <MapContainer center={[13.5, 77.0]} zoom={7} style={{ height: "100%", width: "100%" }} zoomControl={false}>
              <TileLayer url={tileUrl} />
              {HOTSPOTS.map((spot) => (
                <CircleMarker
                  key={spot.id}
                  center={spot.coords}
                  radius={spot.risk === "extreme" ? 12 : spot.risk === "medium" ? 8 : 6}
                  pathOptions={{
                    color: getRiskColor(spot.risk),
                    fillColor: getRiskColor(spot.risk),
                    fillOpacity: 0.6,
                    weight: 2
                  }}
                >
                  <Popup className="font-['Ubuntu']">
                    <div className="text-center">
                      <h4 className="font-bold text-sm text-neutral-900">{spot.city}</h4>
                      <p className="text-xs text-neutral-600 mt-1">Risk: <strong className="uppercase">{spot.risk}</strong></p>
                    </div>
                  </Popup>
                </CircleMarker>
              ))}
            </MapContainer>
          </div>
        </div>

        {/* Side Panels (Role Based) */}
        <div className="flex flex-col gap-6">
          
          {/* Active Warrants (Requires Inspector Level) */}
          <div className="flex-1 rounded-3xl bg-white dark:bg-neutral-900/50 border border-neutral-200 dark:border-neutral-800 shadow-sm p-5 relative overflow-hidden flex flex-col">
            <div className="flex items-center gap-2 mb-4">
              <FileWarning className="w-5 h-5 text-orange-500" />
              <h3 className="font-bold text-sm tracking-wide text-black dark:text-white">HIGH-PROFILE WARRANTS</h3>
            </div>

            {!hasAccess("Inspector") ? (
               // RESTRICTED VIEW
              <div className="absolute inset-0 bg-white/80 dark:bg-black/80 backdrop-blur-xl flex flex-col items-center justify-center z-10">
                <Lock className="w-8 h-8 text-red-500 mb-2" />
                <p className="text-red-500 font-bold tracking-widest uppercase text-sm">Restricted Data</p>
                <p className="text-neutral-500 dark:text-neutral-400 text-xs mt-1 font-medium">Inspector Clearance Required</p>
              </div>
            ) : (
               // AUTHORIZED VIEW
              <div className="flex flex-col gap-3 flex-1 overflow-y-auto pr-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="p-3 rounded-xl bg-neutral-100 dark:bg-black border border-neutral-200 dark:border-neutral-800 flex justify-between items-center">
                    <div>
                      <p className="text-xs font-bold text-black dark:text-white">ID: #WRT-{890 + i}</p>
                      <p className="text-[10px] text-neutral-500 mt-1 uppercase">Target Identified</p>
                    </div>
                    <button className="text-xs font-bold text-blue-500 bg-blue-500/10 px-3 py-1 rounded-md">VIEW</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Undercover Assets (Requires Commander Level) */}
          <div className="flex-1 rounded-3xl bg-white dark:bg-neutral-900/50 border border-neutral-200 dark:border-neutral-800 shadow-sm p-5 relative overflow-hidden flex flex-col">
            <div className="flex items-center gap-2 mb-4">
              <Users className="w-5 h-5 text-purple-500" />
              <h3 className="font-bold text-sm tracking-wide text-black dark:text-white">UNDERCOVER ASSETS</h3>
            </div>

            {!hasAccess("Commander") ? (
              // RESTRICTED VIEW
              <div className="absolute inset-0 bg-white/80 dark:bg-black/80 backdrop-blur-xl flex flex-col items-center justify-center z-10 border border-red-500/20">
                <Lock className="w-8 h-8 text-red-500 mb-2" />
                <p className="text-red-500 font-bold tracking-widest uppercase text-sm">Classified</p>
                <p className="text-neutral-500 dark:text-neutral-400 text-xs mt-1 font-medium text-center px-4">Commander Clearance Required for Asset Visibility</p>
              </div>
            ) : (
              // AUTHORIZED VIEW
              <div className="flex flex-col gap-3">
                <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20 text-center">
                  <p className="text-sm font-bold text-purple-600 dark:text-purple-400">3 ASSETS DEPLOYED</p>
                  <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-1">Sector 4 and 7</p>
                </div>
                <div className="h-2 w-full bg-neutral-200 dark:bg-neutral-800 rounded-full overflow-hidden mt-2">
                   <div className="h-full bg-purple-500 w-[60%] rounded-full animate-pulse"></div>
                </div>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}