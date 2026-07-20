import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { motion, AnimatePresence } from "framer-motion";
import { SlidersHorizontal, X, Sun, Moon, MapPin, Filter } from "lucide-react";
import { ml } from "../lib/api";

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

const CATEGORY_COLORS: Record<string, { color: string; label: string }> = {
  THEFT: { color: "#F59E0B", label: "Theft" },
  BURGLARY: { color: "#FB923C", label: "Burglary" },
  VIOLENT: { color: "#EF4444", label: "Violent / Robbery" },
  CYBER: { color: "#06B6D4", label: "Cyber Crime" },
  NARCOTICS: { color: "#A855F7", label: "Narcotics" },
  OTHER: { color: "#10B981", label: "Other Offences" },
};

function getCrimeCategory(groupName: string) {
  const g = (groupName || "").toUpperCase();
  if (g.includes("THEFT")) return CATEGORY_COLORS.THEFT;
  if (g.includes("BURGLARY")) return CATEGORY_COLORS.BURGLARY;
  if (g.includes("ROBBERY") || g.includes("DACOITY") || g.includes("MURDER") || g.includes("HOMICIDE") || g.includes("HEINOUS") || g.includes("RIOTS")) {
    return CATEGORY_COLORS.VIOLENT;
  }
  if (g.includes("CYBER") || g.includes("CHEATING") || g.includes("FRAUD")) return CATEGORY_COLORS.CYBER;
  if (g.includes("NARCOTICS") || g.includes("DRUG") || g.includes("EXCISE")) return CATEGORY_COLORS.NARCOTICS;
  return CATEGORY_COLORS.OTHER;
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
  "BURGLARY - NIGHT",
  "BURGLARY - DAY",
  "CYBER CRIME",
  "ROBBERY",
  "CASES OF HURT",
  "KARNATAKA POLICE ACT 1963",
  "NARCOTICS CONTROL",
  "RIOTS",
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
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>("ALL");
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

  const filteredIncidents = incidentsList.filter((inc) => {
    if (selectedCategoryFilter === "ALL") return true;
    const cat = getCrimeCategory(inc.crime_group);
    if (selectedCategoryFilter === "THEFT") return cat.color === CATEGORY_COLORS.THEFT.color;
    if (selectedCategoryFilter === "BURGLARY") return cat.color === CATEGORY_COLORS.BURGLARY.color;
    if (selectedCategoryFilter === "VIOLENT") return cat.color === CATEGORY_COLORS.VIOLENT.color;
    if (selectedCategoryFilter === "CYBER") return cat.color === CATEGORY_COLORS.CYBER.color;
    if (selectedCategoryFilter === "NARCOTICS") return cat.color === CATEGORY_COLORS.NARCOTICS.color;
    return true;
  });

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

        {/* Distinct Color Coded Crime Markers across Karnataka */}
        {filteredIncidents.map((inc) => {
          const catInfo = getCrimeCategory(inc.crime_group);
          // Scale radius by zoom level and case count cleanly
          const baseRadius = mapZoom <= 8 ? 4 : mapZoom <= 10 ? 6 : 9;
          const radius = inc.case_count > 50 ? baseRadius + 3 : baseRadius;

          return (
            <CircleMarker
              key={inc.id}
              center={[inc.lat, inc.lng]}
              radius={radius}
              pathOptions={{
                color: catInfo.color,
                fillColor: catInfo.color,
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
                    <span className="font-bold text-xs" style={{ color: catInfo.color }}>
                      {inc.crime_group}
                    </span>
                    <span className="font-bold text-slate-900 font-mono text-xs">{inc.case_count} Cases</span>
                  </div>
                </div>
              </Popup>
            </CircleMarker>
          );
        })}
      </MapContainer>

      {/* ── Top Bar: State Stats & Theme Switcher ───────────── */}
      <div className="absolute top-4 left-4 z-[400] flex items-center gap-3 flex-wrap">
        <div className="px-4 py-2 rounded-xl bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white text-xs font-mono shadow-xl flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-semibold">Karnataka FIR Hotspots:</span>
          <span className="font-bold text-amber-600 dark:text-amber-400 text-sm">{filteredIncidents.length} Stations</span>
        </div>

        {/* Light / Dark Map Tile Switcher */}
        <button
          type="button"
          onClick={() => setMapTheme(mapTheme === "dark" ? "light" : "dark")}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border border-slate-200 dark:border-white/10 text-xs font-bold text-slate-800 dark:text-white shadow-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition"
        >
          {mapTheme === "dark" ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-blue-600" />}
          <span>{mapTheme === "dark" ? "Light Map" : "Dark Map"}</span>
        </button>
      </div>

      {/* ── Category Quick Filter Bar (Top Right) ───────────── */}
      <div className="absolute top-4 right-16 z-[400] hidden md:flex items-center gap-1.5 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl p-1.5 rounded-xl border border-slate-200 dark:border-white/10 shadow-xl text-xs font-bold">
        <button
          type="button"
          onClick={() => setSelectedCategoryFilter("ALL")}
          className={`px-3 py-1.5 rounded-lg transition ${selectedCategoryFilter === "ALL" ? "bg-slate-900 dark:bg-white text-white dark:text-black shadow-sm" : "text-slate-600 dark:text-white/60 hover:text-slate-900 dark:hover:text-white"}`}
        >
          All
        </button>
        <button
          type="button"
          onClick={() => setSelectedCategoryFilter("THEFT")}
          className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${selectedCategoryFilter === "THEFT" ? "bg-amber-500 text-black shadow-sm font-extrabold" : "text-slate-700 dark:text-white/70 hover:text-amber-500"}`}
        >
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" /> Theft
        </button>
        <button
          type="button"
          onClick={() => setSelectedCategoryFilter("BURGLARY")}
          className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${selectedCategoryFilter === "BURGLARY" ? "bg-orange-500 text-black shadow-sm font-extrabold" : "text-slate-700 dark:text-white/70 hover:text-orange-500"}`}
        >
          <span className="w-2.5 h-2.5 rounded-full bg-orange-500 inline-block" /> Burglary
        </button>
        <button
          type="button"
          onClick={() => setSelectedCategoryFilter("VIOLENT")}
          className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${selectedCategoryFilter === "VIOLENT" ? "bg-red-500 text-white shadow-sm font-extrabold" : "text-slate-700 dark:text-white/70 hover:text-red-500"}`}
        >
          <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" /> Violent
        </button>
        <button
          type="button"
          onClick={() => setSelectedCategoryFilter("CYBER")}
          className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${selectedCategoryFilter === "CYBER" ? "bg-cyan-500 text-black shadow-sm font-extrabold" : "text-slate-700 dark:text-white/70 hover:text-cyan-500"}`}
        >
          <span className="w-2.5 h-2.5 rounded-full bg-cyan-500 inline-block" /> Cyber
        </button>
      </div>

      {/* ── Filter Toggle Button ─────────────────────────────── */}
      <button
        type="button"
        onClick={() => setShowFilters(!showFilters)}
        className="absolute top-4 right-4 z-[400] flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white text-xs font-bold shadow-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition"
      >
        <SlidersHorizontal className="w-4 h-4" />
        <span className="hidden sm:inline">Filter</span>
      </button>

      {/* ── High Contrast Filter Panel Drawer ────────────────── */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="absolute top-16 right-4 z-[400] w-80 rounded-2xl p-5 bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white shadow-2xl flex flex-col gap-4"
          >
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-2">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                <Filter className="w-4 h-4 text-blue-600 dark:text-amber-400" /> Filter Karnataka Map
              </h3>
              <button onClick={() => setShowFilters(false)} className="text-slate-500 dark:text-white/60 hover:text-slate-900 dark:hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* District Filter */}
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block mb-1.5">
                District / Commissionerate
              </label>
              <select
                value={selectedDistrict}
                onChange={(e) => setSelectedDistrict(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-white/20 text-slate-900 dark:text-white text-xs font-semibold outline-none focus:border-blue-500 dark:focus:border-amber-400 shadow-sm"
              >
                {KARNATAKA_DISTRICTS.map((d) => (
                  <option key={d} value={d} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                    {d}
                  </option>
                ))}
              </select>
            </div>

            {/* Crime Group Filter */}
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block mb-1.5">
                Specific Crime Group
              </label>
              <select
                value={selectedCrimeGroup}
                onChange={(e) => setSelectedCrimeGroup(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-white/20 text-slate-900 dark:text-white text-xs font-semibold outline-none focus:border-blue-500 dark:focus:border-amber-400 shadow-sm"
              >
                {CRIME_GROUPS.map((g) => (
                  <option key={g} value={g} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
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
                setSelectedCategoryFilter("ALL");
              }}
              className="w-full py-2.5 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 border border-slate-300 dark:border-white/10 text-xs font-bold text-slate-800 dark:text-white transition"
            >
              Reset All Filters
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Selected Incident Point Drawer ─────────────────── */}
      <AnimatePresence>
        {selectedPoint && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="absolute bottom-4 left-4 right-4 max-w-lg mx-auto z-[400] p-4 rounded-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border border-slate-200 dark:border-amber-500/30 text-slate-900 dark:text-white shadow-2xl flex items-center justify-between"
          >
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-slate-900 dark:text-white">{selectedPoint.station}</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase" style={{ backgroundColor: getCrimeCategory(selectedPoint.crime_group).color + "25", color: getCrimeCategory(selectedPoint.crime_group).color }}>
                  {getCrimeCategory(selectedPoint.crime_group).label}
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 font-medium mt-1">
                {selectedPoint.district} · <span className="font-mono">{selectedPoint.crime_group}</span>
              </p>
            </div>
            <div className="text-right">
              <span className="text-lg font-bold text-blue-700 dark:text-amber-400 font-mono">{selectedPoint.case_count}</span>
              <span className="text-[10px] block text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold">Total Cases</span>
            </div>
            <button onClick={() => setSelectedPoint(null)} className="ml-3 text-slate-400 hover:text-slate-900 dark:hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
