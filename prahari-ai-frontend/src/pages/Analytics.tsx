import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Info } from "lucide-react";
import GlassCard, { glassPanelStyle } from "../components/GlassCard";
import { SvgBarChart } from "../components/SvgChart";
import DateRangePicker, { type DateRange } from "../components/DateRangePicker";
import { analytics as analyticsApi } from "../lib/api";
import type { CrimeCategory, RiskZone, StationStats, AgeGroup, TimeSlot } from "../lib/types";
import { mockAgeGroups, mockCategories, mockRiskZones, mockStations, mockTimeDistribution } from "../data/mockData";
import { useAppContext } from "../context/AppContext";

type Tab = "patterns" | "risk" | "stations" | "demographics";

const RISK_COLOR = (score: number) =>
  score >= 80 ? "#D14343" : score >= 65 ? "#F97316" : score >= 50 ? "#C9A227" : "#2E9E6C";

export default function Analytics() {
  const { t, language } = useAppContext();
  const [tab, setTab] = useState<Tab>("patterns");
  const [dateRange, setDateRange] = useState<DateRange>("30d");
  const [categories, setCategories] = useState<CrimeCategory[]>([]);
  const [riskZones, setRiskZones] = useState<RiskZone[]>([]);
  const [stations, setStations] = useState<StationStats[]>([]);
  const [loading, setLoading] = useState(true);

  const TABS_TRANSLATED: { value: Tab; label: string }[] = [
    { value: "patterns", label: language === "kn" ? "ಅಪರಾಧ ನಮೂನೆಗಳು" : "Crime Patterns" },
    { value: "risk", label: language === "kn" ? "ಮುನ್ಸೂಚನೆಯ ಅಪಾಯ" : "Predictive Risk" },
    { value: "stations", label: language === "kn" ? "ಠಾಣೆ ಹೋಲಿಕೆ" : "Station Comparison" },
    { value: "demographics", label: language === "kn" ? "ಜನಸಂಖ್ಯಾಶಾಸ್ತ್ರ" : "Demographics" },
  ];

  useEffect(() => {
    Promise.all([
      analyticsApi.patterns(),
      analyticsApi.risk(),
      analyticsApi.stations(),
      analyticsApi.demographics(),
    ]).then(([pat, risk, stat]) => {
      setCategories(pat.categories);
      setRiskZones(risk);
      setStations(stat);
    }).catch(err => {
      console.error(err);
      setCategories(mockCategories);
      setRiskZones(mockRiskZones);
      setStations(mockStations);
    })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center h-full text-white/40"><p>{language === "kn" ? "ವಿಶ್ಲೇಷಣೆ ಲೋಡ್ ಆಗುತ್ತಿದೆ..." : "Loading analytics..."}</p></div>;

  return (
    <div className="flex flex-col h-full overflow-hidden text-white">
      {/* Header */}
      <div className="shrink-0 px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10">
        <h1 className="font-bold text-lg text-white">{t("navAnalytics")}</h1>
        <div className="flex items-center gap-3">
          <DateRangePicker value={dateRange} onChange={setDateRange} />
        </div>
      </div>

      {/* Tab nav */}
      <div className="shrink-0 px-5 py-2 flex gap-1 overflow-x-auto scrollbar-hide border-b border-white/10">
        {TABS_TRANSLATED.map(tItem => (
          <div key={tItem.value} className="relative shrink-0">
            {tab === tItem.value && (
              <motion.div layoutId="analytics-tab-active"
                className="absolute inset-0 rounded-xl bg-[#C9A227]/15 border border-[#C9A227]/35"
                transition={{ type: "spring", stiffness: 380, damping: 28 }} />
            )}
            <button onClick={() => setTab(tItem.value)}
              className="relative z-10 px-4 py-2 text-sm font-semibold rounded-xl whitespace-nowrap"
              style={{ color: tab === tItem.value ? "#C9A227" : "rgba(255,255,255,0.45)" }}>
              {tItem.label}
            </button>
          </div>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto scrollbar-hide p-5">
        <AnimatePresence mode="wait">
          {tab === "patterns" && (
            <motion.div key="patterns" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex flex-col gap-5">
              <GlassCard title={language === "kn" ? "ವರ್ಗಾವಾರು ಅಪರಾಧಗಳು" : "Crime by Category"}>
                <div className="flex flex-col gap-3">
                  {categories.map((c, i) => (
                    <div key={c.type} className="flex items-center gap-3">
                      <span className="text-xs font-semibold w-32 shrink-0 text-white/70">{c.type}</span>
                      <div className="flex-1 h-2 rounded-full bg-white/10 overflow-hidden">
                        <div className="h-full bg-[#C9A227] rounded-full" style={{ width: `${Math.min(100, (c.count / 500) * 100)}%` }} />
                      </div>
                      <span className="text-xs font-bold text-white font-mono">{c.count}</span>
                    </div>
                  ))}
                </div>
              </GlassCard>
            </motion.div>
          )}

          {tab === "risk" && (
            <motion.div key="risk" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {riskZones.map((z) => (
                <GlassCard key={z.zone} title={z.zone}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-white/60">{language === "kn" ? "ಅಪಾಯದ ಅಂಕಗಳು" : "Risk Score"}</span>
                    <span className="text-lg font-bold font-mono" style={{ color: RISK_COLOR(z.riskScore) }}>{z.riskScore}/100</span>
                  </div>
                </GlassCard>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
