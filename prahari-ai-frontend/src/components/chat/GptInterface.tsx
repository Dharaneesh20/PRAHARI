import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Paperclip, Database,
  ArrowUp, Mic, Camera, Check, Loader2,
  Plus, MessageSquare, Brain, ChevronDown, ChevronRight, Download
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
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      setMicGranted(true);
      setIsListening(true);
      setTimeout(() => setIsListening(false), 5000);
    } catch { }
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
    <div className="flex h-full w-full relative z-10 text-white">
      {/* ── Sidebar: Recent Chats ───────────────────────────────────── */}
      <div className="hidden lg:flex flex-col w-64 border-r border-white/10 bg-black/20 backdrop-blur-xl">
        <div className="p-4 border-b border-white/10">
          <button 
            onClick={createNewSession}
            className="flex items-center gap-2 w-full px-4 py-2 bg-blue-600/80 hover:bg-blue-500 rounded-lg text-sm font-bold transition shadow-lg"
          >
            <Plus className="w-4 h-4" /> New Investigation
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 scrollbar-hide flex flex-col gap-1">
          <div className="px-3 py-2 text-xs font-bold text-gray-500 uppercase tracking-wider">Recent Chats</div>
          {sessions.map(s => (
            <button
              key={s.id}
              onClick={() => loadSession(s.id)}
              className={`flex items-center gap-3 px-3 py-3 rounded-lg text-left text-sm transition ${currentSessionId === s.id ? 'bg-white/10 text-white' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}
            >
              <MessageSquare className="w-4 h-4 shrink-0 opacity-50" />
              <div className="truncate">{s.title}</div>
            </button>
          ))}
        </div>
      </div>

      {/* ── Main Chat Area ───────────────────────────────────── */}
      <div className="flex-1 flex flex-col h-full w-full max-w-4xl mx-auto p-4 md:p-6 relative">
        {chat.length > 0 && (
          <div className="flex justify-end pb-2">
            <button
              onClick={handleExportPdf}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition backdrop-blur-md"
              style={{
                background: "rgba(201,162,39,0.15)",
                color: "#C9A227",
                border: "1px solid rgba(201,162,39,0.3)"
              }}
            >
              <Download className="w-3.5 h-3.5" /> Export PDF Report
            </button>
          </div>
        )}
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
                    <span className="font-semibold text-sm text-white relative z-10">{prompt.title}</span>
                    <span className="text-xs mt-1.5 relative z-10 leading-relaxed" style={{ color: "rgba(255,255,255,0.45)" }}>
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
                          <div className="prose prose-sm dark:prose-invert max-w-none text-white prose-p:leading-relaxed prose-th:text-white prose-td:text-white/80 prose-table:border-collapse prose-th:border prose-th:border-white/20 prose-th:p-2 prose-td:border prose-td:border-white/10 prose-td:p-2">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.text}</ReactMarkdown>
                          </div>
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
