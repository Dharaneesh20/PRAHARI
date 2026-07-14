import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { AlertTriangle, Shield, Map as MapIcon, Clock, TrendingUp, Activity, ChevronRight } from "lucide-react";
import StatCard from "../components/StatCard";
import GlassCard, { glassPanelStyle } from "../components/GlassCard";
import DateRangePicker, { type DateRange } from "../components/DateRangePicker";
import { SvgAreaChart } from "../components/SvgChart";
import { SeverityBadge } from "../components/StatusBadge";
import { KPI_SUMMARY, CRIME_TREND_30D, CRIME_TREND_90D, HOTSPOT_ZONES, LIVE_ALERTS } from "../mocks/kpi";

// Alert ticker item
function AlertTicker({ alerts }: { alerts: typeof LIVE_ALERTS }) {
  const [paused, setPaused] = useState(false);
  const doubled = [...alerts, ...alerts]; // seamless loop
  return (
    <div
      className="relative overflow-hidden rounded-xl py-2.5 px-4 flex items-center"
      style={{ background: "rgba(209,67,67,0.06)", border: "1px solid rgba(209,67,67,0.18)" }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <span className="text-[10px] font-bold uppercase tracking-widest shrink-0 mr-4" style={{ color: "#D14343" }}>
        ● LIVE
      </span>
      <div className="overflow-hidden flex-1">
        <motion.div
          className="flex gap-8 whitespace-nowrap"
          animate={{ x: paused ? undefined : ["0%", "-50%"] }}
          transition={{ duration: 24, ease: "linear", repeat: Infinity }}
        >
          {doubled.map((a, i) => (
            <span key={i} className="text-xs shrink-0" style={{ color: "rgba(255,255,255,0.7)" }}>
              {a.text} <span style={{ color: "rgba(255,255,255,0.3)", marginLeft: 4 }}>{a.timestamp}</span>
            </span>
          ))}
        </motion.div>
      </div>
    </div>
  );
}

export default function KpiDashboard() {
  const navigate = useNavigate();
  const [dateRange, setDateRange] = useState<DateRange>("7d");

  const trendData = dateRange === "30d" ? CRIME_TREND_30D : CRIME_TREND_90D.slice(-7).map((d, i, a) => ({
    ...d, value: dateRange === "today" ? Math.round(a[i].value / 7) : a[i].value,
  }));

  return (
    <div className="w-full h-full overflow-y-auto scrollbar-hide relative z-10">
      <div className="p-5 md:p-6 flex flex-col gap-5">

        {/* ── Header ──────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold" style={{ color: "rgba(255,255,255,0.92)" }}>Tactical Overview</h1>
            <p className="text-sm mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>
              Karnataka State — {new Date().toLocaleDateString("en-IN", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
            </p>
          </div>
          <DateRangePicker value={dateRange} onChange={setDateRange} />
        </div>

        {/* ── Live Alert Ticker ───────────────────────────────── */}
        <AlertTicker alerts={LIVE_ALERTS} />

        {/* ── Stat Cards ──────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          <StatCard label="Active Cases" value={KPI_SUMMARY.totalActiveCases} icon={<Activity className="w-5 h-5" />} accentColor="#D14343" delay={0.05} />
          <StatCard label="Alerts Today" value={KPI_SUMMARY.alertsToday} icon={<AlertTriangle className="w-5 h-5" />} accentColor="#D14343" delay={0.1} />
          <StatCard label="On-Duty Units" value={KPI_SUMMARY.onDutyUnits} icon={<Shield className="w-5 h-5" />} accentColor="#2E9E6C" delay={0.15} />
          <StatCard label="Avg Response" value={KPI_SUMMARY.avgResponseTime} suffix=" min" decimals={1} icon={<Clock className="w-5 h-5" />} accentColor="#C9A227" trend={-0.8} trendLabel=" vs last wk" delay={0.2} />
          <StatCard
            label="Clearance Rate" value={KPI_SUMMARY.clearanceRate} suffix="%" decimals={1}
            icon={<TrendingUp className="w-5 h-5" />} accentColor="#2E9E6C"
            trend={KPI_SUMMARY.clearanceRateTrend} trendLabel="% vs last period" delay={0.25}
            className="col-span-2 lg:col-span-1"
          />
        </div>

        {/* ── Main Grid ───────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* Crime Trend Chart */}
          <div className="lg:col-span-2">
            <GlassCard
              title="Crime Trend"
              subtitle={`Incidents per ${dateRange === "today" ? "day" : dateRange === "7d" ? "week" : "day"}`}
              delay={0.3}
              action={
                <div className="flex items-center gap-1 text-[10px]" style={{ color: "rgba(255,255,255,0.35)" }}>
                  <span className="w-6 h-0.5 inline-block rounded-full" style={{ background: "#C9A227" }} />
                  Incidents
                </div>
              }
            >
              <SvgAreaChart
                data={trendData.map(d => ({ label: d.date, value: d.value }))}
                height={160}
                color="#C9A227"
                id={`kpi-trend-${dateRange}`}
              />
            </GlassCard>
          </div>

          {/* Patrol Mini-Widget + Hotspots */}
          <div className="flex flex-col gap-5">
            {/* Patrol summary */}
            <GlassCard title="Patrol Units" delay={0.32}
              action={
                <button onClick={() => navigate("/patrol")} className="text-xs font-semibold flex items-center gap-1" style={{ color: "#C9A227" }}>
                  View all <ChevronRight className="w-3 h-3" />
                </button>
              }
            >
              <div className="flex items-center gap-6">
                <div className="text-center">
                  <p className="text-3xl font-bold" style={{ color: "#2E9E6C" }}>{KPI_SUMMARY.onDutyUnits}</p>
                  <p className="text-[10px] uppercase tracking-widest mt-1" style={{ color: "rgba(255,255,255,0.4)" }}>On Duty</p>
                </div>
                <div className="w-px h-12" style={{ background: "rgba(255,255,255,0.08)" }} />
                <div className="text-center">
                  <p className="text-3xl font-bold" style={{ color: "#6B7280" }}>{KPI_SUMMARY.offDutyUnits}</p>
                  <p className="text-[10px] uppercase tracking-widest mt-1" style={{ color: "rgba(255,255,255,0.4)" }}>Off Duty</p>
                </div>
                {/* Mini donut ring */}
                <div className="ml-auto">
                  <svg width="52" height="52" viewBox="0 0 52 52">
                    <circle cx="26" cy="26" r="20" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="6" />
                    <circle cx="26" cy="26" r="20" fill="none" stroke="#2E9E6C" strokeWidth="6"
                      strokeDasharray={`${(KPI_SUMMARY.onDutyUnits / (KPI_SUMMARY.onDutyUnits + KPI_SUMMARY.offDutyUnits)) * 125.6} 125.6`}
                      strokeLinecap="round" transform="rotate(-90 26 26)" />
                    <text x="26" y="30" textAnchor="middle" fontSize="9" fontWeight="bold" fill="rgba(255,255,255,0.8)">
                      {Math.round((KPI_SUMMARY.onDutyUnits / (KPI_SUMMARY.onDutyUnits + KPI_SUMMARY.offDutyUnits)) * 100)}%
                    </text>
                  </svg>
                </div>
              </div>
            </GlassCard>

            {/* Case ratio */}
            <GlassCard title="Cases" delay={0.36}
              action={
                <button onClick={() => navigate("/incidents")} className="text-xs font-semibold flex items-center gap-1" style={{ color: "#C9A227" }}>
                  View <ChevronRight className="w-3 h-3" />
                </button>
              }
            >
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <div className="flex justify-between text-[10px] mb-1" style={{ color: "rgba(255,255,255,0.4)" }}>
                    <span>Open ({KPI_SUMMARY.openCases})</span>
                    <span>Closed ({KPI_SUMMARY.closedCases})</span>
                  </div>
                  <div className="h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${(KPI_SUMMARY.openCases / (KPI_SUMMARY.openCases + KPI_SUMMARY.closedCases)) * 100}%` }}
                      transition={{ duration: 1.2, delay: 0.5, ease: "easeOut" }}
                      className="h-full rounded-full"
                      style={{ background: "linear-gradient(90deg, #D14343 0%, #C9A227 100%)" }}
                    />
                  </div>
                </div>
              </div>
            </GlassCard>
          </div>
        </div>

        {/* ── Hotspot Zones ───────────────────────────────────── */}
        <GlassCard
          title="Top Hotspot Zones"
          subtitle="Click zone to view on Crime Map"
          delay={0.4}
          action={
            <button onClick={() => navigate("/map")} className="text-xs font-semibold flex items-center gap-1" style={{ color: "#C9A227" }}>
              Open Map <MapIcon className="w-3 h-3" />
            </button>
          }
        >
          <div className="flex flex-col gap-3">
            {HOTSPOT_ZONES.map((zone, i) => (
              <motion.button
                key={zone.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.45 + i * 0.05 }}
                whileHover={{ x: 4 }}
                onClick={() => navigate(`/map?zone=${encodeURIComponent(zone.zone)}`)}
                className="flex items-center gap-4 w-full text-left group"
              >
                <span className="text-lg font-bold tabular-nums w-6 shrink-0" style={{ color: "rgba(255,255,255,0.25)" }}>
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm font-semibold" style={{ color: "rgba(255,255,255,0.85)" }}>{zone.zone}</span>
                    <div className="flex items-center gap-2">
                      <SeverityBadge severity={zone.severity} />
                      <span className="text-sm font-bold tabular-nums" style={{ color: "rgba(255,255,255,0.6)" }}>{zone.incidents}</span>
                    </div>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${(zone.incidents / HOTSPOT_ZONES[0].incidents) * 100}%` }}
                      transition={{ duration: 1, delay: 0.5 + i * 0.08, ease: "easeOut" }}
                      className="h-full rounded-full"
                      style={{
                        background: zone.severity === "critical" ? "#D14343" : zone.severity === "high" ? "#F97316" : "#C9A227",
                      }}
                    />
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 shrink-0 opacity-0 group-hover:opacity-60 transition-opacity" style={{ color: "#C9A227" }} />
              </motion.button>
            ))}
          </div>
        </GlassCard>

      </div>
    </div>
  );
}