import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Paperclip, Database,
  ArrowUp, Mic, Camera, Check, Loader2,
  Plus, MessageSquare, Brain, ChevronDown, ChevronRight, Download,
  Volume2, VolumeX, Menu, X, ScanLine, ImageIcon, Zap,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import LiquidOrb from "../LiquidOrb";
import ConsentSheet from "../ConsentSheet";
import AttachmentModal from "../AttachmentModal";
import { apiFetch, ml } from "../../lib/api";

const SUGGESTED_PROMPTS_EN = [
  { title: "Analyze Hotspots", emoji: "📍", text: "Show me high-risk crime zones in Koramangala for tonight.", desc: "Live crime density heat-map analysis" },
  { title: "Pull Case File", emoji: "📁", text: "Fetch details for Case ID #FIR-2026-892 from the database.", desc: "Retrieve secure case records instantly" },
  { title: "Cybercrime Reports", emoji: "⚖️", text: "Get chargesheet rates and pending cases for cybercrime in Karnataka.", desc: "Comprehensive database report" },
  { title: "Co-Accused Networks", emoji: "🕸️", text: "Analyze co-accused gang networks in Bengaluru.", desc: "Offender network and linkage graph" },
];

const SUGGESTED_PROMPTS_KN = [
  { title: "ಹಾಟ್‌ಸ್ಪಾಟ್ ವಿಶ್ಲೇಷಣೆ", emoji: "📍", text: "ವೈಟ್‌ಫೀಲ್ಡ್ ಮತ್ತು ಕೋರಮಂಗಲ ವ್ಯಾಪ್ತಿಯಲ್ಲಿ ಇತ್ತೀಚಿನ ಕಳ್ಳತನ ಪ್ರಕರಣಗಳ ಅಂಕಿಅಂಶಗಳನ್ನು ತೋರಿಸಿ.", desc: "ಲೈವ್ ಅಪರಾಧ ಸಾಂದ್ರತೆ ಮತ್ತು ವಲಯದ ವಿಶ್ಲೇಷಣೆ" },
  { title: "ಸೈಬರ್ ಅಪರಾಧ ವರದಿ", emoji: "⚖️", text: "ಕರ್ನಾಟಕದಲ್ಲಿ ಇತ್ತೀಚಿನ ಸೈಬರ್ ಅಪರಾಧ ಚಾರ್ಜ್‌ಶೀಟ್ ದರ ಮತ್ತು ಬಾಕಿ ಪ್ರಕರಣಗಳನ್ನು ನೀಡಿ.", desc: "ಸೈಬರ್ ಅಪರಾಧಗಳ ಸಂಪೂರ್ಣ ಡೇಟಾಬೇಸ್ ವಿವರಣೆ" },
  { title: "ಮೈಸೂರು ಭೀಕರ ಅಪರಾಧಗಳು", emoji: "🚨", text: "ಮೈಸೂರು ನಗರದಲ್ಲಿ ದಾಖಲಾಗಿರುವ ಪ್ರಮುಖ ಭೀಕರ ಅಪರಾಧಗಳ ವಿವರಣೆಗಳನ್ನು ನೀಡಿ.", desc: "ಜಿಲ್ಲಾವಾರು ಭೀಕರ ಅಪರಾಧಗಳ ವಿಶ್ಲೇಷಣೆ" },
  { title: "ಗ್ಯಾಂಗ್ ಮತ್ತು ಸಿಂಡಿಕೇಟ್ ಜಾಲ", emoji: "🕸️", text: "ಬೆಂಗಳೂರಿನಲ್ಲಿ ಸಹ-ಆರೋಪಿಗಳ ಪ್ರಮುಖ ಗ್ಯಾಂಗ್ ಮತ್ತು ಸಿಂಡಿಕೇಟ್ ಜಾಲಗಳನ್ನು ವಿಶ್ಲೇಷಿಸಿ.", desc: "ಅಪರಾಧ ನೆಟ್‌ವರ್ಕ್ ಮತ್ತು ಸಂಪರ್ಕ ನಕ್ಷೆ" },
];

function AnimatedHeadline({ text }: { text: string }) {
  const words = text.split(" ");
  return (
    <h2 className="text-2xl sm:text-3xl font-bold tracking-wide text-center" style={{ color: "rgba(255,255,255,0.92)" }}>
      {words.map((word, i) => (
        <motion.span key={i} initial={{ opacity: 0, y: 10, filter: "blur(4px)" }} animate={{ opacity: 1, y: 0, filter: "blur(0px)" }} transition={{ delay: i * 0.05, duration: 0.35, ease: [0.34, 1.56, 0.64, 1] }} className="inline-block mr-2">{word}</motion.span>
      ))}
    </h2>
  );
}

function ThinkingBlock({ thinking, isStreaming }: { thinking?: string; isStreaming?: boolean }) {
  const [isOpen, setIsOpen] = useState(false);
  if (!thinking) return null;
  return (
    <div className="mb-3 rounded-xl border border-white/10 bg-black/30 overflow-hidden text-xs">
      <button type="button" onClick={() => setIsOpen(!isOpen)} className="w-full flex items-center justify-between px-3 py-2 text-white/70 hover:text-white hover:bg-white/5 transition-colors font-mono text-left">
        <div className="flex items-center gap-2">
          <Brain className="w-3.5 h-3.5 text-[#C9A227]" />
          <span className="font-semibold text-white/80">Thought process</span>
          {isStreaming && <span className="inline-flex gap-1 items-center ml-1"><span className="w-1.5 h-1.5 rounded-full bg-[#C9A227] animate-ping" /></span>}
        </div>
        {isOpen ? <ChevronDown className="w-3.5 h-3.5 text-white/50" /> : <ChevronRight className="w-3.5 h-3.5 text-white/50" />}
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="px-3.5 py-2.5 border-t border-white/5 bg-black/40 font-mono text-white/60 whitespace-pre-wrap leading-relaxed max-h-60 overflow-y-auto text-[11px]">
            {thinking}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── OCR Scan Panel ─────────────────────────────────────────────────────────────
type OcrState = "idle" | "scanning" | "done" | "error";

function OcrScanPanel({
  onClose,
  onResult,
  selectedLang,
}: {
  onClose: () => void;
  onResult: (text: string) => void;
  selectedLang: "en-IN" | "kn-IN";
}) {
  const [ocrState, setOcrState] = useState<OcrState>("idle");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [extractedText, setExtractedText] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const accTextRef = useRef("");

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
    setOcrState("scanning");
    setExtractedText("");
    setErrorMsg("");
    accTextRef.current = "";

    try {
      await ml.zia.ocrScan(
        file,
        selectedLang.startsWith("kn") ? "kn" : "en",
        (token) => {
          // Replace literal \n with actual newlines (OCR may stream escaped)
          const decoded = token.replace(/\\n/g, "\n");
          accTextRef.current += decoded;
          setExtractedText(accTextRef.current);
        },
        () => {
          setOcrState("done");
        },
        (err) => {
          setOcrState("error");
          setErrorMsg(err);
        }
      );
    } catch (err: any) {
      setOcrState("error");
      setErrorMsg(err?.message || "OCR failed");
    }
  };

  const handleUseText = () => {
    onResult(accTextRef.current);
    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 12 }}
      className="mx-3 mt-2 shrink-0 rounded-2xl border border-amber-500/30 overflow-hidden"
      style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(24px)" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg flex items-center justify-center bg-amber-500/10 border border-amber-500/30">
            <img src="/catalyst.svg" alt="Catalyst" className="w-4 h-4" />
          </div>
          <span className="text-sm font-bold text-white flex items-center gap-1.5">
            Zoho Catalyst Zia™ OCR Engine
          </span>
          <span className="hidden sm:inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-mono text-[#C9A227] border border-[#C9A227]/30" style={{ background: "rgba(201,162,39,0.08)" }}>
            <img src="/zoho-logo-darkbg.svg" alt="Zoho" className="h-2.5 opacity-80" />
            <span>Zia™ Services</span>
          </span>
        </div>
        <button onClick={onClose} className="p-1 rounded-lg text-white/40 hover:text-white/80 transition active:scale-90">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="p-4 flex flex-col sm:flex-row gap-4">
        {/* Left: image drop zone / preview */}
        <div className="relative shrink-0 w-full sm:w-44 h-36 rounded-xl overflow-hidden border border-white/10 flex items-center justify-center cursor-pointer"
          style={{ background: "rgba(255,255,255,0.03)" }}
          onClick={() => ocrState === "idle" && fileInputRef.current?.click()}
        >
          {previewUrl ? (
            <>
              <img src={previewUrl} alt="OCR target" className="w-full h-full object-cover" />
              {/* Scan animation overlay */}
              {ocrState === "scanning" && (
                <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ background: "rgba(0,0,0,0.4)" }}>
                  {/* Animated scan line */}
                  <motion.div
                    className="absolute left-0 right-0 h-0.5"
                    style={{ background: "linear-gradient(to right, transparent, #C9A227, transparent)", boxShadow: "0 0 12px #C9A227" }}
                    animate={{ top: ["0%", "100%", "0%"] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  />
                  {/* Corner brackets */}
                  <div className="absolute inset-2 pointer-events-none">
                    <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-[#C9A227] rounded-tl" />
                    <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-[#C9A227] rounded-tr" />
                    <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-[#C9A227] rounded-bl" />
                    <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-[#C9A227] rounded-br" />
                  </div>
                  <span className="text-[10px] font-bold text-[#C9A227] mt-auto mb-2 z-10 flex items-center gap-1">
                    <Zap className="w-2.5 h-2.5 animate-pulse" /> Scanning...
                  </span>
                </div>
              )}
              {ocrState === "done" && (
                <div className="absolute inset-0 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.35)" }}>
                  <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: "rgba(34,197,94,0.2)", border: "1.5px solid #22c55e" }}>
                    <Check className="w-5 h-5 text-green-400" />
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center gap-2 text-white/30">
              <ImageIcon className="w-8 h-8" />
              <span className="text-[11px] font-medium text-center px-3">Click to select image<br/>(PNG, JPG, WEBP)</span>
            </div>
          )}
          <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="hidden" onChange={handleFileSelect} />
        </div>

        {/* Right: extracted text stream */}
        <div className="flex-1 flex flex-col gap-2 min-h-[120px]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">
              {ocrState === "scanning" ? "Extracting text..." : ocrState === "done" ? "Text extracted" : ocrState === "error" ? "Error" : "Extracted Text"}
            </span>
            {ocrState === "scanning" && (
              <span className="flex items-center gap-1 text-[10px] text-[#C9A227] font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-[#C9A227] animate-pulse" />
                LIVE
              </span>
            )}
          </div>

          <div className="flex-1 rounded-xl border border-white/10 p-3 overflow-y-auto text-xs font-mono leading-relaxed min-h-[80px] max-h-[140px]"
            style={{ background: "rgba(255,255,255,0.03)", color: ocrState === "error" ? "#f87171" : "rgba(255,255,255,0.8)", whiteSpace: "pre-wrap" }}
          >
            {ocrState === "error"
              ? `Error: ${errorMsg}`
              : ocrState === "idle" && !extractedText
              ? <span className="text-white/20 italic">Select an image to begin OCR scanning…</span>
              : extractedText || <span className="text-white/20 italic">Waiting for tokens…</span>
            }
          </div>

          <div className="flex items-center gap-2">
            {!previewUrl && (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 py-2 rounded-xl text-xs font-bold transition active:scale-95"
                style={{ background: "rgba(201,162,39,0.15)", color: "#C9A227", border: "1px solid rgba(201,162,39,0.3)" }}
              >
                Select Image
              </button>
            )}
            {ocrState === "done" && extractedText && (
              <button
                onClick={handleUseText}
                className="flex-1 py-2 rounded-xl text-xs font-bold transition active:scale-95 bg-[#C9A227] text-black flex items-center justify-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5" /> Use Extracted Text
              </button>
            )}
            {previewUrl && ocrState !== "scanning" && (
              <button
                onClick={() => { setPreviewUrl(null); setOcrState("idle"); setExtractedText(""); setErrorMsg(""); accTextRef.current = ""; if (fileInputRef.current) fileInputRef.current.value = ""; }}
                className="px-3 py-2 rounded-xl text-xs font-bold transition text-white/40 hover:text-white/70"
                style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

type SendState = "idle" | "thinking" | "done";
type ChatMsg = { sender: "user" | "bot"; text: string; thinking?: string };
type ChatSession = { id: number; title: string; created_at: string };

export default function GptInterface() {
  const [message, setMessage] = useState("");
  const [chat, setChat] = useState<ChatMsg[]>([]);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<number | null>(null);
  const [sendState, setSendState] = useState<SendState>("idle");
  const [isListening, setIsListening] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [selectedLang, setSelectedLang] = useState<"en-IN" | "kn-IN">("en-IN");
  const [isRecording, setIsRecording] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState<number | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showOcrPanel, setShowOcrPanel] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const [showAttach, setShowAttach] = useState(false);
  const [showCameraConsent, setShowCameraConsent] = useState(false);
  const [showMicConsent, setShowMicConsent] = useState(false);
  const [cameraGranted, setCameraGranted] = useState(false);
  const [micGranted, setMicGranted] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { fetchSessions(); }, []);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chat, sendState]);
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === "Escape") { setIsSidebarOpen(false); setShowOcrPanel(false); } };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  const startVoiceRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      mediaRecorder.ondataavailable = (event) => { if (event.data.size > 0) audioChunksRef.current.push(event.data); };
      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/wav" });
        try {
          setIsListening(true);
          const sttRes = await ml.zia.speechToText(audioBlob, selectedLang);
          if (sttRes && sttRes.status === "success" && sttRes.text) {
            setMessage(sttRes.text);
            handleSend(undefined, sttRes.text);
          } else {
            alert("Speech-to-Text unavailable at the moment. Kindly use text input.");
          }
        } catch (e) {
          console.error("Zia STT processing error", e);
          alert("Speech-to-Text unavailable at the moment. Kindly use text input.");
        } finally { setIsListening(false); setIsRecording(false); stream.getTracks().forEach(t => t.stop()); }
      };
      mediaRecorder.start();
      setIsRecording(true);
      setShowMicConsent(false);
    } catch (err) { console.error("Mic access failed", err); alert("Microphone access denied or unsupported browser."); }
  };

  const stopVoiceRecording = () => { if (mediaRecorderRef.current && isRecording) mediaRecorderRef.current.stop(); };

  const handlePlayTTS = async (idx: number, text: string) => {
    if (isPlayingAudio === idx) { setIsPlayingAudio(null); if ("speechSynthesis" in window) window.speechSynthesis.cancel(); return; }
    setIsPlayingAudio(idx);
    try {
      const audioUrl = await ml.zia.textToSpeech(text, selectedLang);
      if (audioUrl) { const audio = new Audio(audioUrl); audio.onended = () => setIsPlayingAudio(null); audio.play(); }
      else if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text.replace(/[*#_`|]/g, "").slice(0, 300));
        utterance.lang = selectedLang;
        utterance.onend = () => setIsPlayingAudio(null);
        window.speechSynthesis.speak(utterance);
      }
    } catch (e) { console.error("TTS playback failed", e); setIsPlayingAudio(null); }
  };

  const fetchSessions = async () => {
    try { const data = await apiFetch<ChatSession[]>("/api/v1/chat/sessions"); setSessions(data); }
    catch (e) { console.error("Failed to fetch sessions", e); }
  };

  const loadSession = async (id: number) => {
    try {
      const msgs = await apiFetch<any[]>(`/api/v1/chat/sessions/${id}/messages`);
      setChat(msgs.map(m => ({ sender: m.sender, text: m.text })));
      setCurrentSessionId(id);
      setIsSidebarOpen(false);
    } catch (e) { console.error("Failed to load session", e); }
  };

  const createNewSession = () => { setCurrentSessionId(null); setChat([]); setIsSidebarOpen(false); };

  const handleSend = async (e?: React.FormEvent, presetMessage?: string) => {
    e?.preventDefault();
    const textToSend = presetMessage || message;
    if (!textToSend.trim() || sendState !== "idle") return;
    setShowOcrPanel(false);

    setChat((prev) => [...prev, { sender: "user", text: textToSend }]);
    setMessage("");
    setSendState("thinking");

    let botMsgIdx = -1;
    setChat((prev) => { botMsgIdx = prev.length; return [...prev, { sender: "bot", text: "", thinking: "" }]; });

    try {
      let accumulatedText = "";
      let accumulatedThinking = "";
      await ml.nl2sqlStream(
        textToSend,
        (token: string) => {
          accumulatedText += token;
          setChat((prev) => { const copy = [...prev]; if (copy[botMsgIdx]) copy[botMsgIdx] = { ...copy[botMsgIdx], text: accumulatedText }; return copy; });
        },
        (_meta: any) => { setSendState("done"); },
        (err: string) => {
          setChat((prev) => { const copy = [...prev]; if (copy[botMsgIdx]) copy[botMsgIdx] = { ...copy[botMsgIdx], text: `**Error:** ${err}` }; return copy; });
        },
        (thinkingToken: string) => {
          accumulatedThinking += thinkingToken;
          setChat((prev) => { const copy = [...prev]; if (copy[botMsgIdx]) copy[botMsgIdx] = { ...copy[botMsgIdx], thinking: accumulatedThinking }; return copy; });
        }
      );
      setSendState("done");
      setTimeout(() => setSendState("idle"), 800);
    } catch (error: any) {
      const errMsg = typeof error === "string" ? error : (error?.message || (typeof error?.detail === "string" ? error.detail : JSON.stringify(error)));
      setChat((prev) => {
        const copy = [...prev];
        if (botMsgIdx !== -1 && copy[botMsgIdx]) { copy[botMsgIdx] = { sender: "bot", text: `**Error:** ${errMsg || "Failed to contact Prahari Server."}` }; return copy; }
        return [...prev, { sender: "bot", text: `**Error:** ${errMsg || "Failed to contact Prahari Server."}` }];
      });
      setSendState("idle");
    }
  };

  const handleCameraConfirm = async () => { setShowCameraConsent(false); try { await navigator.mediaDevices.getUserMedia({ video: true }); setCameraGranted(true); } catch { } };
  const handleMicConfirm = async () => { setShowMicConsent(false); startVoiceRecording(); };
  const handleExportPdf = async () => {
    try { await ml.exportPdf(currentSessionId || "1"); }
    catch (e) { console.error("PDF export failed", e); alert("Failed to export PDF report. Please check backend server."); }
  };

  const SidebarContent = () => (
    <>
      <div className="p-3 border-b border-slate-200 dark:border-white/10 shrink-0">
        <button onClick={createNewSession} className="flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-bold transition shadow-md active:scale-95">
          <Plus className="w-4 h-4" /> New Investigation
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-2 scrollbar-hide flex flex-col gap-1">
        <div className="px-3 py-2 text-xs font-bold text-slate-500 dark:text-gray-400 uppercase tracking-wider">Recent Chats</div>
        {sessions.length === 0 && <p className="px-3 py-6 text-xs text-slate-400 dark:text-white/30 text-center">No recent chats</p>}
        {sessions.map(s => (
          <button key={s.id} onClick={() => loadSession(s.id)} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-left text-sm transition font-medium w-full ${currentSessionId === s.id ? 'bg-blue-600/15 dark:bg-white/10 text-blue-700 dark:text-white border border-blue-500/30 dark:border-white/20' : 'text-slate-700 dark:text-gray-300 hover:bg-slate-200/70 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white'}`}>
            <MessageSquare className="w-4 h-4 shrink-0 opacity-60 text-slate-600 dark:text-slate-400" />
            <div className="truncate">{s.title}</div>
          </button>
        ))}
      </div>
    </>
  );

  return (
    <div className="flex h-full w-full relative z-10 text-slate-900 dark:text-white overflow-hidden">

      {/* Mobile Backdrop */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden" onClick={() => setIsSidebarOpen(false)} />
        )}
      </AnimatePresence>

      {/* Mobile Sidebar Drawer */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div initial={{ x: "-100%" }} animate={{ x: 0 }} exit={{ x: "-100%" }} transition={{ type: "spring", stiffness: 320, damping: 32 }} className="fixed top-0 left-0 h-full z-50 w-72 flex flex-col border-r border-slate-200 dark:border-white/10 bg-white dark:bg-[#0e1118] shadow-2xl lg:hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-white/10 shrink-0">
              <span className="text-sm font-bold text-slate-800 dark:text-white/80 uppercase tracking-wider">Chats</span>
              <button onClick={() => setIsSidebarOpen(false)} className="p-1.5 rounded-lg text-slate-500 dark:text-white/50 hover:bg-slate-100 dark:hover:bg-white/10 transition"><X className="w-4 h-4" /></button>
            </div>
            <SidebarContent />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Desktop Sidebar */}
      <div className="hidden lg:flex flex-col w-64 shrink-0 border-r border-slate-200 dark:border-white/10 bg-white/70 dark:bg-black/20 backdrop-blur-xl">
        <SidebarContent />
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col h-full min-w-0 relative">

        {/* Toolbar */}
        <div className="shrink-0 flex items-center gap-2 px-3 sm:px-4 py-2 border-b border-slate-200 dark:border-white/10">
          <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden p-2 rounded-xl text-slate-600 dark:text-white/60 hover:bg-slate-100 dark:hover:bg-white/10 transition shrink-0 active:scale-90" aria-label="Open recent chats">
            <Menu className="w-5 h-5" />
          </button>
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white/80 dark:bg-black/40 text-xs font-mono text-slate-800 dark:text-white/80 shadow-sm shrink-0">
            <img src="/catalyst.svg" alt="Catalyst" className="w-4 h-4" />
            <img src="/zoho-logo-web.svg" alt="Zoho" className="h-3.5 dark:hidden" />
            <img src="/zoho-logo-darkbg.svg" alt="Zoho" className="h-3.5 hidden dark:block opacity-90" />
            <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold uppercase tracking-wider">Zia Services</span>
          </div>
          <div className="flex-1 min-w-0" />
          <div className="flex items-center bg-white/80 dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-xl p-1 text-xs shadow-sm shrink-0">
            <button type="button" onClick={() => setSelectedLang("en-IN")} className={`px-2 py-1 rounded-lg font-semibold transition ${selectedLang === "en-IN" ? "bg-[#C9A227] text-black shadow-sm" : "text-slate-600 dark:text-white/60"}`}>🇬🇧 EN</button>
            <button type="button" onClick={() => setSelectedLang("kn-IN")} className={`px-2 py-1 rounded-lg font-semibold transition ${selectedLang === "kn-IN" ? "bg-[#C9A227] text-black shadow-sm" : "text-slate-600 dark:text-white/60"}`}>🇮🇳 <span className="hidden sm:inline">ಕನ್ನಡ </span>KN</button>
          </div>
          {chat.length > 0 && (
            <button onClick={handleExportPdf} className="flex items-center gap-1.5 px-2 sm:px-3 py-1.5 rounded-xl text-xs font-bold transition shrink-0" style={{ background: "rgba(201,162,39,0.15)", color: "#C9A227", border: "1px solid rgba(201,162,39,0.3)" }} title="Export PDF">
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Export PDF</span>
            </button>
          )}
        </div>

        {/* Voice Banner */}
        <AnimatePresence>
          {(isRecording || isListening) && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="mx-3 mt-2 overflow-hidden shrink-0">
              <div className="p-3 rounded-2xl border border-amber-500/40 bg-black/80 backdrop-blur-xl shadow-2xl flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-3">
                  <div className="relative flex items-center justify-center shrink-0">
                    <span className="w-8 h-8 rounded-full bg-red-500/20 animate-ping absolute" />
                    <div className="w-7 h-7 rounded-full bg-red-600 flex items-center justify-center text-white relative z-10 shadow-lg">
                      <Mic className="w-3.5 h-3.5 animate-pulse" />
                    </div>
                  </div>
                  <div>
                    <span className="font-bold text-sm text-white">{isListening ? "Processing STT..." : "Listening..."}</span>
                    <div className="text-[11px] text-slate-300 mt-0.5">Powered by Zia</div>
                  </div>
                </div>
                <button type="button" onClick={stopVoiceRecording} className="px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs shadow-lg transition flex items-center gap-1.5 shrink-0">
                  <Check className="w-3.5 h-3.5" /> Stop & Transcribe
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* OCR Panel */}
        <AnimatePresence>
          {showOcrPanel && (
            <OcrScanPanel
              onClose={() => setShowOcrPanel(false)}
              onResult={(text) => setMessage((prev) => prev ? prev + "\n" + text : text)}
              selectedLang={selectedLang}
            />
          )}
        </AnimatePresence>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden px-3 sm:px-5 flex flex-col gap-4 sm:gap-6 py-4 scrollbar-hide">
          {chat.length === 0 ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center h-full text-center px-2 gap-6">
              <motion.div initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 260, damping: 20 }}>
                <LiquidOrb isThinking={sendState === "thinking"} size={80} />
              </motion.div>
              <AnimatedHeadline text={selectedLang === "kn-IN" ? "ಪ್ರಹರಿ AI ಇಂದು ನಿಮಗೆ ಹೇಗೆ ಸಹಾಯ ಮಾಡಬಹುದು?" : "How can Prahari AI assist today?"} />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-2xl">
                {(selectedLang === "kn-IN" ? SUGGESTED_PROMPTS_KN : SUGGESTED_PROMPTS_EN).map((prompt, idx) => (
                  <motion.button key={idx} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.08 + 0.3, type: "spring", stiffness: 260, damping: 22 }} whileTap={{ scale: 0.97 }} onClick={() => handleSend(undefined, prompt.text)} className="glass-specular group relative flex flex-col items-start p-4 text-left rounded-2xl overflow-hidden" style={{ backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.09)" }} onMouseEnter={(e) => { const el = e.currentTarget as HTMLElement; el.style.borderColor = "rgba(201,162,39,0.45)"; el.style.boxShadow = "0 0 20px rgba(201,162,39,0.12)"; }} onMouseLeave={(e) => { const el = e.currentTarget as HTMLElement; el.style.borderColor = "rgba(255,255,255,0.09)"; el.style.boxShadow = "none"; }}>
                    <span className="text-xl mb-2">{prompt.emoji}</span>
                    <span className="font-semibold text-sm text-slate-900 dark:text-white">{prompt.title}</span>
                    <span className="text-xs mt-1.5 leading-relaxed text-slate-600 dark:text-white/60">{prompt.desc}</span>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          ) : (
            <>
              {chat.map((msg, idx) => (
                <motion.div key={idx} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ type: "spring", stiffness: 260, damping: 22 }} className={`flex w-full gap-2 ${msg.sender === "user" ? "justify-end" : "justify-start"}`}>
                  {msg.sender === "bot" && <div className="shrink-0 mt-1"><LiquidOrb size={28} isThinking={sendState === "thinking" && !msg.text} /></div>}
                  <div className="max-w-[88%] sm:max-w-[80%] px-4 py-3 text-sm leading-relaxed" style={msg.sender === "user" ? { background: "linear-gradient(135deg, #C9A227 0%, #b8901f 100%)", color: "#000", borderRadius: "18px 18px 5px 18px", fontWeight: 500, wordBreak: "break-word", overflowWrap: "break-word" } : { backdropFilter: "blur(16px)", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.88)", borderRadius: "5px 18px 18px 18px", wordBreak: "break-word", overflowWrap: "break-word", overflowX: "auto" }}>
                    {msg.sender === "bot" ? (
                      <>
                        <ThinkingBlock thinking={msg.thinking} isStreaming={sendState === "thinking" && !msg.text} />
                        {msg.text ? (
                          <>
                            <div className="prose prose-sm dark:prose-invert max-w-none text-white prose-p:leading-relaxed prose-th:text-white prose-td:text-white/80 prose-table:border-collapse prose-th:border prose-th:border-white/20 prose-th:p-2 prose-td:border prose-td:border-white/10 prose-td:p-2 prose-pre:overflow-x-auto prose-pre:max-w-full">
                              <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.text}</ReactMarkdown>
                            </div>
                            <div className="mt-3 pt-2 border-t border-white/10 flex items-center justify-between flex-wrap gap-2">
                              <button type="button" onClick={() => handlePlayTTS(idx, msg.text)} title="Read Aloud" className="text-xs font-semibold inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition">
                                {isPlayingAudio === idx ? <><VolumeX className="w-3.5 h-3.5 text-amber-400" /><span className="text-[11px] text-amber-400">Stop</span></> : <><Volume2 className="w-3.5 h-3.5 text-amber-400" /><span className="text-[11px]">Read Aloud</span></>}
                              </button>
                              <div className="flex items-center gap-1 text-[10px] text-white/40 font-mono"><img src="/catalyst.svg" alt="Catalyst" className="w-3 h-3" /><span>Zia Voice</span></div>
                            </div>
                          </>
                        ) : (
                          <div className="flex gap-1.5 items-center py-1">
                            <div className="w-1.5 h-1.5 rounded-full bg-[#C9A227] animate-bounce" />
                            <div className="w-1.5 h-1.5 rounded-full bg-[#C9A227] animate-bounce [animation-delay:0.15s]" />
                            <div className="w-1.5 h-1.5 rounded-full bg-[#C9A227] animate-bounce [animation-delay:0.3s]" />
                          </div>
                        )}
                      </>
                    ) : msg.text}
                  </div>
                </motion.div>
              ))}
              <div ref={bottomRef} />
            </>
          )}
        </div>

        {/* Input Bar */}
        <div className="shrink-0 w-full px-3 sm:px-4 pb-3 pt-2">
          <motion.form onSubmit={handleSend} animate={isFocused ? { scale: 1.005 } : { scale: 1 }} transition={{ type: "spring", stiffness: 300, damping: 22 }} className="glass-specular relative flex flex-col w-full overflow-hidden" style={{ borderRadius: 20, backdropFilter: "blur(24px) saturate(160%)", WebkitBackdropFilter: "blur(24px) saturate(160%)", background: "rgba(255,255,255,0.055)", border: isFocused ? "1px solid rgba(201,162,39,0.55)" : "1px solid rgba(255,255,255,0.12)", boxShadow: isFocused ? "0 0 0 2px rgba(201,162,39,0.15), 0 8px 32px rgba(0,0,0,0.4)" : "0 8px 32px rgba(0,0,0,0.3)", transition: "border-color 0.25s, box-shadow 0.25s" }}>
            <textarea value={message} onChange={(e) => setMessage(e.target.value)} onFocus={() => setIsFocused(true)} onBlur={() => setIsFocused(false)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(e as unknown as React.FormEvent); } }} placeholder="Query databases, analyze footage, or generate reports…" className="w-full max-h-36 min-h-[52px] py-3.5 pl-4 pr-4 bg-transparent outline-none resize-none text-sm font-medium" style={{ color: "rgba(255,255,255,0.88)" }} rows={1} />
            <div className="flex items-center justify-between px-2 pb-2 pt-0">
              <div className="flex items-center gap-0.5">
                <motion.button type="button" whileTap={{ scale: 0.9 }} onClick={() => setShowAttach(true)} className="p-2 rounded-xl transition-colors text-white/40 hover:text-white/85 active:bg-white/10"><Paperclip className="w-4 h-4" /></motion.button>
                {/* Camera button now opens OCR panel */}
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setShowOcrPanel(v => !v)}
                  className="p-2 rounded-xl transition-colors active:bg-white/10 relative"
                  style={{ color: showOcrPanel ? "#C9A227" : "rgba(255,255,255,0.4)", background: showOcrPanel ? "rgba(201,162,39,0.1)" : "transparent" }}
                  title="Image OCR Scanner"
                >
                  <Camera className="w-4 h-4" />
                  {showOcrPanel && <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-[#C9A227]" />}
                </motion.button>
                <motion.button type="button" whileTap={{ scale: 0.95 }} className="p-2 rounded-xl transition-colors flex items-center gap-1 text-white/40 hover:text-white/85 active:bg-white/10">
                  <Database className="w-4 h-4" />
                  <span className="text-[10px] font-bold uppercase tracking-wider hidden md:block">Link DB</span>
                </motion.button>
              </div>
              <div className="flex items-center gap-1.5">
                <motion.button type="button" whileTap={{ scale: 0.9 }} onClick={() => micGranted ? setIsListening(!isListening) : setShowMicConsent(true)} className="p-2 rounded-xl transition-all" style={{ color: isListening ? "#C9A227" : "rgba(255,255,255,0.4)", background: isListening ? "rgba(201,162,39,0.1)" : "transparent" }}>
                  <Mic className="w-4 h-4" />
                </motion.button>
                <motion.button type="submit" disabled={!message.trim() || sendState !== "idle"} className="p-2.5 rounded-xl transition-all disabled:opacity-30" style={{ background: message.trim() ? "#C9A227" : "rgba(255,255,255,0.08)", color: message.trim() ? "#000" : "rgba(255,255,255,0.3)" }} whileTap={{ scale: message.trim() ? 0.92 : 1 }}>
                  {sendState === "done" ? <Check className="w-4 h-4" /> : sendState === "thinking" ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowUp className="w-4 h-4" />}
                </motion.button>
              </div>
            </div>
          </motion.form>
          <div className="text-center mt-2">
            <span className="text-[10px] text-white/30 uppercase tracking-widest font-semibold">Prahari AI can make mistakes. Verify all critical case data independently.</span>
          </div>
        </div>
      </div>

      <ConsentSheet isOpen={showCameraConsent} headline="Camera Access Request" body="Prahari AI needs camera access to process visual evidence and OCR scans." icon={<Camera className="w-7 h-7" style={{ color: "#C9A227" }} />} onConfirm={handleCameraConfirm} onDismiss={() => setShowCameraConsent(false)} />
      <ConsentSheet isOpen={showMicConsent} headline="Microphone Access Request" body="Enable voice commands to speak directly with Prahari AI during fieldwork." icon={<Mic className="w-7 h-7" style={{ color: "#C9A227" }} />} onConfirm={handleMicConfirm} onDismiss={() => setShowMicConsent(false)} />
      <AttachmentModal isOpen={showAttach} onClose={() => setShowAttach(false)} />
    </div>
  );
}
