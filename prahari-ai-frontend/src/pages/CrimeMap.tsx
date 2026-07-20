import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { motion, AnimatePresence } from "framer-motion";
import { SlidersHorizontal, X, Layers, Map, Zap, Shield, Sun, Moon, MapPin } from "lucide-react";
import { SeverityBadge } from "../components/StatusBadge";
import { ml } from "../lib/api";

const SEVERITY_COLORS = {
  critical: "#D14343",
  high: "#F97316",
  medium: "#C9A227",
  low: "#2E9E6C",
};

interface MapPoint {
  id: string;
  district: string;
  station: string;
  crime_group: string;
  case_count: number;
  severity: "critical" | "high" | "medium" | "low";
  lat: number;
  lng: number;
}

const KARNATAKA_DISTRICTS = [
  "All Karnataka",
  "Bengaluru City",
  "Hubballi Dharwad City",
  "Mysuru City",
  "Belagavi Dist",
  "Belagavi City",
  "Tumakuru",
  "Mangaluru City",
  "Dakshina Kannada",
  "Udupi",
  "Shivamogga",
  "Bidar",
  "Vijayapur",
  "Davanagere",
  "Ballari",
  "Kalaburagi City",
  "Kalaburagi",
  "Uttara Kannada",
  "Chikkamagaluru",
  "Bagalkot",
  "Raichur",
  "Hassan",
  "Kodagu",
  "Koppal",
  "Haveri",
  "Mysuru Dist",
  "Gadag",
  "Chickballapura",
  "Chamarajanagar",
  "Ramanagara",
  "Mandya",
  "Dharwad",
  "Yadgir",
  "Chitradurga",
  "K.G.F",
  "Vijayanagara",
  "Kolar",
];

const CRIME_GROUPS = [
  "All Crime Groups",
  "THEFT",
  "BURGLARY - DAY",
  "BURGLARY - NIGHT",
  "CYBER CRIME",
  "ROBBERY",
  "HEINOUS CRIME",
  "CRIMINAL TRESPASS",
  "RIOTS",
  "NARCOTICS CONTROL",
  "ACCIDENT",
];

function MapController({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom, { animate: true });
  }, [center, zoom, map]);
  return null;
}

export default function CrimeMap() {
  const [searchParams] = useSearchParams();
  const districtParam = searchParams.get("district");
  const [selectedDistrict, setSelectedDistrict] = useState<string>(districtParam || "All Karnataka");
  const [selectedCrimeGroup, setSelectedCrimeGroup] = useState<string>("All Crime Groups");
  const [showFilters, setShowFilters] = useState(false);
  const [mapTheme, setMapTheme] = useState<"dark" | "light">("dark");
  const [selectedPoint, setSelectedPoint] = useState<MapPoint | null>(null);

  const [incidentsList, setIncidentsList] = useState<MapPoint[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [mapCenter, setMapCenter] = useState<[number, number]>([14.5, 75.8]); // Karnataka Center
  const [mapZoom, setMapZoom] = useState(7);

  useEffect(() => {
    fetchMapData();
  }, [selectedDistrict, selectedCrimeGroup]);

  const fetchMapData = async () => {
    setLoading(true);
    try {
      const dist = selectedDistrict === "All Karnataka" ? undefined : selectedDistrict;
      const group = selectedCrimeGroup === "All Crime Groups" ? undefined : selectedCrimeGroup;
      const res = await ml.mapIncidents(dist, group);
      setIncidentsList(res.incidents);
      setTotalCount(res.total);

      // If specific district selected, center to first point
      if (dist && res.incidents.length > 0) {
        setMapCenter([res.incidents[0].lat, res.incidents[0].lng]);
        setMapZoom(11);
      } else {
        setMapCenter([14.5, 75.8]);
        setMapZoom(7);
      }
    } catch (err) {
      console.error("Failed to load map data from backend", err);
    } finally {
      setLoading(false);
    }
  };

  const tileUrl = mapTheme === "dark"
    ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
    : "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png";

  return (
    <div className="relative w-full h-full min-h-[500px]">
      {/* ── Leaflet Map ──────────────────────────────────────── */}
      <MapContainer
        center={mapCenter}
        zoom={mapZoom}
        style={{ width: "100%", height: "100%" }}
        zoomControl={false}
      >
        <TileLayer
          url={tileUrl}
          attribution='&copy; <a href="https://carto.com">CARTO</a>'
        />
        <MapController center={mapCenter} zoom={mapZoom} />

        {/* Real Geospatial Incident Circle Markers across Karnataka */}
        {incidentsList.map((inc) => (
          <CircleMarker
            key={inc.id}
            center={[inc.lat, inc.lng]}
            radius={inc.severity === "critical" ? 12 : inc.severity === "high" ? 9 : 6}
            pathOptions={{
              color: SEVERITY_COLORS[inc.severity],
              fillColor: SEVERITY_COLORS[inc.severity],
              fillOpacity: 0.75,
              weight: 1.5,
            }}
            eventHandlers={{ click: () => setSelectedPoint(inc) }}
          >
            <Popup className="prahari-popup">
              <div className="p-2 text-xs font-sans text-slate-900">
                <div className="flex items-center gap-1.5 font-bold text-sm text-blue-900 mb-1">
                  <MapPin className="w-3.5 h-3.5 text-blue-600" />
                  {inc.station}
                </div>
                <div className="text-slate-600 font-semibold mb-1">{inc.district}</div>
                <div className="flex items-center justify-between gap-2 mt-2 pt-1 border-t border-slate-200">
                  <span className="text-slate-500 font-mono text-[11px]">{inc.crime_group}</span>
                  <span className="font-bold text-blue-700 font-mono text-xs">{inc.case_count} Cases</span>
                </div>
              </div>
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>

      {/* ── Top Bar Controls: Stats & Theme Toggle ──────────── */}
      <div className="absolute top-4 left-4 z-[400] flex items-center gap-3 flex-wrap">
        <div className="px-4 py-2 rounded-xl bg-slate-900/90 dark:bg-black/80 backdrop-blur-xl border border-white/10 text-white text-xs font-mono shadow-xl flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>Karnataka State FIR Hotspots:</span>
          <span className="font-bold text-amber-400 text-sm">{totalCount} Station Clusters</span>
        </div>

        {/* Light / Dark Mode Map Layer Switcher */}
        <button
          type="button"
          onClick={() => setMapTheme(mapTheme === "dark" ? "light" : "dark")}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900/90 dark:bg-black/80 backdrop-blur-xl border border-white/10 text-xs font-semibold text-white shadow-xl hover:bg-slate-800 transition"
        >
          {mapTheme === "dark" ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-blue-400" />}
          <span>{mapTheme === "dark" ? "Light Map" : "Dark Map"}</span>
        </button>
      </div>

      {/* ── Filter Toggle Button ─────────────────────────────── */}
      <button
        type="button"
        onClick={() => setShowFilters(!showFilters)}
        className="absolute top-4 right-4 z-[400] flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900/90 dark:bg-black/80 backdrop-blur-xl border border-white/10 text-white text-xs font-bold shadow-xl hover:bg-slate-800 transition"
      >
        <SlidersHorizontal className="w-4 h-4" />
        Filter State
        {(selectedDistrict !== "All Karnataka" || selectedCrimeGroup !== "All Crime Groups") && (
          <span className="w-2 h-2 rounded-full bg-amber-400" />
        )}
      </button>

      {/* ── Filter Panel Drawer ─────────────────────────────── */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="absolute top-16 right-4 z-[400] w-72 rounded-2xl p-4 bg-slate-900/95 dark:bg-black/90 backdrop-blur-2xl border border-white/10 text-white shadow-2xl flex flex-col gap-4"
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <h3 className="font-bold text-sm text-amber-400 flex items-center gap-1.5">
                <MapPin className="w-4 h-4" /> Filter Karnataka Map
              </h3>
              <button onClick={() => setShowFilters(false)} className="text-white/60 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* District Filter */}
            <div>
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-1">
                District / Commissionerate
              </label>
              <select
                value={selectedDistrict}
                onChange={(e) => setSelectedDistrict(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-white/10 border border-white/20 text-white text-xs outline-none focus:border-amber-400"
              >
                {KARNATAKA_DISTRICTS.map((d) => (
                  <option key={d} value={d} className="bg-slate-900 text-white">
                    {d}
                  </option>
                ))}
              </select>
            </div>

            {/* Crime Group Filter */}
            <div>
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-1">
                Crime Group
              </label>
              <select
                value={selectedCrimeGroup}
                onChange={(e) => setSelectedCrimeGroup(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-white/10 border border-white/20 text-white text-xs outline-none focus:border-amber-400"
              >
                {CRIME_GROUPS.map((g) => (
                  <option key={g} value={g} className="bg-slate-900 text-white">
                    {g}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={() => {
                setSelectedDistrict("All Karnataka");
                setSelectedCrimeGroup("All Crime Groups");
              }}
              className="w-full py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-white/70 transition"
            >
              Reset Filters
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Selected Incident Details Drawer ─────────────────── */}
      <AnimatePresence>
        {selectedPoint && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="absolute bottom-4 left-4 right-4 max-w-lg mx-auto z-[400] p-4 rounded-2xl bg-slate-900/95 dark:bg-black/90 backdrop-blur-2xl border border-amber-500/30 text-white shadow-2xl flex items-center justify-between"
          >
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-white">{selectedPoint.station}</span>
                <SeverityBadge severity={selectedPoint.severity} />
              </div>
              <p className="text-xs text-slate-300 font-medium mt-0.5">
                {selectedPoint.district} · <span className="text-amber-400 font-mono">{selectedPoint.crime_group}</span>
              </p>
            </div>
            <div className="text-right">
              <span className="text-lg font-bold text-emerald-400 font-mono">{selectedPoint.case_count}</span>
              <span className="text-[10px] block text-slate-400 uppercase tracking-wider font-semibold">Total Cases</span>
            </div>
            <button onClick={() => setSelectedPoint(null)} className="ml-3 text-white/60 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
