import { motion } from "framer-motion";
import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { AlertTriangle, Shield, Map as MapIcon, Activity } from "lucide-react";
import { useTheme } from "../theme-provider";

// Mock Hotspot Data for Karnataka
const HOTSPOTS = [
  { id: 1, city: "Bangalore", coords: [12.9716, 77.5946] as [number, number], risk: "extreme", incidents: 142 },
  { id: 2, city: "Mysore", coords: [12.2958, 76.6394] as [number, number], risk: "medium", incidents: 45 },
  { id: 3, city: "Hubli", coords: [15.3647, 75.1240] as [number, number], risk: "low", incidents: 12 },
  { id: 4, city: "Mangalore", coords: [12.9141, 74.8560] as [number, number], risk: "medium", incidents: 38 },
  { id: 5, city: "Belgaum", coords: [15.8497, 74.4977] as [number, number], risk: "low", incidents: 8 }
];

const KPI_DATA = [
  { label: "Active Alerts", value: "14", icon: AlertTriangle, color: "text-red-500" },
  { label: "Patrol Units", value: "86", icon: Shield, color: "text-green-500" },
  { label: "High Risk Zones", value: "2", icon: MapIcon, color: "text-orange-500" },
  { label: "System Health", value: "99%", icon: Activity, color: "text-blue-500" }
];

export default function KpiMap() {
  const { theme } = useTheme();

  // Determine if the OS/App is in dark mode to swap the map tiles
  const isDark = theme === "dark" || (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  
  // CartoDB tiles provide a very clean, minimal look matching your UI
  const tileUrl = isDark 
    ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
    : "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";

  const getRiskColor = (risk: string) => {
    if (risk === "extreme") return "#EF4444"; // Red
    if (risk === "medium") return "#F59E0B";  // Orange
    return "#10B981";                         // Green
  };

  return (
    <div className="w-full max-w-6xl mx-auto p-4 md:p-6 flex flex-col gap-6 relative z-10">
      
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {KPI_DATA.map((kpi, idx) => (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            key={idx}
            className="flex items-center gap-4 p-4 rounded-2xl bg-white dark:bg-black border border-neutral-200 dark:border-neutral-800 shadow-sm"
          >
            <div className={`p-3 rounded-xl bg-neutral-100 dark:bg-neutral-900 ${kpi.color}`}>
              <kpi.icon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">{kpi.label}</p>
              <h3 className="text-2xl font-bold text-black dark:text-white">{kpi.value}</h3>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Interactive Map */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.4 }}
        className="w-full h-[400px] rounded-3xl overflow-hidden border border-neutral-200 dark:border-neutral-800 shadow-sm relative z-0"
      >
        <MapContainer 
          center={[14.5, 76.5]} // Centered on Karnataka
          zoom={7} 
          style={{ height: "100%", width: "100%" }}
          zoomControl={false}
        >
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
                  <p className="text-xs text-neutral-600">Incidents: <strong>{spot.incidents}</strong></p>
                </div>
              </Popup>
            </CircleMarker>
          ))}
        </MapContainer>
      </motion.div>
    </div>
  );
}