import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { AlertTriangle, Shield, Map as MapIcon, Clock, TrendingUp, Activity, ChevronRight } from "lucide-react";
import StatCard from "../components/StatCard";
import GlassCard from "../components/GlassCard";
import DateRangePicker, { type DateRange } from "../components/DateRangePicker";
import { SvgAreaChart } from "../components/SvgChart";
import { SeverityBadge } from "../components/StatusBadge";
import { kpi as kpiApi, auth as authApi, notifications as notificationApi } from "../lib/api";
import type { KpiSummary, TrendPoint, HotspotZone, UserProfile } from "../lib/types";
import { mockHotspots, mockKpiSummary, mockNotifications, mockTrend } from "../data/mockData";
import { useAppContext } from "../context/AppContext";

// Alert ticker item
function AlertTicker({ alerts }: { alerts: { id: string; text: string; timestamp: string }[] }) {
  const [paused, setPaused] = useState(false);
  const doubled = [...alerts, ...alerts];
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
          {doubled.length === 0 ? (
            <span className="text-xs shrink-0" style={{ color: "rgba(255,255,255,0.45)" }}>No active alerts</span>
          ) : doubled.map((a, i) => (
            <span key={i} className="text-xs shrink-0" style={{ color: "rgba(255,255,255,0.7)" }}>
              {a.text} <span style={{ color: "rgba(255,255,255,0.3)", marginLeft: 4 }}>{a.timestamp}</span>
            </span>
          ))}
        </motion.div>
      </div>
    </div>
  );
}

type AlertItem = { id: string; text: string; timestamp: string };

export default function KpiDashboard() {
  const navigate = useNavigate();
  const { t, language } = useAppContext();
  const [dateRange, setDateRange] = useState<DateRange>("7d");
  const [kpiSummary, setKpiSummary] = useState<KpiSummary | null>(null);
  const [trendData, setTrendData] = useState<TrendPoint[]>([]);
  const [hotspots, setHotspots] = useState<HotspotZone[]>([]);
  const [liveAlerts, setLiveAlerts] = useState<AlertItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    Promise.all([
      kpiApi.summary(dateRange),
      kpiApi.trend(dateRange),
      kpiApi.hotspots(),
      authApi.session(),
      notificationApi.list(),
    ]).then(([summary, trend, hs, user, alerts]) => {
      setKpiSummary(summary);
      setTrendData(trend);
      setHotspots(hs);
      setProfile(user);
      setLiveAlerts(alerts.slice(0, 5).map(item => ({
        id: item.id,
        text: `${item.title}: ${item.message}`,
        timestamp: new Date(item.createdAt).toLocaleTimeString(language === "kn" ? "kn-IN" : "en-IN", { hour: "2-digit", minute: "2-digit" }),
      })));
    }).catch(err => {
      console.error(err);
      setKpiSummary(mockKpiSummary);
      setTrendData(mockTrend);
      setHotspots(mockHotspots);
    }).finally(() => setLoading(false));
  }, [dateRange, language]);

  const clearanceLevel = profile?.clearance_level ?? 1;

  if (loading && !kpiSummary) return <div className="flex items-center justify-center h-full" style={{ color: "rgba(255,255,255,0.4)" }}><p>{language === "kn" ? "ಡ್ಯಾಶ್‌ಬೋರ್ಡ್ ಲೋಡ್ ಆಗುತ್ತಿದೆ..." : "Loading dashboard..."}</p></div>;

  return (
    <div className="w-full h-full overflow-y-auto scrollbar-hide relative z-10">
      <div className="p-5 md:p-6 flex flex-col gap-5">

        {/* ── Header ──────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold" style={{ color: "rgba(255,255,255,0.92)" }}>
              {t("tacticalOverview")}
              {profile && <span className="ml-3 text-xs px-2 py-1 rounded" style={{ background: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.7)" }}>{language === "kn" ? "ಹಂತ" : "Level"} {clearanceLevel}</span>}
            </h1>
            <p className="text-sm mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>
              {language === "kn" ? "ಕರ್ನಾಟಕ ರಾಜ್ಯ" : "Karnataka State"} — {new Date().toLocaleDateString(language === "kn" ? "kn-IN" : "en-IN", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
            </p>
          </div>
          <DateRangePicker value={dateRange} onChange={setDateRange} />
        </div>

        {/* ── Live Alert Ticker ───────────────────────────────── */}
        <AlertTicker alerts={liveAlerts} />

        {/* ── Stat Cards ──────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          <StatCard label={t("activeCases")} value={kpiSummary?.totalActiveCases ?? 0} icon={<Activity className="w-5 h-5" />} accentColor="#D14343" delay={0.05} />
          <StatCard label={t("alertsToday")} value={kpiSummary?.alertsToday ?? 0} icon={<AlertTriangle className="w-5 h-5" />} accentColor="#D14343" delay={0.1} />
          <StatCard label={t("onDutyUnits")} value={kpiSummary?.onDutyUnits ?? 0} icon={<Shield className="w-5 h-5" />} accentColor="#2E9E6C" delay={0.15} />
          <StatCard label={t("avgResponse")} value={kpiSummary?.avgResponseTime ?? 0} suffix={language === "kn" ? " ನಿಮಿಷ" : " min"} decimals={1} icon={<Clock className="w-5 h-5" />} accentColor="#C9A227" trend={-0.8} trendLabel={language === "kn" ? " ಕಳೆದ ವಾರಕ್ಕೆ ಹೋಲಿಸಿದರೆ" : " vs last wk"} delay={0.2} />
          
          <StatCard
            label={t("clearanceRate")} value={kpiSummary?.clearanceRate ?? 0} suffix="%" decimals={1}
            icon={<TrendingUp className="w-5 h-5" />} accentColor="#2E9E6C"
            trend={kpiSummary?.clearanceRateTrend ?? 0} trendLabel={language === "kn" ? "% ಕಳೆದ ಅವಧಿಗೆ ಹೋಲಿಸಿದರೆ" : "% vs last period"} delay={0.25}
          />
        </div>

        {/* ── Main Grid ───────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* Crime Trend Chart */}
          <div className="lg:col-span-2">
            <GlassCard
              title={t("crimeTrend")}
              subtitle={language === "kn" ? "ಪ್ರತಿ ದಿನದ ಅಪರಾಧ ಘಟನೆಗಳು" : `Incidents per ${dateRange === "today" ? "day" : dateRange === "7d" ? "week" : "day"}`}
              delay={0.3}
              action={
                <div className="flex items-center gap-1 text-[10px]" style={{ color: "rgba(255,255,255,0.35)" }}>
                  <span className="w-6 h-0.5 inline-block rounded-full" style={{ background: "#C9A227" }} />
                  {language === "kn" ? "ಘಟನೆಗಳು" : "Incidents"}
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

          {/* Patrol Mini-Widget */}
          <div className="flex flex-col gap-5">
            <GlassCard title={t("patrolUnits")} delay={0.32}
              action={
                <button onClick={() => navigate("/map")} className="text-xs font-semibold flex items-center gap-1 text-[#C9A227]">
                  {t("viewAll")} <ChevronRight className="w-3 h-3" />
                </button>
              }
            >
              <div className="flex items-center gap-6">
                <div className="text-center">
                  <p className="text-3xl font-bold text-[#2E9E6C]">{kpiSummary?.onDutyUnits ?? 0}</p>
                  <p className="text-[10px] uppercase tracking-widest mt-1 text-white/40">{t("onDuty")}</p>
                </div>
                <div className="w-px h-12 bg-white/10" />
                <div className="text-center">
                  <p className="text-3xl font-bold text-gray-500">{kpiSummary?.offDutyUnits ?? 0}</p>
                  <p className="text-[10px] uppercase tracking-widest mt-1 text-white/40">{t("offDuty")}</p>
                </div>
              </div>
            </GlassCard>
          </div>
        </div>

        {/* ── Hotspot Zones ───────────────────────────────────── */}
        <GlassCard
          title={t("hotspotZones")}
          subtitle={language === "kn" ? "ಅಪರಾಧ ನಕ್ಷೆಯಲ್ಲಿ ವೀಕ್ಷಿಸಲು ವಲಯದ ಮೇಲೆ ಕ್ಲಿಕ್ ಮಾಡಿ" : "Click zone to view on Crime Map"}
          delay={0.4}
          action={
            <button onClick={() => navigate("/map")} className="text-xs font-semibold flex items-center gap-1 text-[#C9A227]">
              {language === "kn" ? "ನಕ್ಷೆ ತೆರೆಯಿರಿ" : "Open Map"} <MapIcon className="w-3 h-3" />
            </button>
          }
        >
          <div className="flex flex-col gap-3">
            {hotspots.map((zone, i) => (
              <motion.button
                key={zone.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.45 + i * 0.05 }}
                whileHover={{ x: 4 }}
                onClick={() => navigate(`/map?zone=${encodeURIComponent(zone.zone)}`)}
                className="flex items-center gap-4 w-full text-left group"
              >
                <span className="text-lg font-bold tabular-nums w-6 shrink-0 text-white/25">
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm font-semibold text-white/85">{zone.zone}</span>
                    <div className="flex items-center gap-2">
                      <SeverityBadge severity={zone.severity} />
                      <span className="text-sm font-bold tabular-nums text-white/60">{zone.incidents}</span>
                    </div>
                  </div>
                </div>
              </motion.button>
            ))}
          </div>
        </GlassCard>

      </div>
    </div>
  );
}
