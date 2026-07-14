import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Paperclip, Database,
  ArrowUp, Mic, Camera, Check, Loader2,
} from "lucide-react";
import LiquidOrb from "../LiquidOrb";
import ConsentSheet from "../ConsentSheet";
import AttachmentModal from "../AttachmentModal";

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

// Word-by-word animated headline
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

// Camera data-flow mini diagram
function CameraDataFlow() {
  return (
    <div className="flex items-center gap-2 text-xs text-white/50 font-medium py-2">
      <span className="px-2 py-1 rounded-lg bg-white/5 border border-white/10">📷 Capture</span>
      <motion.div
        animate={{ x: [0, 4, 0] }}
        transition={{ duration: 1.5, repeat: Infinity }}
        className="flex gap-0.5"
      >
        <div className="w-1 h-1 rounded-full bg-[#C9A227]" />
        <div className="w-1 h-1 rounded-full bg-[#C9A227] opacity-70" />
        <div className="w-1 h-1 rounded-full bg-[#C9A227] opacity-40" />
      </motion.div>
      <span className="px-2 py-1 rounded-lg bg-white/5 border border-white/10">🔒 Encrypt</span>
      <motion.div
        animate={{ x: [0, 4, 0] }}
        transition={{ duration: 1.5, repeat: Infinity, delay: 0.3 }}
        className="flex gap-0.5"
      >
        <div className="w-1 h-1 rounded-full bg-[#2E9E6C]" />
        <div className="w-1 h-1 rounded-full bg-[#2E9E6C] opacity-70" />
        <div className="w-1 h-1 rounded-full bg-[#2E9E6C] opacity-40" />
      </motion.div>
      <span className="px-2 py-1 rounded-lg bg-white/5 border border-white/10">🗄️ Vault</span>
    </div>
  );
}

// Mic waveform preview for consent
function MicWaveformPreview() {
  return (
    <div className="flex items-end gap-0.5 h-8 py-1">
      {[3, 5, 8, 6, 4, 7, 9, 5, 3, 6, 8, 4, 6, 9, 5].map((h, i) => (
        <motion.div
          key={i}
          className="w-1 rounded-full"
          style={{ background: "#C9A227", opacity: 0.7 }}
          animate={{ height: [`${h * 2}px`, `${h * 3}px`, `${h * 2}px`] }}
          transition={{ duration: 0.8 + i * 0.05, repeat: Infinity, ease: "easeInOut", delay: i * 0.04 }}
        />
      ))}
    </div>
  );
}

type SendState = "idle" | "thinking" | "done";
type ChatMsg = { sender: "user" | "bot"; text: string };

export default function GptInterface() {
  const [message, setMessage] = useState("");
  const [chat, setChat] = useState<ChatMsg[]>([]);
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
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat]);

  const handleSend = (e?: React.FormEvent, presetMessage?: string) => {
    e?.preventDefault();
    const textToSend = presetMessage || message;
    if (!textToSend.trim() || sendState !== "idle") return;

    setChat((prev) => [...prev, { sender: "user", text: textToSend }]);
    setMessage("");
    setSendState("thinking");

    setTimeout(() => {
      setChat((prev) => [
        ...prev,
        {
          sender: "bot",
          text: "Accessing Prahari DB… Analyzing parameters across KSP network. No immediate threats detected in that sector at this time.",
        },
      ]);
      setSendState("done");
      setTimeout(() => setSendState("idle"), 800);
    }, 2000);
  };

  const handleCameraConfirm = async () => {
    setShowCameraConsent(false);
    try {
      await navigator.mediaDevices.getUserMedia({ video: true });
      setCameraGranted(true);
    } catch {
      /* user denied at OS level */
    }
  };

  const handleMicConfirm = async () => {
    setShowMicConsent(false);
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      setMicGranted(true);
      setIsListening(true);
      setTimeout(() => setIsListening(false), 5000);
    } catch {
      /* user denied at OS level */
    }
  };

  return (
    <div className="flex flex-col h-full w-full max-w-4xl mx-auto p-4 md:p-6 relative z-10">

      {/* ── Chat / Empty State ───────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto flex flex-col gap-6 py-4 scrollbar-hide">
        {chat.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center h-full text-center px-4 gap-8"
          >
            {/* Liquid Orb avatar */}
            <motion.div
              initial={{ scale: 0.7, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 260, damping: 20 }}
            >
              <LiquidOrb isThinking={sendState === "thinking"} size={90} />
            </motion.div>

            {/* Staggered headline */}
            <AnimatedHeadline text="How can Prahari AI assist today?" />

            {/* Suggestion cards */}
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
                    <LiquidOrb size={32} isThinking={false} />
                  </div>
                )}
                <div
                  className="max-w-[80%] px-5 py-4 text-sm leading-relaxed"
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
                  {msg.sender === "bot"
                    ? msg.text.split(" ").map((word, wi) => (
                        <motion.span
                          key={wi}
                          initial={{ opacity: 0, filter: "blur(4px)" }}
                          animate={{ opacity: 1, filter: "blur(0px)" }}
                          transition={{ delay: wi * 0.04, duration: 0.25 }}
                          className="inline-block mr-1"
                        >
                          {word}
                        </motion.span>
                      ))
                    : msg.text}
                </div>
              </motion.div>
            ))}

            {/* Thinking indicator */}
            {sendState === "thinking" && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center gap-3"
              >
                <LiquidOrb size={32} isThinking />
                <div
                  className="px-4 py-3 rounded-2xl text-sm"
                  style={{
                    background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    color: "rgba(255,255,255,0.5)",
                  }}
                >
                  <div className="flex gap-1.5 items-center">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#C9A227] animate-bounce" />
                    <div className="w-1.5 h-1.5 rounded-full bg-[#C9A227] animate-bounce [animation-delay:0.15s]" />
                    <div className="w-1.5 h-1.5 rounded-full bg-[#C9A227] animate-bounce [animation-delay:0.3s]" />
                  </div>
                </div>
              </motion.div>
            )}
            <div ref={bottomRef} />
          </>
        )}
      </div>

      {/* ── Listening caption strip ─────────────────────────────── */}
      <AnimatePresence>
        {isListening && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="w-full max-w-3xl mx-auto mb-2 px-4 py-2 rounded-xl flex items-center gap-3 text-sm"
            style={{
              background: "rgba(201,162,39,0.08)",
              border: "1px solid rgba(201,162,39,0.25)",
              color: "#C9A227",
            }}
          >
            <div className="flex items-end gap-0.5 h-4">
              {[2, 4, 3, 5, 2, 4, 3].map((h, i) => (
                <motion.div
                  key={i}
                  className="w-0.5 rounded-full bg-[#C9A227]"
                  animate={{ height: [`${h * 2}px`, `${h * 4}px`, `${h * 2}px`] }}
                  transition={{ duration: 0.5 + i * 0.07, repeat: Infinity, ease: "easeInOut" }}
                />
              ))}
            </div>
            <span className="font-medium">Listening… speak your command</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Floating Glass Input Capsule ────────────────────────── */}
      <div className="w-full max-w-3xl mx-auto">
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
            {/* Left action cluster */}
            <div className="flex items-center gap-1">
              {/* Attach */}
              <motion.button
                type="button"
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.94 }}
                onClick={() => setShowAttach(true)}
                title="Attach file"
                aria-label="Attach file"
                className="p-2.5 rounded-xl transition-colors"
                style={{ color: "rgba(255,255,255,0.4)" }}
                onMouseEnter={(e) => (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.85)"}
                onMouseLeave={(e) => (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.4)"}
              >
                <Paperclip className="w-4 h-4" />
              </motion.button>

              {/* Camera */}
              <motion.button
                type="button"
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.94 }}
                onClick={() => setShowCameraConsent(true)}
                title="Capture evidence photo"
                aria-label="Open camera"
                className="p-2.5 rounded-xl transition-colors"
                style={{ color: cameraGranted ? "#2E9E6C" : "rgba(255,255,255,0.4)" }}
                onMouseEnter={(e) => (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.85)"}
                onMouseLeave={(e) => (e.currentTarget as HTMLElement).style.color = cameraGranted ? "#2E9E6C" : "rgba(255,255,255,0.4)"}
              >
                <Camera className="w-4 h-4" />
              </motion.button>

              {/* Link DB */}
              <motion.button
                type="button"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                title="Link Evidence / Case ID from DB"
                aria-label="Link database"
                className="p-2.5 rounded-xl transition-colors flex items-center gap-1.5"
                style={{ color: "rgba(255,255,255,0.4)" }}
                onMouseEnter={(e) => (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.85)"}
                onMouseLeave={(e) => (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.4)"}
              >
                <Database className="w-4 h-4" />
                <span className="text-[11px] font-bold uppercase tracking-wider hidden sm:block">Link DB</span>
              </motion.button>
            </div>

            {/* Right: Mic + Send */}
            <div className="flex items-center gap-2">
              {/* Mic */}
              <motion.button
                type="button"
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.94 }}
                onClick={() => micGranted ? setIsListening(!isListening) : setShowMicConsent(true)}
                aria-label="Voice input"
                className="p-2.5 rounded-xl transition-all"
                style={{
                  color: isListening ? "#C9A227" : "rgba(255,255,255,0.4)",
                  boxShadow: isListening ? "0 0 12px rgba(201,162,39,0.35)" : "none",
                  background: isListening ? "rgba(201,162,39,0.1)" : "transparent",
                  border: isListening ? "1px solid rgba(201,162,39,0.3)" : "1px solid transparent",
                }}
              >
                <Mic className="w-4 h-4" />
              </motion.button>

              {/* Send button — morphs through states */}
              <AnimatePresence mode="wait">
                {sendState === "idle" && (
                  <motion.button
                    key="send"
                    type="submit"
                    disabled={!message.trim()}
                    whileHover={{ scale: 1.06 }}
                    whileTap={{ scale: 0.94 }}
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.8, opacity: 0 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    className="p-2.5 rounded-full font-bold disabled:opacity-25"
                    style={{
                      background: "linear-gradient(135deg, #C9A227 0%, #b8901f 100%)",
                      color: "#000",
                      boxShadow: "0 4px 16px rgba(201,162,39,0.4)",
                    }}
                    aria-label="Send message"
                  >
                    <ArrowUp className="w-4 h-4" />
                  </motion.button>
                )}
                {sendState === "thinking" && (
                  <motion.div
                    key="thinking"
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.8, opacity: 0 }}
                    className="p-2.5 rounded-full"
                    style={{ background: "rgba(201,162,39,0.15)", border: "1px solid rgba(201,162,39,0.3)" }}
                  >
                    <Loader2 className="w-4 h-4 animate-spin" style={{ color: "#C9A227" }} />
                  </motion.div>
                )}
                {sendState === "done" && (
                  <motion.div
                    key="done"
                    initial={{ scale: 0.6, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 1.4, opacity: 0 }}
                    transition={{ type: "spring", stiffness: 300, damping: 16 }}
                    className="p-2.5 rounded-full"
                    style={{ background: "rgba(46,158,108,0.2)", border: "1px solid rgba(46,158,108,0.4)" }}
                  >
                    <Check className="w-4 h-4" style={{ color: "#2E9E6C" }} />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </motion.form>

        <p className="text-center text-xs mt-3 tracking-wide" style={{ color: "rgba(255,255,255,0.25)" }}>
          Prahari AI can make mistakes. Verify all critical case data independently.
        </p>
      </div>

      {/* ── Modals & Consent Sheets ─────────────────────────────── */}
      <AttachmentModal
        isOpen={showAttach}
        onClose={() => setShowAttach(false)}
      />

      <ConsentSheet
        isOpen={showCameraConsent}
        onConfirm={handleCameraConfirm}
        onDismiss={() => setShowCameraConsent(false)}
        icon={<Camera className="w-7 h-7 text-[#C9A227]" />}
        headline="Camera access is required to capture evidence photos."
        body="Images are encrypted end-to-end, stored only in the case's secure evidence vault, access-logged on the blockchain audit-ledger, never used for AI training, and auto-deleted per KSP retention policy unless attached to an active case."
        diagram={<CameraDataFlow />}
        primaryLabel="Allow Camera Access"
        secondaryLabel="Not Now"
        badge="E2E Encrypted · Audit Logged"
      />

      <ConsentSheet
        isOpen={showMicConsent}
        onConfirm={handleMicConfirm}
        onDismiss={() => setShowMicConsent(false)}
        icon={<Mic className="w-7 h-7 text-[#C9A227]" />}
        headline="Microphone access for bilingual voice commands."
        body="Voice is transcribed locally for English + Kannada understanding. Only the text transcript is retained (never raw audio) unless you explicitly save it to a case. Never used to train external models."
        diagram={<MicWaveformPreview />}
        primaryLabel="Enable Microphone"
        secondaryLabel="Not Now"
        badge="Local Transcription Only"
      />
    </div>
  );
}