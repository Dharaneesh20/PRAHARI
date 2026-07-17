import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { motion, AnimatePresence } from "framer-motion";
import { SlidersHorizontal, X, Layers, Map, Zap, Shield } from "lucide-react";
import { glassPanelStyle } from "../components/GlassCard";
import { SeverityBadge, IncidentStatusBadge } from "../components/StatusBadge";
import type { CrimeType, Severity, Incident, PatrolUnit, HotspotZone } from "../lib/types";
import { incidents as incidentsApi, units as unitsApi, kpi as kpiApi } from "../lib/api";
import { mockHotspots, mockIncidents, mockUnits } from "../data/mockData";

const SEVERITY_COLORS: Record<Severity, string> = {
  critical: "#D14343", high: "#F97316", medium: "#C9A227", low: "#2E9E6C",
};

function MapZoomToZone({ zone, incidents }: { zone: string | null; incidents: Incident[] }) {
  const map = useMap();
  useEffect(() => {
    if (!zone) return;
    const incident = incidents.find(i => i.location.zone.toLowerCase() === zone.toLowerCase());
    if (incident) {
      map.setView([incident.location.lat, incident.location.lng], 14, { animate: true });
    }
  }, [zone, map, incidents]);
  return null;
}

function timeAgo(ts: string) {
  const diff = (Date.now() - new Date(ts).getTime()) / 60000;
  if (diff < 60) return `${Math.round(diff)}m ago`;
  if (diff < 1440) return `${Math.round(diff / 60)}h ago`;
  return `${Math.round(diff / 1440)}d ago`;
}

export default function CrimeMap() {
  const [searchParams] = useSearchParams();
  const zoneParam = searchParams.get("zone");
  const [showFilters, setShowFilters] = useState(false);
  const [selectedTypes, setSelectedTypes] = useState<CrimeType[]>([]);
  const [layers, setLayers] = useState({ markers: true, patrol: false, heatmap: false });
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);

  const [incidentsList, setIncidentsList] = useState<Incident[]>([]);
  const [unitsList, setUnitsList] = useState<PatrolUnit[]>([]);
  const [hotspotsList, setHotspotsList] = useState<HotspotZone[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([incidentsApi.list(), unitsApi.list(), kpiApi.hotspots()])
      .then(([inc, u, hs]) => { setIncidentsList(inc); setUnitsList(u); setHotspotsList(hs); })
      .catch(err => {
        console.error(err);
        setIncidentsList(mockIncidents);
        setUnitsList(mockUnits);
        setHotspotsList(mockHotspots);
      })
      .finally(() => setLoading(false));
  }, []);

  const toggleType = (t: CrimeType) =>
    setSelectedTypes(p => p.includes(t) ? p.filter(x => x !== t) : [...p, t]);

  const filtered = incidentsList.filter(i =>
    selectedTypes.length === 0 || selectedTypes.includes(i.type)
  );
  const crimeTypes = Array.from(new Set(incidentsList.map(incident => incident.type))).sort();

  if (loading) return <div className="flex items-center justify-center h-full" style={{ color: "rgba(255,255,255,0.4)" }}><p>Loading map data...</p></div>;

  return (
    <div className="relative w-full h-full">
      {/* ── Map ──────────────────────────────────────────────── */}
      <MapContainer
        center={[12.97, 77.60]}
        zoom={12}
        style={{ width: "100%", height: "100%" }}
        zoomControl={false}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://carto.com">CARTO</a>'
        />
        <MapZoomToZone zone={zoneParam} incidents={incidentsList} />

        {/* Incident markers */}
        {layers.markers && filtered.map(inc => (
          <CircleMarker
            key={inc.id}
            center={[inc.location.lat, inc.location.lng]}
            radius={inc.severity === "critical" ? 13 : inc.severity === "high" ? 10 : 7}
            pathOptions={{
              color: SEVERITY_COLORS[inc.severity],
              fillColor: SEVERITY_COLORS[inc.severity],
              fillOpacity: 0.65,
              weight: 2,
            }}
            eventHandlers={{ click: () => setSelectedIncident(inc) }}
          >
            <Popup className="prahari-popup">
              <div className="text-xs text-gray-900 font-medium p-1">
                <strong>{inc.type}</strong><br />
                {inc.location.zone}<br />
                {timeAgo(inc.timestamp)}
              </div>
            </Popup>
          </CircleMarker>
        ))}

        {/* Patrol unit markers */}
        {layers.patrol && unitsList.filter(u => u.status !== "off-duty").map(u => (
          <CircleMarker
            key={u.id}
            center={[u.position.lat, u.position.lng]}
            radius={7}
            pathOptions={{ color: "#2E9E6C", fillColor: "#2E9E6C", fillOpacity: 0.8, weight: 2 }}
          >
            <Popup><div className="text-xs p-1"><strong>{u.callsign}</strong><br />{u.zone}</div></Popup>
          </CircleMarker>
        ))}

        {/* Hotspot zones */}
        {layers.heatmap && hotspotsList.map((spot, i) => (
          <CircleMarker
            key={`hotspot-${i}`}
            center={[spot.coords.lat, spot.coords.lng]}
            radius={spot.severity === "critical" ? 20 : spot.severity === "high" ? 15 : 10}
            pathOptions={{
              color: SEVERITY_COLORS[spot.severity],
              fillColor: SEVERITY_COLORS[spot.severity],
              fillOpacity: 0.4,
              weight: 0
            }}
          >
            <Popup className="prahari-popup">
              <div className="text-center p-1">
                <h4 className="font-bold text-sm" style={{ color: "#000" }}>{spot.zone}</h4>
                <p className="text-xs mt-1" style={{ color: "#333" }}>Risk: <strong className="uppercase">{spot.severity}</strong></p>
                <p className="text-xs" style={{ color: "#333" }}>Incidents: <strong>{spot.incidents}</strong></p>
              </div>
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>

      {/* ── Layer Toggle ─────────────────────────────────────── */}
      <div className="absolute top-4 left-4 z-[400] flex flex-col gap-2">
        {[
          { key: "markers" as const, icon: <Zap className="w-4 h-4" />, label: "Incidents" },
          { key: "patrol" as const, icon: <Shield className="w-4 h-4" />, label: "Patrol" },
          { key: "heatmap" as const, icon: <Map className="w-4 h-4" />, label: "Hotspots" },
        ].map(({ key, icon, label }) => (
          <button
            key={key}
            onClick={() => setLayers(p => ({ ...p, [key]: !p[key] }))}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all"
            style={{
              ...glassPanelStyle,
              color: layers[key] ? "#C9A227" : "rgba(255,255,255,0.5)",
              background: layers[key] ? "rgba(201,162,39,0.12)" : "rgba(15,20,40,0.85)",
              border: layers[key] ? "1px solid rgba(201,162,39,0.4)" : "1px solid rgba(255,255,255,0.1)",
            }}
          >
            {icon} {label}
          </button>
        ))}
      </div>

      {/* ── Filter Toggle Button ─────────────────────────────── */}
      <button
        onClick={() => setShowFilters(p => !p)}
        className="absolute top-4 right-4 z-[400] flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold"
        style={{
          ...glassPanelStyle,
          background: "rgba(15,20,40,0.88)",
          color: "rgba(255,255,255,0.8)",
        }}
      >
        <SlidersHorizontal className="w-4 h-4" />
        Filters
        {selectedTypes.length > 0 && (
          <span className="w-5 h-5 rounded-full text-xs flex items-center justify-center font-bold"
            style={{ background: "#C9A227", color: "#000" }}>
            {selectedTypes.length}
          </span>
        )}
      </button>

      {/* ── Filter Panel ─────────────────────────────────────── */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 16 }}
            transition={{ type: "spring", stiffness: 280, damping: 26 }}
            className="absolute top-16 right-4 z-[400] w-64 rounded-2xl p-4 flex flex-col gap-4"
            style={{ ...glassPanelStyle, background: "rgba(10,15,35,0.94)" }}
          >
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm" style={{ color: "rgba(255,255,255,0.9)" }}>Filter Incidents</h3>
              <button onClick={() => setShowFilters(false)} className="p-1 rounded-lg hover:bg-white/10" style={{ color: "rgba(255,255,255,0.5)" }}>
                <X className="w-4 h-4" />
              </button>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: "rgba(255,255,255,0.35)" }}>Crime Type</p>
              <div className="flex flex-wrap gap-1.5">
                {crimeTypes.map(t => (
                  <button
                    key={t}
                    onClick={() => toggleType(t)}
                    className="px-2 py-1 rounded-lg text-xs font-semibold transition-all"
                    style={selectedTypes.includes(t)
                      ? { background: "rgba(201,162,39,0.2)", border: "1px solid rgba(201,162,39,0.5)", color: "#C9A227" }
                      : { background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.5)" }}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
            {selectedTypes.length > 0 && (
              <button onClick={() => setSelectedTypes([])} className="text-xs text-center font-semibold" style={{ color: "#D14343" }}>
                Clear filters
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Incident Detail Panel ─────────────────────────────── */}
      <AnimatePresence>
        {selectedIncident && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            transition={{ type: "spring", stiffness: 280, damping: 26 }}
            className="absolute bottom-4 left-4 right-4 md:right-auto md:w-96 z-[400] rounded-2xl p-5"
            style={{ ...glassPanelStyle, background: "rgba(10,15,35,0.94)" }}
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <SeverityBadge severity={selectedIncident.severity} />
                  <IncidentStatusBadge status={selectedIncident.status} />
                </div>
                <h3 className="font-bold text-base" style={{ color: "rgba(255,255,255,0.92)" }}>{selectedIncident.type}</h3>
                <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>
                  {selectedIncident.location.zone} · {timeAgo(selectedIncident.timestamp)}
                </p>
              </div>
              <button onClick={() => setSelectedIncident(null)} className="p-1.5 rounded-lg hover:bg-white/10" style={{ color: "rgba(255,255,255,0.5)" }}>
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-sm leading-relaxed mb-4" style={{ color: "rgba(255,255,255,0.65)" }}>
              {selectedIncident.description}
            </p>
            <div className="flex items-center gap-2 text-xs mb-4" style={{ color: "rgba(255,255,255,0.35)" }}>
              <span>ID: {selectedIncident.id}</span>
              <span>·</span>
              <span>Source: {selectedIncident.source}</span>
            </div>
            <button
              className="w-full py-2.5 rounded-xl font-bold text-sm text-black"
              style={{ background: "linear-gradient(135deg, #C9A227 0%, #e8b92e 100%)" }}
            >
              View Full Case
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Legend ───────────────────────────────────────────── */}
      <div
        className="absolute bottom-4 right-4 z-[400] rounded-xl p-3 flex flex-col gap-2"
        style={{ ...glassPanelStyle, background: "rgba(10,15,35,0.88)" }}
      >
        {Object.entries(SEVERITY_COLORS).map(([s, c]) => (
          <div key={s} className="flex items-center gap-2 text-xs" style={{ color: "rgba(255,255,255,0.6)" }}>
            <span className="w-3 h-3 rounded-full shrink-0" style={{ background: c }} />
            <span className="capitalize">{s}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
