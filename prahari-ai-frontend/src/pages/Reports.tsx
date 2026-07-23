import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Plus, FileText, Download, ChevronRight } from "lucide-react";
import GlassCard from "../components/GlassCard";
import { ReportStatusBadge } from "../components/StatusBadge";
import type { Report } from "../lib/types";
import { reports as reportsApi } from "../lib/api";
import { mockReports } from "../data/mockData";
import { useAppContext } from "../context/AppContext";

type GenerateState = "idle" | "thinking" | "streaming" | "done";

function ReportRow({ report, selected, onClick }: { report: Report; selected: boolean; onClick: () => void }) {
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ x: 2 }}
      className="w-full flex items-center gap-3 px-4 py-3.5 text-left transition-all"
      style={{
        background: selected ? "rgba(201,162,39,0.08)" : "transparent",
        borderLeft: selected ? "2px solid #C9A227" : "2px solid transparent",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
        style={{ background: "rgba(63,92,134,0.25)", color: "#7BA7CC" }}>
        <FileText className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold truncate" style={{ color: "rgba(255,255,255,0.85)" }}>{report.title}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.3)" }}>{report.caseId}</span>
          <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.2)" }}>·</span>
          <ReportStatusBadge status={report.status} />
        </div>
      </div>
      <ChevronRight className="w-4 h-4 shrink-0" style={{ color: "rgba(255,255,255,0.2)" }} />
    </motion.button>
  );
}

export default function Reports() {
  const { t, language } = useAppContext();
  const [reportsList, setReportsList] = useState<Report[]>([]);
  const [selected, setSelected] = useState<Report | null>(null);
  const [search, setSearch] = useState("");
  const [showBuilder, setShowBuilder] = useState(false);
  const [loading, setLoading] = useState(true);

  // Builder form state
  const [genCaseId, setGenCaseId] = useState("FIR-2026-8921");
  const [genType, setGenType] = useState("Chargesheet Summary");
  const [genNotes, setGenNotes] = useState("");
  const [genState, setGenState] = useState<GenerateState>("idle");
  const [streamedText, setStreamedText] = useState("");

  useEffect(() => {
    reportsApi.list()
      .then(res => {
        setReportsList(res);
        if (res.length > 0) setSelected(res[0]);
      })
      .catch(err => {
        console.error(err);
        setReportsList(mockReports);
        setSelected(mockReports[0] ?? null);
      })
      .finally(() => setLoading(false));
  }, []);

  const filtered = reportsList.filter(r =>
    r.title.toLowerCase().includes(search.toLowerCase()) ||
    r.caseId.toLowerCase().includes(search.toLowerCase())
  );

  const handleGenerate = async () => {
    if (!genCaseId) return;
    setGenState("thinking");
    setStreamedText("");
    try {
      setGenState("streaming");
      for await (const token of reportsApi.streamGenerate(genCaseId, genType, genNotes)) {
        setStreamedText(p => p + token);
      }
      setGenState("done");
    } catch (err) {
      console.error("Stream failed", err);
      setStreamedText(language === "kn" ? "ವರದಿ ರಚಿಸಲು ಸಾಧ್ಯವಾಗಲಿಲ್ಲ." : "Failed to generate report.");
      setGenState("done");
    }
  };

  const handleDownload = () => {
    const blob = new Blob([selected?.sections.map(s => `## ${s.heading}\n${s.content}`).join("\n\n") ?? ""], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${selected?.id ?? "report"}.txt`; a.click();
    URL.revokeObjectURL(url);
  };

  const hasActiveSelection = !!selected || showBuilder;

  return (
    <div className="flex h-full overflow-hidden">

      {/* ── Left: Report List ─────────────────────────────────── */}
      <div 
        className={`flex-col w-full md:w-80 shrink-0 border-r ${hasActiveSelection ? "hidden md:flex" : "flex"}`} 
        style={{ borderColor: "rgba(255,255,255,0.07)" }}
      >
        <div className="p-4 shrink-0" style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
          <div className="flex items-center justify-between mb-3">
            <h1 className="font-bold" style={{ color: "rgba(255,255,255,0.92)" }}>{t("navReports")}</h1>
            <button
              onClick={() => { setShowBuilder(true); setSelected(null); }}
              className="p-1.5 rounded-lg transition-all"
              style={{ background: "rgba(201,162,39,0.15)", color: "#C9A227", border: "1px solid rgba(201,162,39,0.3)" }}
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: "rgba(255,255,255,0.3)" }} />
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder={language === "kn" ? "ವರದಿಗಳನ್ನು ಹುಡುಕಿ..." : "Search reports..."}
              className="w-full pl-8 pr-3 py-2 rounded-lg text-xs outline-none text-white"
              style={{ background: "rgba(255,255,255,0.055)", border: "1px solid rgba(255,255,255,0.09)" }}
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto scrollbar-hide">
          {loading ? (
            <div className="p-4 text-center text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>{language === "kn" ? "ವರದಿಗಳನ್ನು ಲೋಡ್ ಮಾಡಲಾಗುತ್ತಿದೆ..." : "Loading reports..."}</div>
          ) : (
            filtered.map(r => (
              <ReportRow key={r.id} report={r} selected={selected?.id === r.id && !showBuilder} onClick={() => { setSelected(r); setShowBuilder(false); }} />
            ))
          )}
        </div>
      </div>

      {/* ── Right: Detail / Builder ───────────────────────────── */}
      <div className={`flex-1 overflow-y-auto scrollbar-hide ${hasActiveSelection ? "flex" : "hidden md:flex"} flex-col`}>
        <AnimatePresence mode="wait">

          {/* Report Builder */}
          {showBuilder && (
            <motion.div key="builder" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="p-4 md:p-5 flex flex-col gap-5 h-full">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setShowBuilder(false)} 
                    className="md:hidden px-3 py-1.5 rounded-xl text-xs font-bold"
                    style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.6)", border: "1px solid rgba(255,255,255,0.1)" }}
                  >
                    ← Back
                  </button>
                  <h2 className="text-lg font-bold" style={{ color: "rgba(255,255,255,0.92)" }}>{language === "kn" ? "AI ವರದಿ ರಚನೆಕಾರ" : "AI Draft Generator"}</h2>
                </div>
                <button onClick={() => setShowBuilder(false)} className="text-xs hidden md:block" style={{ color: "rgba(255,255,255,0.4)" }}>{language === "kn" ? "ರದ್ದುಮಾಡಿ" : "Cancel"}</button>
              </div>

              <GlassCard>
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.4)" }}>{language === "kn" ? "ಪ್ರಕರಣದ ಐಡಿ" : "Case ID"}</label>
                    <input value={genCaseId} onChange={e => setGenCaseId(e.target.value)} placeholder="e.g. INC-007"
                      className="px-3 py-2 rounded-lg text-sm outline-none text-white"
                      style={{ background: "rgba(255,255,255,0.055)", border: "1px solid rgba(255,255,255,0.09)" }} />
                  </div>
                  <button onClick={handleGenerate} className="py-2.5 rounded-xl font-bold text-xs text-black" style={{ background: "#C9A227" }}>
                    {language === "kn" ? "AI ವರದಿ ರಚಿಸಿ" : "Generate Report"}
                  </button>
                </div>
              </GlassCard>
            </motion.div>
          )}

          {/* Report Details View */}
          {selected && !showBuilder && (
            <motion.div key={selected.id} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="p-4 md:p-5 flex flex-col gap-5">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-white">{selected.title}</h2>
                  <p className="text-xs text-slate-400 font-mono mt-0.5">{selected.caseId}</p>
                </div>
                <button onClick={handleDownload} className="px-3 py-1.5 rounded-xl text-xs font-bold bg-[#C9A227] text-black flex items-center gap-1.5 shadow-md">
                  <Download className="w-3.5 h-3.5" /> Download
                </button>
              </div>

              {selected.sections.map((sec, i) => (
                <GlassCard key={i} title={sec.heading}>
                  <p className="text-xs text-slate-300 leading-relaxed font-sans">{sec.content}</p>
                </GlassCard>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
