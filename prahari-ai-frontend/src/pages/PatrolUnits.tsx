import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { LayoutGrid, Map as MapIcon, Clock, User, Car } from "lucide-react";
import { units as unitsApi, incidents as incidentsApi } from "../lib/api";
import type { PatrolUnit, Incident } from "../lib/types";
import GlassCard, { glassPanelStyle } from "../components/GlassCard";
import { UnitStatusBadge } from "../components/StatusBadge";
import { Sparkline } from "../components/SvgChart";
import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";

type View = "grid" | "map";
type Tab = "roster" | "schedule" | "performance";

const STATUS_ORDER = { responding: 0, "on-patrol": 1, "on-break": 2, "off-duty": 3 };

function formatShiftRemaining(end: string) {
  const [h, m] = end.split(":").map(Number);
  const now = new Date();
  const endDate = new Date();
  endDate.setHours(h, m, 0, 0);
  if (endDate < now) endDate.setDate(endDate.getDate() + 1);
  const diff = Math.round((endDate.getTime() - now.getTime()) / 60000);
  const hrs = Math.floor(diff / 60);
  const mins = diff % 60;
  return `${hrs}h ${mins}m left`;
}

function UnitCard({ unit, incidents, onAssign }: { unit: PatrolUnit; incidents: Incident[]; onAssign: () => void }) {
  const [flipped, setFlipped] = useState(false);
  const assignedIncidents = incidents.filter(i => i.assignedUnitId === unit.id && i.status !== "resolved");

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      transition={{ type: "spring", stiffness: 260, damping: 24 }}
      className="rounded-2xl overflow-hidden cursor-pointer glass-specular"
      style={{ ...glassPanelStyle }}
      onClick={() => setFlipped(p => !p)}
    >
      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm"
              style={{ background: "rgba(63,92,134,0.3)", color: "#7BA7CC", border: "1px solid rgba(63,92,134,0.4)" }}>
              {unit.callsign.split("-").pop()}
            </div>
            <div>
              <p className="font-bold text-sm" style={{ color: "rgba(255,255,255,0.9)" }}>{unit.callsign}</p>
              <p className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>{unit.zone}</p>
            </div>
          </div>
          <UnitStatusBadge status={unit.status} />
        </div>

        {/* Officers */}
        <div className="flex items-center gap-1.5 mb-3">
          <User className="w-3 h-3 shrink-0" style={{ color: "rgba(255,255,255,0.3)" }} />
          <p className="text-xs truncate" style={{ color: "rgba(255,255,255,0.5)" }}>
            {unit.officers.join(", ")}
          </p>
        </div>

        {/* Vehicle + Shift */}
        <div className="flex items-center gap-1.5 mb-3">
          <Car className="w-3 h-3 shrink-0" style={{ color: "rgba(255,255,255,0.3)" }} />
          <p className="text-xs" style={{ color: "rgba(255,255,255,0.5)" }}>{unit.vehicle}</p>
        </div>
        <div className="flex items-center gap-1.5 mb-4">
          <Clock className="w-3 h-3 shrink-0" style={{ color: "rgba(255,255,255,0.3)" }} />
          <p className="text-xs" style={{ color: "rgba(255,255,255,0.5)" }}>
            Shift {unit.shiftStart}–{unit.shiftEnd}
            {unit.status !== "off-duty" && <span style={{ color: "#C9A227" }}> · {formatShiftRemaining(unit.shiftEnd)}</span>}
          </p>
        </div>

        {/* Active incidents */}
        {assignedIncidents.length > 0 && (
          <div className="mb-3 px-2 py-1.5 rounded-lg text-xs" style={{ background: "rgba(209,67,67,0.1)", color: "#D14343", border: "1px solid rgba(209,67,67,0.2)" }}>
            {assignedIncidents.length} active incident{assignedIncidents.length > 1 ? "s" : ""}
          </div>
        )}

        {/* Divider */}
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.07)", marginBottom: 12, marginTop: 4 }} />

        {/* Stats */}
        <div className="flex items-center justify-between">
          <div className="text-center">
            <p className="text-lg font-bold" style={{ color: "rgba(255,255,255,0.88)" }}>{unit.incidentsThisMonth}</p>
            <p className="text-[10px] uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.3)" }}>Cases/mo</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold" style={{ color: "rgba(255,255,255,0.88)" }}>{unit.avgResponseTime}m</p>
            <p className="text-[10px] uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.3)" }}>Avg Resp</p>
          </div>
          <Sparkline values={unit.sparkline} color="#C9A227" width={56} height={24} />
        </div>

        {/* Assign button */}
        {unit.status !== "off-duty" && (
          <button
            onClick={(e) => { e.stopPropagation(); onAssign(); }}
            className="mt-3 w-full py-2 rounded-xl text-xs font-bold"
            style={{ background: "rgba(201,162,39,0.12)", color: "#C9A227", border: "1px solid rgba(201,162,39,0.25)" }}
          >
            Assign to Incident
          </button>
        )}
      </div>
    </motion.div>
  );
}

export default function PatrolUnits() {
  const [view, setView] = useState<View>("grid");
  const [tab, setTab] = useState<Tab>("roster");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [unitsList, setUnitsList] = useState<PatrolUnit[]>([]);
  const [incidentsList, setIncidentsList] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([unitsApi.list(), incidentsApi.list()])
      .then(([u, inc]) => { setUnitsList(u); setIncidentsList(inc); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const shifts = [
    { name: "Morning 06:00–14:00", units: unitsList.filter(u => u.shiftStart === "06:00") },
    { name: "Afternoon 14:00–22:00", units: unitsList.filter(u => u.shiftStart === "14:00") },
    { name: "Night 22:00–06:00", units: unitsList.filter(u => u.shiftStart === "22:00") },
    { name: "Day Shift 09:00–18:00", units: unitsList.filter(u => u.shiftStart === "09:00") },
  ];

  const sorted = [...unitsList]
    .filter(u => filterStatus === "all" || u.status === filterStatus)
    .sort((a, b) => (STATUS_ORDER[a.status as keyof typeof STATUS_ORDER] ?? 9) - (STATUS_ORDER[b.status as keyof typeof STATUS_ORDER] ?? 9));

  if (loading) return <div className="flex items-center justify-center h-full" style={{ color: "rgba(255,255,255,0.4)" }}><p>Loading units...</p></div>;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* ── Top bar ──────────────────────────────────────────── */}
      <div className="shrink-0 px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
        <div>
          <h1 className="font-bold text-lg" style={{ color: "rgba(255,255,255,0.92)" }}>Patrol Units</h1>
          <p className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>
            {unitsList.filter(u => u.status === "on-patrol" || u.status === "responding").length} active · {unitsList.filter(u => u.status === "off-duty").length} off duty
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Tab nav */}
          <div className="flex gap-1 p-1 rounded-xl" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.09)" }}>
            {(["roster", "schedule", "performance"] as Tab[]).map(t => (
              <div key={t} className="relative">
                {tab === t && <motion.div layoutId="patrol-tab" className="absolute inset-0 rounded-lg" transition={{ type: "spring", stiffness: 380, damping: 28 }} style={{ background: "rgba(201,162,39,0.18)", border: "1px solid rgba(201,162,39,0.4)" }} />}
                <button onClick={() => setTab(t)} className="relative z-10 px-3 py-1.5 text-xs font-semibold capitalize rounded-lg transition-colors"
                  style={{ color: tab === t ? "#C9A227" : "rgba(255,255,255,0.4)" }}>
                  {t}
                </button>
              </div>
            ))}
          </div>

          {/* View toggle */}
          {tab === "roster" && (
            <div className="flex gap-1 p-1 rounded-xl" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.09)" }}>
              <button onClick={() => setView("grid")} className="p-1.5 rounded-lg" style={{ color: view === "grid" ? "#C9A227" : "rgba(255,255,255,0.4)", background: view === "grid" ? "rgba(201,162,39,0.18)" : "transparent" }}>
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button onClick={() => setView("map")} className="p-1.5 rounded-lg" style={{ color: view === "map" ? "#C9A227" : "rgba(255,255,255,0.4)", background: view === "map" ? "rgba(201,162,39,0.18)" : "transparent" }}>
                <MapIcon className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Content ──────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto scrollbar-hide">
        <AnimatePresence mode="wait">
          {tab === "roster" && view === "grid" && (
            <motion.div key="grid" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-5">
              {/* Status filter */}
              <div className="flex gap-2 mb-5 flex-wrap">
                {["all", "on-patrol", "responding", "on-break", "off-duty"].map(s => (
                  <button key={s} onClick={() => setFilterStatus(s)}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all"
                    style={filterStatus === s
                      ? { background: "rgba(201,162,39,0.18)", color: "#C9A227", border: "1px solid rgba(201,162,39,0.4)" }
                      : { background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.4)", border: "1px solid rgba(255,255,255,0.08)" }}>
                    {s}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {sorted.map((unit) => (
                  <UnitCard key={unit.id} unit={unit} incidents={incidentsList} onAssign={() => {}} />
                ))}
              </div>
            </motion.div>
          )}

          {tab === "roster" && view === "map" && (
            <motion.div key="map-view" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full" style={{ minHeight: 500 }}>
              <MapContainer center={[12.97, 77.60]} zoom={12} style={{ width: "100%", height: "100%", minHeight: 500 }}>
                <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" attribution='&copy; CARTO' />
                {unitsList.filter(u => u.status !== "off-duty").map(u => (
                  <CircleMarker key={u.id} center={[u.position.lat, u.position.lng]} radius={9}
                    pathOptions={{ color: u.status === "responding" ? "#D14343" : "#2E9E6C", fillColor: u.status === "responding" ? "#D14343" : "#2E9E6C", fillOpacity: 0.85, weight: 2 }}>
                    <Popup>
                      <div className="text-xs p-1">
                        <strong>{u.callsign}</strong><br />{u.zone}<br />
                        {u.officers.join(", ")}
                      </div>
                    </Popup>
                  </CircleMarker>
                ))}
              </MapContainer>
            </motion.div>
          )}

          {tab === "schedule" && (
            <motion.div key="schedule" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-5 flex flex-col gap-5">
              {shifts.map(shift => (
                <GlassCard key={shift.name} title={shift.name} subtitle={`${shift.units.length} units`}>
                  <div className="flex flex-col gap-2">
                    {shift.units.map(u => (
                      <div key={u.id} className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full" style={{ background: u.status === "responding" ? "#D14343" : u.status === "on-patrol" ? "#2E9E6C" : "#6B7280" }} />
                        <p className="text-sm font-semibold" style={{ color: "rgba(255,255,255,0.8)" }}>{u.callsign}</p>
                        <p className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>{u.zone}</p>
                        <UnitStatusBadge status={u.status} />
                      </div>
                    ))}
                    {shift.units.length === 0 && <p className="text-sm" style={{ color: "rgba(255,255,255,0.3)" }}>No units scheduled</p>}
                  </div>
                </GlassCard>
              ))}
            </motion.div>
          )}

          {tab === "performance" && (
            <motion.div key="performance" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-5">
              <div className="rounded-2xl overflow-hidden" style={{ ...glassPanelStyle }}>
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                      {["Unit", "Zone", "Cases/Month", "Avg Response", "Trend"].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.35)" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[...unitsList].sort((a, b) => b.incidentsThisMonth - a.incidentsThisMonth).map((u, i) => (
                      <tr key={u.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)", background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.02)" }}>
                        <td className="px-4 py-3 font-semibold" style={{ color: "rgba(255,255,255,0.85)" }}>{u.callsign}</td>
                        <td className="px-4 py-3" style={{ color: "rgba(255,255,255,0.5)" }}>{u.zone}</td>
                        <td className="px-4 py-3 font-bold" style={{ color: "rgba(255,255,255,0.85)" }}>{u.incidentsThisMonth}</td>
                        <td className="px-4 py-3" style={{ color: u.avgResponseTime < 8 ? "#2E9E6C" : u.avgResponseTime > 12 ? "#D14343" : "#C9A227" }}>{u.avgResponseTime}m</td>
                        <td className="px-4 py-3"><Sparkline values={u.sparkline} color="#C9A227" width={50} height={22} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
