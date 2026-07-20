import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Paperclip, Database,
  ArrowUp, Mic, MicOff, Camera, Check, Loader2,
  Plus, MessageSquare, Brain, ChevronDown, ChevronRight, Download,
  Volume2, VolumeX, Globe
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import LiquidOrb from "../LiquidOrb";
import ConsentSheet from "../ConsentSheet";
import AttachmentModal from "../AttachmentModal";
import { apiFetch, ml } from "../../lib/api";

const SUGGESTED_PROMPTS = [
  {
    title: "Analyze Hotspots",
    emoji: "📍",
    text: "Show me high-risk crime zones in Koramangala for tonight.",
    desc: "Live crime density heat-map analysis",
  },
  {
    title: "Pull Case File",
    emoji: "📁",
    text: "Fetch details for Case ID #FIR-2026-892 from the database.",
    desc: "Retrieve secure case records instantly",
  },
  {
    title: "Process OCR",
    emoji: "🔍",
    text: "Extract license plate numbers from the latest CCTV footage.",
    desc: "AI-powered text extraction from images",
  },
  {
    title: "Patrol Routing",
    emoji: "🗺️",
    text: "Optimize patrol routes based on current active alerts.",
    desc: "Smart route generation for field units",
  },
];

function AnimatedHeadline({ text }: { text: string }) {
  const words = text.split(" ");
  return (
    <h2 className="text-3xl font-bold tracking-wide text-center" style={{ color: "rgba(255,255,255,0.92)" }}>
      {words.map((word, i) => (
        <motion.span
          key={i}
          initial={{ opacity: 0, y: 10, filter: "blur(4px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ delay: i * 0.05, duration: 0.35, ease: [0.34, 1.56, 0.64, 1] }}
          className="inline-block mr-2"
        >
          {word}
        </motion.span>
      ))}
    </h2>
  );
}

function ThinkingBlock({ thinking, isStreaming }: { thinking?: string; isStreaming?: boolean }) {
  const [isOpen, setIsOpen] = useState(false);

  if (!thinking) return null;

  return (
    <div className="mb-3 rounded-xl border border-white/10 bg-black/30 overflow-hidden text-xs">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-3 py-2 text-white/70 hover:text-white hover:bg-white/5 transition-colors font-mono text-left"
      >
        <div className="flex items-center gap-2">
          <Brain className="w-3.5 h-3.5 text-[#C9A227]" />
          <span className="font-semibold text-white/80">Thought process</span>
          {isStreaming && (
            <span className="inline-flex gap-1 items-center ml-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#C9A227] animate-ping" />
            </span>
          )}
        </div>
        {isOpen ? <ChevronDown className="w-3.5 h-3.5 text-white/50" /> : <ChevronRight className="w-3.5 h-3.5 text-white/50" />}
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="px-3.5 py-2.5 border-t border-white/5 bg-black/40 font-mono text-white/60 whitespace-pre-wrap leading-relaxed max-h-60 overflow-y-auto text-[11px]"
          >
            {thinking}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
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

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Modal / sheet states
  const [showAttach, setShowAttach] = useState(false);
  const [showCameraConsent, setShowCameraConsent] = useState(false);
  const [showMicConsent, setShowMicConsent] = useState(false);
  const [cameraGranted, setCameraGranted] = useState(false);
  const [micGranted, setMicGranted] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchSessions();
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat, sendState]);

  const startVoiceRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/wav" });
        try {
          setIsListening(true);
          const sttRes = await ml.zia.speechToText(audioBlob, selectedLang);
          if (sttRes && sttRes.text) {
            setMessage(sttRes.text);
            handleSend(undefined, sttRes.text);
          }
        } catch (e) {
          console.error("Zia STT processing error", e);
        } finally {
          setIsListening(false);
          setIsRecording(false);
          stream.getTracks().forEach(track => track.stop());
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
      setShowMicConsent(false);
    } catch (err) {
      console.error("Mic access failed", err);
      alert("Microphone access denied or unsupported browser.");
    }
  };

  const stopVoiceRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
    }
  };

  const handlePlayTTS = async (idx: number, text: string) => {
    if (isPlayingAudio === idx) {
      setIsPlayingAudio(null);
      if ("speechSynthesis" in window) window.speechSynthesis.cancel();
      return;
    }
    setIsPlayingAudio(idx);
    try {
      const audioUrl = await ml.zia.textToSpeech(text, selectedLang);
      if (audioUrl) {
        const audio = new Audio(audioUrl);
        audio.onended = () => setIsPlayingAudio(null);
        audio.play();
      } else if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
        const cleanText = text.replace(/[*#_`|]/g, "").slice(0, 300);
        const utterance = new SpeechSynthesisUtterance(cleanText);
        utterance.lang = selectedLang;
        utterance.onend = () => setIsPlayingAudio(null);
        window.speechSynthesis.speak(utterance);
      }
    } catch (e) {
      console.error("TTS playback failed", e);
      setIsPlayingAudio(null);
    }
  };

  const fetchSessions = async () => {
    try {
      const data = await apiFetch<ChatSession[]>("/api/v1/chat/sessions");
      setSessions(data);
    } catch (e) {
      console.error("Failed to fetch sessions", e);
    }
  };

  const loadSession = async (id: number) => {
    try {
      const msgs = await apiFetch<any[]>(`/api/v1/chat/sessions/${id}/messages`);
      setChat(msgs.map(m => ({ sender: m.sender, text: m.text })));
      setCurrentSessionId(id);
    } catch (e) {
      console.error("Failed to load session", e);
    }
  };

  const createNewSession = () => {
    setCurrentSessionId(null);
    setChat([]);
  };

  const handleSend = async (e?: React.FormEvent, presetMessage?: string) => {
    e?.preventDefault();
    const textToSend = presetMessage || message;
    if (!textToSend.trim() || sendState !== "idle") return;

    setChat((prev) => [...prev, { sender: "user", text: textToSend }]);
    setMessage("");
    setSendState("thinking");

    let botMsgIdx = -1;
    setChat((prev) => {
      botMsgIdx = prev.length;
      return [...prev, { sender: "bot", text: "", thinking: "" }];
    });

    try {
      let accumulatedText = "";
      let accumulatedThinking = "";
      await ml.nl2sqlStream(
        textToSend,
        (token: string) => {
          accumulatedText += token;
          setChat((prev) => {
            const copy = [...prev];
            if (copy[botMsgIdx]) {
              copy[botMsgIdx] = { ...copy[botMsgIdx], text: accumulatedText };
            }
            return copy;
          });
        },
        (_meta: any) => {
          setSendState("done");
        },
        (err: string) => {
          setChat((prev) => {
            const copy = [...prev];
            if (copy[botMsgIdx]) {
              copy[botMsgIdx] = { ...copy[botMsgIdx], text: `**Error:** ${err}` };
            }
            return copy;
          });
        },
        (thinkingToken: string) => {
          accumulatedThinking += thinkingToken;
          setChat((prev) => {
            const copy = [...prev];
            if (copy[botMsgIdx]) {
              copy[botMsgIdx] = { ...copy[botMsgIdx], thinking: accumulatedThinking };
            }
            return copy;
          });
        }
      );

      setSendState("done");
      setTimeout(() => setSendState("idle"), 800);
    } catch (error: any) {
      const errMsg = typeof error === "string"
        ? error
        : (error?.message || (typeof error?.detail === "string" ? error.detail : JSON.stringify(error)));
      setChat((prev) => {
        const copy = [...prev];
        if (botMsgIdx !== -1 && copy[botMsgIdx]) {
          copy[botMsgIdx] = { sender: "bot", text: `**Error:** ${errMsg || "Failed to contact Prahari Server."}` };
          return copy;
        }
        return [...prev, { sender: "bot", text: `**Error:** ${errMsg || "Failed to contact Prahari Server."}` }];
      });
      setSendState("idle");
    }
  };

  const handleCameraConfirm = async () => {
    setShowCameraConsent(false);
    try {
      await navigator.mediaDevices.getUserMedia({ video: true });
      setCameraGranted(true);
    } catch { }
  };

  const handleMicConfirm = async () => {
    setShowMicConsent(false);
    startVoiceRecording();
  };

  const handleExportPdf = async () => {
    try {
      await ml.exportPdf(currentSessionId || "1");
    } catch (e) {
      console.error("PDF export failed", e);
      alert("Failed to export PDF report. Please check backend server.");
    }
  };

  return (
    <div className="flex h-full w-full relative z-10 text-slate-900 dark:text-white">
      {/* ── Sidebar: Recent Chats ───────────────────────────────────── */}
      <div className="hidden lg:flex flex-col w-64 border-r border-slate-200 dark:border-white/10 bg-white/70 dark:bg-black/20 backdrop-blur-xl">
        <div className="p-4 border-b border-slate-200 dark:border-white/10">
          <button 
            onClick={createNewSession}
            className="flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-bold transition shadow-md"
          >
            <Plus className="w-4 h-4" /> New Investigation
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 scrollbar-hide flex flex-col gap-1">
          <div className="px-3 py-2 text-xs font-bold text-slate-500 dark:text-gray-400 uppercase tracking-wider">Recent Chats</div>
          {sessions.map(s => (
            <button
              key={s.id}
              onClick={() => loadSession(s.id)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-left text-sm transition font-medium ${
                currentSessionId === s.id
                  ? 'bg-blue-600/15 dark:bg-white/10 text-blue-700 dark:text-white border border-blue-500/30 dark:border-white/20'
                  : 'text-slate-700 dark:text-gray-300 hover:bg-slate-200/70 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <MessageSquare className="w-4 h-4 shrink-0 opacity-60 text-slate-600 dark:text-slate-400" />
              <div className="truncate">{s.title}</div>
            </button>
          ))}
        </div>
      </div>

      {/* ── Main Chat Area ───────────────────────────────────── */}
      <div className="flex-1 flex flex-col h-full w-full max-w-4xl mx-auto p-4 md:p-6 relative">
        <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-white/10 mb-2 flex-wrap">
          {/* Zoho Catalyst Zia Badge */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white/80 dark:bg-black/40 text-xs font-mono text-slate-800 dark:text-white/80 shadow-sm">
            <img src="/catalyst.svg" alt="Catalyst" className="w-4 h-4 inline" />
            <img src="/zoho-logo-web.svg" alt="Zoho" className="h-3.5 inline dark:hidden" />
            <img src="/zoho-logo-darkbg.svg" alt="Zoho" className="h-3.5 hidden dark:inline opacity-90" />
            <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold uppercase tracking-wider ml-0.5">Zia Services</span>
          </div>

          <div className="flex items-center gap-2">
            {/* Language Selector */}
            <div className="flex items-center gap-1 bg-white/80 dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-xl p-1 text-xs shadow-sm">
              <button
                type="button"
                onClick={() => setSelectedLang("en-IN")}
                className={`px-2.5 py-1 rounded-lg font-semibold transition ${selectedLang === "en-IN" ? "bg-[#C9A227] text-black shadow-sm" : "text-slate-600 dark:text-white/60 hover:text-slate-900 dark:hover:text-white"}`}
              >
                🇬🇧 EN
              </button>
              <button
                type="button"
                onClick={() => setSelectedLang("kn-IN")}
                className={`px-2.5 py-1 rounded-lg font-semibold transition ${selectedLang === "kn-IN" ? "bg-[#C9A227] text-black shadow-sm" : "text-slate-600 dark:text-white/60 hover:text-slate-900 dark:hover:text-white"}`}
              >
                🇮🇳 ಕನ್ನಡ KN
              </button>
            </div>

            {chat.length > 0 && (
              <button
                onClick={handleExportPdf}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition backdrop-blur-md"
                style={{
                  background: "rgba(201,162,39,0.15)",
                  color: "#C9A227",
                  border: "1px solid rgba(201,162,39,0.3)"
                }}
              >
                <Download className="w-3.5 h-3.5" /> Export PDF
              </button>
            )}
          </div>
        </div>

        {/* Voice Input Modal Overlay when Recording */}
        <AnimatePresence>
          {(isRecording || isListening) && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-3 p-4 rounded-2xl border border-amber-500/40 bg-black/80 backdrop-blur-xl shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-4 z-20"
            >
              <div className="flex items-center gap-3">
                <div className="relative flex items-center justify-center">
                  <span className="w-10 h-10 rounded-full bg-red-500/20 animate-ping absolute" />
                  <div className="w-8 h-8 rounded-full bg-red-600 flex items-center justify-center text-white relative z-10 shadow-lg">
                    <Mic className="w-4 h-4 animate-pulse" />
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-white">
                      {isListening ? "Processing STT..." : "Listening..."}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 font-mono">
                      {selectedLang === "kn-IN" ? "ಕನ್ನಡ (kn-IN)" : "English (en-IN)"}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-300 mt-1">
                    <span>Powered by</span>
                    <img src="/zoho-logo-darkbg.svg" alt="Zoho" className="h-3.5 inline" />
                    <img src="/catalyst.svg" alt="Catalyst" className="w-3.5 h-3.5 inline ml-0.5" />
                    <span className="font-semibold text-amber-400">Zoho Catalyst Zia Services</span>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={stopVoiceRecording}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs shadow-lg transition flex items-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5" /> Stop & Transcribe
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex-1 overflow-y-auto overflow-x-visible px-2 sm:px-6 flex flex-col gap-6 py-4 scrollbar-hide">
          {chat.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center h-full text-center px-4 gap-8"
            >
              <motion.div
                initial={{ scale: 0.7, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 260, damping: 20 }}
              >
                <LiquidOrb isThinking={sendState === "thinking"} size={90} />
              </motion.div>

              <AnimatedHeadline text="How can Prahari AI assist today?" />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-2xl">
                {SUGGESTED_PROMPTS.map((prompt, idx) => (
                  <motion.button
                    key={idx}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.08 + 0.3, type: "spring", stiffness: 260, damping: 22 }}
                    whileHover={{ y: -3, scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleSend(undefined, prompt.text)}
                    className="glass-specular group relative flex flex-col items-start p-5 text-left rounded-2xl overflow-hidden"
                    style={{
                      backdropFilter: "blur(16px)",
                      WebkitBackdropFilter: "blur(16px)",
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(255,255,255,0.09)",
                      transition: "border-color 0.25s, box-shadow 0.25s",
                    }}
                    onMouseEnter={(e) => {
                      const el = e.currentTarget as HTMLElement;
                      el.style.borderColor = "rgba(201,162,39,0.45)";
                      el.style.boxShadow = "0 0 20px rgba(201,162,39,0.12), inset 0 0 20px rgba(201,162,39,0.04)";
                    }}
                    onMouseLeave={(e) => {
                      const el = e.currentTarget as HTMLElement;
                      el.style.borderColor = "rgba(255,255,255,0.09)";
                      el.style.boxShadow = "none";
                    }}
                  >
                    <span className="text-xl mb-2">{prompt.emoji}</span>
                    <span className="font-semibold text-sm text-slate-900 dark:text-white relative z-10">{prompt.title}</span>
                    <span className="text-xs mt-1.5 relative z-10 leading-relaxed text-slate-600 dark:text-white/60">
                      {prompt.desc}
                    </span>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          ) : (
            <>
              {chat.map((msg, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ type: "spring", stiffness: 260, damping: 22 }}
                  className={`flex w-full gap-3 ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
                >
                  {msg.sender === "bot" && (
                    <div className="shrink-0 mt-1">
                      <LiquidOrb size={32} isThinking={sendState === "thinking" && !msg.text} />
                    </div>
                  )}
                  <div
                    className="max-w-[85%] px-5 py-4 text-sm leading-relaxed overflow-x-auto"
                    style={
                      msg.sender === "user"
                        ? {
                            background: "linear-gradient(135deg, #C9A227 0%, #b8901f 100%)",
                            color: "#000",
                            borderRadius: "20px 20px 6px 20px",
                            fontWeight: 500,
                          }
                        : {
                            backdropFilter: "blur(16px)",
                            background: "rgba(255,255,255,0.06)",
                            border: "1px solid rgba(255,255,255,0.1)",
                            color: "rgba(255,255,255,0.88)",
                            borderRadius: "6px 20px 20px 20px",
                          }
                    }
                  >
                    {msg.sender === "bot" ? (
                      <>
                        <ThinkingBlock thinking={msg.thinking} isStreaming={sendState === "thinking" && !msg.text} />
                        {msg.text ? (
                          <>
                            <div className="prose prose-sm dark:prose-invert max-w-none text-white prose-p:leading-relaxed prose-th:text-white prose-td:text-white/80 prose-table:border-collapse prose-th:border prose-th:border-white/20 prose-th:p-2 prose-td:border prose-td:border-white/10 prose-td:p-2">
                              <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.text}</ReactMarkdown>
                            </div>
                            <div className="mt-3 pt-2 border-t border-white/10 flex items-center justify-between">
                              <button
                                type="button"
                                onClick={() => handlePlayTTS(idx, msg.text)}
                                title="Read Aloud via Zoho Catalyst Zia Voice"
                                className="text-xs font-semibold inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition"
                              >
                                {isPlayingAudio === idx ? (
                                  <>
                                    <VolumeX className="w-3.5 h-3.5 text-amber-400 animate-spin" />
                                    <span className="text-[11px] text-amber-400">Stop Voice</span>
                                  </>
                                ) : (
                                  <>
                                    <Volume2 className="w-3.5 h-3.5 text-amber-400" />
                                    <span className="text-[11px]">Read Aloud</span>
                                  </>
                                )}
                              </button>
                              <div className="flex items-center gap-1 text-[10px] text-white/40 font-mono">
                                <img src="/catalyst.svg" alt="Catalyst" className="w-3 h-3 inline" />
                                <span>Zia Voice</span>
                              </div>
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
                    ) : (
                      msg.text
                    )}
                  </div>
                </motion.div>
              ))}

              <div ref={bottomRef} />
            </>
          )}
        </div>

        {/* ── Floating Glass Input Capsule ────────────────────────── */}
        <div className="w-full max-w-3xl mx-auto mt-2">
          <motion.form
            onSubmit={handleSend}
            animate={isFocused ? { scale: 1.01 } : { scale: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 22 }}
            className="glass-specular relative flex flex-col w-full overflow-hidden"
            style={{
              borderRadius: 24,
              backdropFilter: "blur(24px) saturate(160%)",
              WebkitBackdropFilter: "blur(24px) saturate(160%)",
              background: "rgba(255,255,255,0.055)",
              border: isFocused
                ? "1px solid rgba(201,162,39,0.55)"
                : "1px solid rgba(255,255,255,0.12)",
              boxShadow: isFocused
                ? "0 0 0 2px rgba(201,162,39,0.15), 0 8px 32px rgba(0,0,0,0.4), inset 0 1px 1px rgba(255,255,255,0.08)"
                : "0 8px 32px rgba(0,0,0,0.3), inset 0 1px 1px rgba(255,255,255,0.06)",
              transition: "border-color 0.25s, box-shadow 0.25s",
            }}
          >
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend(e as unknown as React.FormEvent);
                }
              }}
              placeholder="Query databases, analyze footage, or generate reports…"
              className="w-full max-h-48 min-h-[60px] py-4 pl-5 pr-12 bg-transparent outline-none resize-none text-sm font-medium"
              style={{ color: "rgba(255,255,255,0.88)" }}
              rows={1}
            />

            <div className="flex items-center justify-between px-3 pb-3 pt-1">
              <div className="flex items-center gap-1">
                <motion.button type="button" whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.94 }} onClick={() => setShowAttach(true)} className="p-2.5 rounded-xl transition-colors text-white/40 hover:text-white/85">
                  <Paperclip className="w-4 h-4" />
                </motion.button>
                <motion.button type="button" whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.94 }} onClick={() => setShowCameraConsent(true)} className="p-2.5 rounded-xl transition-colors" style={{ color: cameraGranted ? "#2E9E6C" : "rgba(255,255,255,0.4)" }}>
                  <Camera className="w-4 h-4" />
                </motion.button>
                <motion.button type="button" whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="p-2.5 rounded-xl transition-colors flex items-center gap-1.5 text-white/40 hover:text-white/85">
                  <Database className="w-4 h-4" />
                  <span className="text-[11px] font-bold uppercase tracking-wider hidden sm:block">Link DB</span>
                </motion.button>
              </div>

              <div className="flex items-center gap-2">
                <motion.button type="button" whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.94 }} onClick={() => micGranted ? setIsListening(!isListening) : setShowMicConsent(true)} className="p-2.5 rounded-xl transition-all" style={{ color: isListening ? "#C9A227" : "rgba(255,255,255,0.4)", background: isListening ? "rgba(201,162,39,0.1)" : "transparent" }}>
                  <Mic className="w-4 h-4" />
                </motion.button>
                <motion.button type="submit" disabled={!message.trim() || sendState !== "idle"} className="p-2.5 rounded-xl transition-all disabled:opacity-30" style={{ background: message.trim() ? "#C9A227" : "rgba(255,255,255,0.08)", color: message.trim() ? "#000" : "rgba(255,255,255,0.3)" }} whileHover={{ scale: message.trim() ? 1.05 : 1 }} whileTap={{ scale: message.trim() ? 0.95 : 1 }}>
                  {sendState === "done" ? <Check className="w-4 h-4" /> : sendState === "thinking" ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowUp className="w-4 h-4" />}
                </motion.button>
              </div>
            </div>
          </motion.form>
          <div className="text-center mt-3 mb-1">
            <span className="text-[10px] text-white/30 uppercase tracking-widest font-semibold">
              Prahari AI can make mistakes. Verify all critical case data independently.
            </span>
          </div>
        </div>
      </div>

      <ConsentSheet
        isOpen={showCameraConsent}
        headline="Camera Access Request"
        body="Prahari AI needs camera access to process visual evidence and OCR scans."
        icon={<Camera className="w-7 h-7" style={{ color: "#C9A227" }} />}
        onConfirm={handleCameraConfirm}
        onDismiss={() => setShowCameraConsent(false)}
      />
      <ConsentSheet
        isOpen={showMicConsent}
        headline="Microphone Access Request"
        body="Enable voice commands to speak directly with Prahari AI during fieldwork."
        icon={<Mic className="w-7 h-7" style={{ color: "#C9A227" }} />}
        onConfirm={handleMicConfirm}
        onDismiss={() => setShowMicConsent(false)}
      />
      <AttachmentModal isOpen={showAttach} onClose={() => setShowAttach(false)} />
    </div>
  );
}
