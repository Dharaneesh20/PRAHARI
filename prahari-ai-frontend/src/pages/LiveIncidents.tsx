import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Clock, Check, ChevronRight, X, MapPin, User, Radio } from "lucide-react";
import GlassCard, { glassPanelStyle } from "../components/GlassCard";
import { SeverityBadge, IncidentStatusBadge, UnitStatusBadge } from "../components/StatusBadge";
import type { Incident, IncidentStatus, Severity } from "../lib/types";
import { incidents as incidentsApi, units as unitsApi } from "../lib/api";
import type { PatrolUnit } from "../lib/types";

function timeAgo(ts: string) {
  const diff = (Date.now() - new Date(ts).getTime()) / 60000;
  if (diff < 1) return "Just now";
  if (diff < 60) return `${Math.round(diff)}m ago`;
  return `${Math.round(diff / 60)}h ago`;
}

function LiveTimeAgo({ ts }: { ts: string }) {
  const [text, setText] = useState(timeAgo(ts));
  useEffect(() => {
    const t = setInterval(() => setText(timeAgo(ts)), 30000);
    return () => clearInterval(t);
  }, [ts]);
  return <span>{text}</span>;
}

const INCIDENT_ICONS: Record<string, string> = {
  "Assault": "⚔️", "Theft": "👜", "Burglary": "🏠", "Traffic Violation": "🚦",
  "Vandalism": "🔨", "Drug Offence": "💊", "Robbery": "🔫", "Fraud": "💳",
};

export default function LiveIncidents() {
  const [incidentsList, setIncidentsList] = useState<Incident[]>([]);
  const [unitsList, setUnitsList] = useState<PatrolUnit[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Incident | null>(null);
  const [filterSeverity, setFilterSeverity] = useState<Severity | "all">("all");
  const [filterStatus, setFilterStatus] = useState<IncidentStatus | "all">("all");
  const [showAssign, setShowAssign] = useState(false);
  const [multiSelect, setMultiSelect] = useState<string[]>([]);
  const [newPulse, setNewPulse] = useState<string | null>(null);
  const feedRef = useRef<HTMLDivElement>(null);

  // Load initial data from backend
  useEffect(() => {
    Promise.all([incidentsApi.list(), unitsApi.list()])
      .then(([inc, u]) => { setIncidentsList(inc); setUnitsList(u); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // WebSocket live stream for new incidents
  useEffect(() => {
    let ws: WebSocket;
    try {
      ws = incidentsApi.stream();
      ws.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data);
          if (msg.event === "new_incident") {
            const newInc: Incident = msg.data;
            setIncidentsList(p => [newInc, ...p]);
            setNewPulse(newInc.id);
            setTimeout(() => setNewPulse(null), 3000);
            if (feedRef.current) feedRef.current.scrollTop = 0;
          }
        } catch { /* ignore malformed */ }
      };
    } catch { /* WS not available */ }
    return () => ws?.close();
  }, []);

  const filtered = incidentsList.filter(i => {
    if (filterSeverity !== "all" && i.severity !== filterSeverity) return false;
    if (filterStatus !== "all" && i.status !== filterStatus) return false;
    return true;
  });

  const toggleSelect = (id: string) =>
    setMultiSelect(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);

  const availableUnits = unitsList.filter(u => u.status === "on-patrol" || u.status === "on-break");

  const handleAssign = async (incidentId: string, unitId: string) => {
    try {
      await incidentsApi.assign(incidentId, unitId);
      setIncidentsList(p => p.map(i => i.id === incidentId ? { ...i, assignedUnitId: unitId, status: "dispatched" } : i));
      setSelected(prev => prev && prev.id === incidentId ? { ...prev, assignedUnitId: unitId } : prev);
    } catch (err) { console.error("Assign failed", err); }
    setShowAssign(false);
  };

  const handleResolve = async (incidentId: string) => {
    try {
      await incidentsApi.updateStatus(incidentId, "resolved");
      setIncidentsList(p => p.map(i => i.id === incidentId ? { ...i, status: "resolved" } : i));
      setSelected(prev => prev && prev.id === incidentId ? { ...prev, status: "resolved" } : prev);
    } catch (err) { console.error("Resolve failed", err); }
  };

  if (loading) return <div className="flex items-center justify-center h-full" style={{ color: "rgba(255,255,255,0.4)" }}><p>Loading incidents...</p></div>;

  return (
    <div className="flex h-full w-full overflow-hidden">

      {/* ── Left: Feed ──────────────────────────────────────── */}
      <div className="flex flex-col w-full lg:w-[420px] xl:w-[460px] border-r shrink-0" style={{ borderColor: "rgba(255,255,255,0.07)" }}>

        {/* Header & Filters */}
        <div className="p-4 shrink-0" style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
          <div className="flex items-center justify-between mb-3">
            <div>
              <h1 className="font-bold" style={{ color: "rgba(255,255,255,0.92)" }}>Live Incidents</h1>
              <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>{incidentsList.filter(i => i.status !== "resolved").length} active</p>
            </div>
            <AnimatePresence>
              {multiSelect.length > 0 && (
                <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
                  className="flex gap-2">
                  <button className="px-2.5 py-1.5 rounded-lg text-xs font-bold"
                    style={{ background: "rgba(209,67,67,0.15)", color: "#D14343", border: "1px solid rgba(209,67,67,0.3)" }}
                    onClick={() => setMultiSelect([])}
                  >
                    Clear ({multiSelect.length})
                  </button>
                  <button className="px-2.5 py-1.5 rounded-lg text-xs font-bold"
                    style={{ background: "rgba(201,162,39,0.15)", color: "#C9A227", border: "1px solid rgba(201,162,39,0.3)" }}>
                    Bulk Assign
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Filter row */}
          <div className="flex gap-2 flex-wrap">
            {(["all", "critical", "high", "medium", "low"] as const).map(s => (
              <button key={s} onClick={() => setFilterSeverity(s)}
                className="px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all capitalize"
                style={filterSeverity === s
                  ? { background: "rgba(201,162,39,0.18)", color: "#C9A227", border: "1px solid rgba(201,162,39,0.4)" }
                  : { background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.4)", border: "1px solid transparent" }}>
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Incident Feed */}
        <div ref={feedRef} className="flex-1 overflow-y-auto scrollbar-hide p-3 flex flex-col gap-2">
          {filtered.map((inc, idx) => {
            const isNew = newPulse === inc.id;
            const isSelected = selected?.id === inc.id;
            const isChecked = multiSelect.includes(inc.id);
            return (
              <motion.div
                key={inc.id}
                layout
                initial={{ opacity: 0, y: -20, scale: 0.96 }}
                animate={{
                  opacity: 1, y: 0, scale: 1,
                  boxShadow: isNew ? ["0 0 0px rgba(209,67,67,0)", "0 0 20px rgba(209,67,67,0.4)", "0 0 0px rgba(209,67,67,0)"] : undefined,
                }}
                transition={{ type: "spring", stiffness: 260, damping: 24, delay: isNew ? 0 : idx * 0.01 }}
                onClick={() => { setSelected(inc); setShowAssign(false); }}
                className="rounded-xl p-3.5 cursor-pointer transition-all"
                style={{
                  ...glassPanelStyle,
                  background: isSelected ? "rgba(201,162,39,0.09)" : "rgba(255,255,255,0.04)",
                  border: isSelected ? "1px solid rgba(201,162,39,0.35)" : "1px solid rgba(255,255,255,0.08)",
                }}
              >
                <div className="flex items-start gap-3">
                  {/* Multi-select checkbox */}
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleSelect(inc.id); }}
                    className="mt-0.5 shrink-0 w-4 h-4 rounded flex items-center justify-center transition-all"
                    style={isChecked
                      ? { background: "#C9A227", border: "none" }
                      : { background: "transparent", border: "1px solid rgba(255,255,255,0.2)" }}
                  >
                    {isChecked && <Check className="w-3 h-3 text-black" />}
                  </button>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <SeverityBadge severity={inc.severity} />
                      <IncidentStatusBadge status={inc.status} />
                    </div>
                    <p className="font-semibold text-sm" style={{ color: "rgba(255,255,255,0.88)" }}>
                      {INCIDENT_ICONS[inc.type] ?? "📋"} {inc.type}
                    </p>
                    <p className="text-xs mt-1 truncate" style={{ color: "rgba(255,255,255,0.45)" }}>
                      <MapPin className="w-3 h-3 inline mr-1" />{inc.location.zone}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.3)" }}>
                      <Clock className="w-3 h-3 inline mr-1" /><LiveTimeAgo ts={inc.timestamp} />
                      {inc.assignedUnitId && <span className="ml-2" style={{ color: "#2E9E6C" }}>· {inc.assignedUnitId}</span>}
                    </p>
                  </div>

                  <ChevronRight className="w-4 h-4 shrink-0 mt-1" style={{ color: "rgba(255,255,255,0.2)" }} />
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* ── Right: Detail Panel ──────────────────────────────── */}
      <div className="flex-1 hidden lg:flex flex-col overflow-hidden">
        <AnimatePresence mode="wait">
          {selected ? (
            <motion.div
              key={selected.id}
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              transition={{ type: "spring", stiffness: 280, damping: 26 }}
              className="flex flex-col h-full overflow-y-auto scrollbar-hide p-5 gap-5"
            >
              {/* Header */}
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex gap-2 mb-2">
                    <SeverityBadge severity={selected.severity} />
                    <IncidentStatusBadge status={selected.status} />
                  </div>
                  <h2 className="text-xl font-bold" style={{ color: "rgba(255,255,255,0.92)" }}>
                    {INCIDENT_ICONS[selected.type]} {selected.type}
                  </h2>
                  <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.45)" }}>
                    {selected.id} · {selected.location.address}
                  </p>
                </div>
                <button onClick={() => setSelected(null)} className="p-2 rounded-xl hover:bg-white/10" style={{ color: "rgba(255,255,255,0.4)" }}>
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Description */}
              <GlassCard>
                <p className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.75)" }}>{selected.description}</p>
                <div className="flex gap-4 mt-4 text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>
                  <span><User className="w-3 h-3 inline mr-1" />Source: {selected.source}</span>
                  <span><Radio className="w-3 h-3 inline mr-1" />Station: {selected.stationId}</span>
                </div>
              </GlassCard>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={() => setShowAssign(p => !p)}
                  className="flex-1 py-2.5 rounded-xl font-bold text-sm text-black"
                  style={{ background: "linear-gradient(135deg, #C9A227 0%, #e8b92e 100%)" }}
                >
                  Assign Patrol Unit
                </button>
                <button onClick={() => handleResolve(selected.id)} className="px-4 py-2.5 rounded-xl font-bold text-sm" style={{ background: "rgba(46,158,108,0.15)", color: "#2E9E6C", border: "1px solid rgba(46,158,108,0.3)" }}>
                  Mark Resolved
                </button>
              </div>

              {/* Unit Picker */}
              <AnimatePresence>
                {showAssign && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                  >
                    <GlassCard title="Available Units" subtitle="Tap to assign">
                      <div className="flex flex-col gap-2">
                        {availableUnits.map(u => (
                          <button
                            key={u.id}
                            onClick={() => handleAssign(selected.id, u.id)}
                            className="flex items-center gap-3 p-3 rounded-xl transition-all hover:bg-white/10 text-left"
                            style={{ border: "1px solid rgba(255,255,255,0.07)" }}
                          >
                            <div className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm"
                              style={{ background: "rgba(63,92,134,0.3)", color: "#7BA7CC" }}>
                              {u.callsign.split("-").pop()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-sm" style={{ color: "rgba(255,255,255,0.85)" }}>{u.callsign}</p>
                              <p className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>{u.zone} · {u.vehicle}</p>
                            </div>
                            <UnitStatusBadge status={u.status} />
                          </button>
                        ))}
                      </div>
                    </GlassCard>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Timeline */}
              <GlassCard title="Activity Timeline">
                <div className="flex flex-col gap-4">
                  {selected.timeline.map((t, i) => (
                    <div key={i} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div className="w-2 h-2 rounded-full shrink-0 mt-1" style={{ background: "#C9A227" }} />
                        {i < selected.timeline.length - 1 && <div className="w-px flex-1 mt-1" style={{ background: "rgba(255,255,255,0.08)" }} />}
                      </div>
                      <div className="pb-3">
                        <p className="text-sm" style={{ color: "rgba(255,255,255,0.75)" }}>{t.action}</p>
                        <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.3)" }}>
                          {new Date(t.time).toLocaleTimeString("en-IN")} · {t.by}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </GlassCard>
            </motion.div>
          ) : (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center h-full gap-4"
              style={{ color: "rgba(255,255,255,0.25)" }}
            >
              <Radio className="w-12 h-12" />
              <p className="text-sm font-medium">Select an incident to view details</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
