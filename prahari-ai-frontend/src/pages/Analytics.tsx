import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BarChart2, Map, Users, Clock, TrendingUp, Shield, Info } from "lucide-react";
import GlassCard, { glassPanelStyle } from "../components/GlassCard";
import { SvgAreaChart, SvgBarChart } from "../components/SvgChart";
import DateRangePicker, { type DateRange } from "../components/DateRangePicker";
import { analytics as analyticsApi } from "../lib/api";
import type { CrimeCategory, RiskZone, StationStats, AgeGroup, TimeSlot } from "../lib/types";
import { mockAgeGroups, mockCategories, mockRiskZones, mockStations, mockTimeDistribution } from "../data/mockData";

type Tab = "patterns" | "risk" | "stations" | "demographics";
const TABS: { value: Tab; label: string }[] = [
  { value: "patterns", label: "Crime Patterns" },
  { value: "risk", label: "Predictive Risk" },
  { value: "stations", label: "Station Comparison" },
  { value: "demographics", label: "Demographics" },
];

const RISK_COLOR = (score: number) =>
  score >= 80 ? "#D14343" : score >= 65 ? "#F97316" : score >= 50 ? "#C9A227" : "#2E9E6C";

// ─── Heatmap Grid ────────────────────────────────────────────
function TimeHeatmap({ data }: { data: { day: string; hour: number; value: number }[] }) {
  const HOURS = Array.from({ length: 24 }, (_, i) => i);
  const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const max = Math.max(...data.map(c => c.value), 1);

  return (
    <div className="w-full overflow-x-auto">
      <div style={{ display: "grid", gridTemplateColumns: `32px repeat(24, minmax(0,1fr))`, gap: 3, minWidth: 600 }}>
        {/* Hour labels */}
        <div />
        {HOURS.map(h => (
          <div key={h} className="text-center text-[9px]" style={{ color: "rgba(255,255,255,0.25)" }}>
            {h % 6 === 0 ? `${h}:00` : ""}
          </div>
        ))}
        {/* Grid */}
        {DAYS.map(day => (
          <>
            <div key={`label-${day}`} className="flex items-center justify-end pr-2 text-[10px] font-semibold" style={{ color: "rgba(255,255,255,0.35)" }}>
              {day}
            </div>
            {HOURS.map(h => {
              const cell = data.find(c => c.day === day && c.hour === h);
              const v = cell?.value ?? 0;
              const intensity = v / max;
              return (
                <motion.div
                  key={`${day}-${h}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: (DAYS.indexOf(day) * 24 + h) * 0.002 }}
                  title={`${day} ${h}:00 — ${v} incidents`}
                  className="rounded-sm h-5"
                  style={{
                    background: intensity < 0.1 ? "rgba(255,255,255,0.04)"
                      : intensity < 0.4 ? `rgba(201,162,39,${intensity * 0.6})`
                      : intensity < 0.7 ? `rgba(249,115,22,${intensity * 0.7})`
                      : `rgba(209,67,67,${intensity * 0.85})`,
                  }}
                />
              );
            })}
          </>
        ))}
      </div>
      <div className="flex items-center justify-end gap-2 mt-3 text-[10px]" style={{ color: "rgba(255,255,255,0.3)" }}>
        <span>Low</span>
        {[0.1, 0.3, 0.6, 0.85, 1].map((o, i) => (
          <div key={i} className="w-5 h-3 rounded-sm" style={{
            background: o < 0.4 ? `rgba(201,162,39,${o * 0.6})` : o < 0.7 ? `rgba(249,115,22,${o * 0.7})` : `rgba(209,67,67,${o * 0.85})`
          }} />
        ))}
        <span>High</span>
      </div>
    </div>
  );
}

// ─── Risk Explain Popover ────────────────────────────────────
function RiskExplain({ factors, onClose }: { factors: string[]; onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9, y: -4 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="absolute z-20 p-3 rounded-xl w-56"
      style={{ ...glassPanelStyle, background: "rgba(10,15,35,0.97)", top: "100%", left: 0, marginTop: 6 }}
    >
      <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: "rgba(255,255,255,0.4)" }}>Contributing Factors</p>
      {factors.map((f, i) => (
        <div key={i} className="flex items-center gap-2 text-xs mb-1" style={{ color: "rgba(255,255,255,0.7)" }}>
          <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: "#C9A227" }} />
          {f}
        </div>
      ))}
    </motion.div>
  );
}

export default function Analytics() {
  const [tab, setTab] = useState<Tab>("patterns");
  const [dateRange, setDateRange] = useState<DateRange>("30d");
  const [yoy, setYoy] = useState(false);
  const [explainZone, setExplainZone] = useState<string | null>(null);
  const [sortCol, setSortCol] = useState<"clearanceRate" | "avgResponse" | "caseVolume">("clearanceRate");

  const [categories, setCategories] = useState<CrimeCategory[]>([]);
  const [riskZones, setRiskZones] = useState<RiskZone[]>([]);
  const [stations, setStations] = useState<StationStats[]>([]);
  const [ageGroups, setAgeGroups] = useState<AgeGroup[]>([]);
  const [timeDistribution, setTimeDistribution] = useState<TimeSlot[]>([]);
  const [heatmapData] = useState<{ day: string; hour: number; value: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      analyticsApi.patterns(),
      analyticsApi.risk(),
      analyticsApi.stations(),
      analyticsApi.demographics(),
    ]).then(([pat, risk, stat, demo]) => {
      setCategories(pat.categories);
      setRiskZones(risk);
      setStations(stat);
      setAgeGroups(demo.ageGroups);
      setTimeDistribution(demo.timeDistribution);
    }).catch(err => {
      console.error(err);
      setCategories(mockCategories);
      setRiskZones(mockRiskZones);
      setStations(mockStations);
      setAgeGroups(mockAgeGroups);
      setTimeDistribution(mockTimeDistribution);
    })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center h-full" style={{ color: "rgba(255,255,255,0.4)" }}><p>Loading analytics...</p></div>;
  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="shrink-0 px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
        <h1 className="font-bold text-lg" style={{ color: "rgba(255,255,255,0.92)" }}>Analytics</h1>
        <div className="flex items-center gap-3">
          <DateRangePicker value={dateRange} onChange={setDateRange} />
        </div>
      </div>

      {/* Tab nav */}
      <div className="shrink-0 px-5 py-2 flex gap-1 overflow-x-auto scrollbar-hide" style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
        {TABS.map(t => (
          <div key={t.value} className="relative shrink-0">
            {tab === t.value && (
              <motion.div layoutId="analytics-tab-active"
                className="absolute inset-0 rounded-xl"
                transition={{ type: "spring", stiffness: 380, damping: 28 }}
                style={{ background: "rgba(201,162,39,0.15)", border: "1px solid rgba(201,162,39,0.35)" }} />
            )}
            <button onClick={() => setTab(t.value)}
              className="relative z-10 px-4 py-2 text-sm font-semibold rounded-xl whitespace-nowrap"
              style={{ color: tab === t.value ? "#C9A227" : "rgba(255,255,255,0.45)" }}>
              {t.label}
            </button>
          </div>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto scrollbar-hide p-5">
        <AnimatePresence mode="wait">

          {/* ── Crime Patterns ─────────────────────────────────── */}
          {tab === "patterns" && (
            <motion.div key="patterns" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex flex-col gap-5">
              {/* YOY toggle */}
              <div className="flex items-center justify-end gap-3">
                <span className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>Year-over-year</span>
                <button
                  onClick={() => setYoy(p => !p)}
                  className="w-10 h-5 rounded-full transition-all relative"
                  style={{ background: yoy ? "#C9A227" : "rgba(255,255,255,0.12)" }}
                >
                  <motion.div className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow"
                    animate={{ left: yoy ? 24 : 2 }} transition={{ type: "spring", stiffness: 400, damping: 28 }} />
                </button>
              </div>

              {/* Crime by category */}
              <GlassCard title="Crime by Category" subtitle="Incidents this period">
                <div className="flex flex-col gap-3">
                  {categories.map((c, i) => (
                    <motion.div key={c.type} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                      className="flex items-center gap-3">
                      <span className="text-xs font-semibold w-24 shrink-0" style={{ color: "rgba(255,255,255,0.6)" }}>{c.type}</span>
                      <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.07)" }}>
                        <motion.div className="h-full rounded-full"
                          initial={{ width: 0 }}
                          animate={{ width: `${c.pct}%` }}
                          transition={{ duration: 0.8, delay: 0.2 + i * 0.05, ease: "easeOut" }}
                          style={{ background: c.color }}
                        />
                      </div>
                      <div className="flex items-center gap-2 w-20 justify-end">
                        <span className="text-sm font-bold" style={{ color: "rgba(255,255,255,0.85)" }}>{c.count}</span>
                        <span className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>{c.pct}%</span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </GlassCard>

              {/* Time Heatmap */}
              <GlassCard title="Incident Time Heatmap" subtitle="Day × Hour intensity">
                <TimeHeatmap data={heatmapData} />
              </GlassCard>
            </motion.div>
          )}

          {/* ── Predictive Risk ─────────────────────────────────── */}
          {tab === "risk" && (
            <motion.div key="risk" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex flex-col gap-5">
              <GlassCard title="Risk Score by Zone" subtitle="AI-generated risk assessment with explainability">
                <div className="flex flex-col gap-4">
                  {riskZones.map((z, i) => (
                    <motion.div key={z.zone} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
                      className="flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-semibold" style={{ color: "rgba(255,255,255,0.85)" }}>{z.zone}</span>
                          <span className="text-xs font-bold" style={{ color: z.trend > 0 ? "#D14343" : "#2E9E6C" }}>
                            {z.trend > 0 ? "▲" : "▼"} {Math.abs(z.trend)}%
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>conf. {z.confidence}%</span>
                          <div className="relative">
                            <button
                              onClick={() => setExplainZone(explainZone === z.zone ? null : z.zone)}
                              className="p-1 rounded-lg hover:bg-white/10"
                              style={{ color: "#C9A227" }}
                            >
                              <Info className="w-3.5 h-3.5" />
                            </button>
                            <AnimatePresence>
                              {explainZone === z.zone && <RiskExplain factors={z.factors} onClose={() => setExplainZone(null)} />}
                            </AnimatePresence>
                          </div>
                          <span className="text-lg font-bold w-10 text-right" style={{ color: RISK_COLOR(z.score) }}>{z.score}</span>
                        </div>
                      </div>
                      <div className="h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.07)" }}>
                        <motion.div className="h-full rounded-full"
                          initial={{ width: 0 }}
                          animate={{ width: `${z.score}%` }}
                          transition={{ duration: 0.9, delay: 0.1 + i * 0.07, ease: "easeOut" }}
                          style={{ background: `linear-gradient(90deg, #C9A227, ${RISK_COLOR(z.score)})` }}
                        />
                      </div>
                    </motion.div>
                  ))}
                </div>
              </GlassCard>
            </motion.div>
          )}

          {/* ── Station Comparison ──────────────────────────────── */}
          {tab === "stations" && (
            <motion.div key="stations" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <GlassCard title="Station Comparison" subtitle="Click column header to sort">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm min-w-[600px]">
                    <thead>
                      <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                        <th className="px-3 py-3 text-left text-[11px] font-bold uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.35)" }}>Station</th>
                        {(["clearanceRate", "avgResponse", "caseVolume"] as const).map(col => (
                          <th key={col} className="px-3 py-3 text-right text-[11px] font-bold uppercase tracking-widest cursor-pointer hover:text-[#C9A227]"
                            style={{ color: sortCol === col ? "#C9A227" : "rgba(255,255,255,0.35)" }}
                            onClick={() => setSortCol(col)}>
                            {col === "clearanceRate" ? "Clearance %" : col === "avgResponse" ? "Avg Response" : "Case Vol"}
                            {sortCol === col && " ↑"}
                          </th>
                        ))}
                        <th className="px-3 py-3 text-left text-[11px] font-bold uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.35)" }}>Trend</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...stations].sort((a, b) => {
                        if (sortCol === "clearanceRate") return b.clearanceRate - a.clearanceRate;
                        if (sortCol === "avgResponse") return a.avgResponse - b.avgResponse;
                        return b.caseVolume - a.caseVolume;
                      }).map((s, i) => (
                        <tr key={s.station} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)", background: i % 2 ? "rgba(255,255,255,0.02)" : "transparent" }}>
                          <td className="px-3 py-3">
                            <p className="font-semibold" style={{ color: "rgba(255,255,255,0.85)" }}>{s.station}</p>
                            <p className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>{s.zone}</p>
                          </td>
                          <td className="px-3 py-3 text-right">
                            <span className="font-bold" style={{ color: s.clearanceRate >= 80 ? "#2E9E6C" : s.clearanceRate < 65 ? "#D14343" : "#C9A227" }}>
                              {s.clearanceRate}%
                            </span>
                            <div className="w-24 h-1.5 rounded-full ml-auto mt-1 overflow-hidden" style={{ background: "rgba(255,255,255,0.07)" }}>
                              <div className="h-full rounded-full" style={{ width: `${s.clearanceRate}%`, background: s.clearanceRate >= 80 ? "#2E9E6C" : "#C9A227" }} />
                            </div>
                          </td>
                          <td className="px-3 py-3 text-right font-semibold" style={{ color: s.avgResponse < 8 ? "#2E9E6C" : s.avgResponse > 12 ? "#D14343" : "#C9A227" }}>
                            {s.avgResponse}m
                          </td>
                          <td className="px-3 py-3 text-right font-semibold" style={{ color: "rgba(255,255,255,0.75)" }}>{s.caseVolume}</td>
                          <td className="px-3 py-3">
                            <span style={{ color: s.rank <= 2 ? "#2E9E6C" : s.rank >= 6 ? "#D14343" : "#C9A227" }}>
                              #{s.rank}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </GlassCard>
            </motion.div>
          )}

          {/* ── Demographics ────────────────────────────────────── */}
          {tab === "demographics" && (
            <motion.div key="demographics" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex flex-col gap-5">
              <div className="p-3 rounded-xl text-xs" style={{ background: "rgba(63,92,134,0.15)", border: "1px solid rgba(63,92,134,0.3)", color: "rgba(255,255,255,0.5)" }}>
                ℹ️ All data below is <strong style={{ color: "rgba(255,255,255,0.75)" }}>aggregate statistical correlation only</strong>. No individual-level personal data is displayed or stored. This is not profiling.
              </div>

              <GlassCard title="Age Group Distribution" subtitle="Offenders vs victims — aggregate, anonymized">
                <div className="flex flex-col gap-3">
                  {ageGroups.map((d, i) => (
                    <div key={d.group} className="flex items-center gap-4">
                      <span className="text-xs w-12 shrink-0" style={{ color: "rgba(255,255,255,0.4)" }}>{d.group}</span>
                      <div className="flex-1 flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                            <motion.div className="h-full rounded-full" initial={{ width: 0 }} animate={{ width: `${d.offenderPct * 2.5}%` }} transition={{ delay: i * 0.06, duration: 0.8 }} style={{ background: "#D14343" }} />
                          </div>
                          <span className="text-xs w-8 text-right" style={{ color: "#D14343" }}>{d.offenderPct}%</span>
                          <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.25)" }}>off.</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                            <motion.div className="h-full rounded-full" initial={{ width: 0 }} animate={{ width: `${d.victimPct * 2.5}%` }} transition={{ delay: i * 0.06 + 0.1, duration: 0.8 }} style={{ background: "#3F5C86" }} />
                          </div>
                          <span className="text-xs w-8 text-right" style={{ color: "#7BA7CC" }}>{d.victimPct}%</span>
                          <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.25)" }}>vic.</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </GlassCard>

              <GlassCard title="Incidents by Time of Day" subtitle="Aggregate incident distribution across 24h">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {timeDistribution.map((d, i) => (
                    <motion.div key={d.slot} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
                      className="rounded-xl p-3 text-center" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                      <p className="text-2xl font-bold mb-1" style={{ color: i >= 2 ? "#D14343" : "#C9A227" }}>{d.incidents}</p>
                      <p className="text-[10px]" style={{ color: "rgba(255,255,255,0.35)" }}>{d.slot}</p>
                    </motion.div>
                  ))}
                </div>
              </GlassCard>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
