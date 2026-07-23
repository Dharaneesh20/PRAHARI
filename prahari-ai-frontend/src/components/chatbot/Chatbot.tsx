import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageSquare, X, Send, Bot, Sparkles, Loader2, Brain, ChevronDown, ChevronRight, Languages } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ml } from "../../lib/api";

// ── Kannada language config ─────────────────────────────────────────────────
const LANG_CONFIG = {
  en: {
    code: "en",
    label: "EN",
    flag: "🇬🇧",
    placeholder: "Ask Prahari AI...",
    welcome: "Prahari AI operational. How can I assist you with crime data analytics today?",
    analyzing: "Analyzing...",
    translating: "Translating to Kannada...",
  },
  kn: {
    code: "kn",
    label: "ಕ",
    flag: "🇮🇳",
    placeholder: "ಕನ್ನಡದಲ್ಲಿ ಕೇಳಿ...",
    welcome: "ಪ್ರಹರಿ AI ಕಾರ್ಯಗತವಾಗಿದೆ. ಇಂದು ಅಪರಾಧ ವಿಶ್ಲೇಷಣೆಯ ಬಗ್ಗೆ ನಾನು ಹೇಗೆ ಸಹಾಯ ಮಾಡಲಿ?",
    analyzing: "ವಿಶ್ಲೇಷಿಸುತ್ತಿದೆ...",
    translating: "ಕನ್ನಡಕ್ಕೆ ಅನುವಾದಿಸುತ್ತಿದೆ...",
  },
};

// ── ThinkingBlock ────────────────────────────────────────────────────────────
function ThinkingBlock({ thinking, isStreaming }: { thinking?: string; isStreaming?: boolean }) {
  const [isOpen, setIsOpen] = useState(false);

  if (!thinking) return null;

  return (
    <div className="mb-2 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-black/30 overflow-hidden text-xs">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-2.5 py-1.5 text-slate-600 dark:text-white/70 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors font-mono text-left"
      >
        <div className="flex items-center gap-1.5">
          <Brain className="w-3.5 h-3.5 text-blue-500" />
          <span className="font-semibold text-slate-700 dark:text-white/80 text-[11px]">Thought process</span>
          {isStreaming && (
            <span className="inline-flex gap-1 items-center ml-1">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-ping" />
            </span>
          )}
        </div>
        {isOpen ? <ChevronDown className="w-3.5 h-3.5 opacity-60" /> : <ChevronRight className="w-3.5 h-3.5 opacity-60" />}
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="px-3 py-2 border-t border-slate-200 dark:border-white/5 bg-slate-100/50 dark:bg-black/40 font-mono text-slate-600 dark:text-white/60 whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto text-[10px]"
          >
            {thinking}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Chatbot ──────────────────────────────────────────────────────────────────
function Chatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [language, setLanguage] = useState<"en" | "kn">("en");
  const [isTranslating, setIsTranslating] = useState(false);

  const lang = LANG_CONFIG[language];

  const [chat, setChat] = useState<{ sender: "user" | "bot"; text: string; thinking?: string }[]>([
    { sender: "bot", text: LANG_CONFIG.en.welcome }
  ]);

  // ── Language toggle ──────────────────────────────────────────────────────
  const toggleLanguage = () => {
    const newLang = language === "en" ? "kn" : "en";
    setLanguage(newLang);
    // Add a language-switch notification message
    setChat((prev) => [
      ...prev,
      {
        sender: "bot",
        text: newLang === "kn"
          ? "🇮🇳 **ಕನ್ನಡ ಮೋಡ್ ಸಕ್ರಿಯ** — ಈಗ ಕನ್ನಡದಲ್ಲಿ ಕೇಳಿ!"
          : "🇬🇧 **English mode active** — Ask me anything in English!",
      }
    ]);
  };

  // ── Send message ─────────────────────────────────────────────────────────
  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || isLoading) return;

    setChat((prev) => [...prev, { sender: "user", text: message }]);
    const currentMessage = message;
    setMessage("");
    setIsLoading(true);
    setIsTranslating(false);

    let botIdx = -1;
    setChat((prev) => {
      botIdx = prev.length;
      return [...prev, { sender: "bot", text: "", thinking: "" }];
    });

    try {
      let accum = "";
      let accumThinking = "";

      await ml.nl2sqlStream(
        currentMessage,
        // onToken — stream English tokens
        (token) => {
          accum += token;
          setChat((prev) => {
            const copy = [...prev];
            if (copy[botIdx]) copy[botIdx] = { ...copy[botIdx], text: accum };
            return copy;
          });
        },
        // onMeta
        undefined,
        // onError
        (err) => {
          setChat((prev) => {
            const copy = [...prev];
            if (copy[botIdx]) copy[botIdx] = { ...copy[botIdx], text: `**Error:** ${err}` };
            return copy;
          });
        },
        // onThinking
        (thinkingToken) => {
          accumThinking += thinkingToken;
          setChat((prev) => {
            const copy = [...prev];
            if (copy[botIdx]) copy[botIdx] = { ...copy[botIdx], thinking: accumThinking };
            return copy;
          });
        },
        // sessionId
        undefined,
        // language
        language,
        // onTranslatedAnswer — swap with Kannada text
        (translatedText) => {
          setIsTranslating(false);
          setChat((prev) => {
            const copy = [...prev];
            if (copy[botIdx]) copy[botIdx] = { ...copy[botIdx], text: translatedText };
            return copy;
          });
        }
      );

      // Show "translating" indicator while waiting for Kannada translation event
      if (language === "kn" && accum.trim()) {
        setIsTranslating(true);
      }
    } catch (error: any) {
      const errMsg =
        typeof error === "string"
          ? error
          : error?.message || (typeof error?.detail === "string" ? error.detail : JSON.stringify(error));
      setChat((prev) => {
        const copy = [...prev];
        if (botIdx !== -1 && copy[botIdx]) {
          copy[botIdx] = { sender: "bot", text: `**Error:** ${errMsg || "Failed to fetch AI response."}` };
          return copy;
        }
        return [...prev, { sender: "bot", text: `**Error:** ${errMsg || "Failed to fetch AI response."}` }];
      });
    } finally {
      setIsLoading(false);
      setIsTranslating(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.8, originX: 1, originY: 1 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.8 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="mb-4 w-80 sm:w-96 h-[520px] flex flex-col rounded-3xl border border-slate-200/70 dark:border-white/[0.1] bg-white/70 dark:bg-gradient-to-b dark:from-white/[0.05] dark:to-[#04060A]/90 backdrop-blur-3xl shadow-[0_8px_32px_0_rgba(0,0,0,0.1)] dark:shadow-[0_8px_32px_0_rgba(0,0,0,0.5)] overflow-hidden"
          >
            {/* Chat Header */}
            <div className="p-4 border-b border-slate-200/70 dark:border-white/[0.08] flex items-center justify-between bg-white/40 dark:bg-white/[0.02] shadow-[inset_0_1px_1px_rgba(255,255,255,0.4)] dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)] relative">
              <div className="flex items-center gap-3 relative z-10">
                <div className="p-2 rounded-full bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400">
                  <Bot className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
                    Prahari AI <Sparkles className="w-3 h-3 text-blue-500" />
                  </h3>
                  <div className="flex items-center gap-1.5 text-[10px] text-amber-500 font-semibold tracking-wider">
                    <img src="/catalyst.svg" alt="Catalyst" className="w-3 h-3 inline" />
                    <img src="/zoho-logo-darkbg.svg" alt="Zoho" className="h-2.5 inline opacity-90" />
                    <span>NVIDIA AI &amp; Zoho Catalyst (Quick ML)</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Language Toggle */}
                <motion.button
                  id="chatbot-language-toggle"
                  onClick={toggleLanguage}
                  whileTap={{ scale: 0.92 }}
                  title={language === "en" ? "Switch to Kannada (ಕನ್ನಡ)" : "Switch to English"}
                  className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-bold border transition-all duration-200 ${
                    language === "kn"
                      ? "bg-orange-500/10 border-orange-400/40 text-orange-500 dark:text-orange-400 shadow-[0_0_8px_rgba(249,115,22,0.2)]"
                      : "bg-slate-100 dark:bg-white/[0.06] border-slate-200 dark:border-white/[0.08] text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/[0.10]"
                  }`}
                >
                  <Languages className="w-3 h-3" />
                  <span>{lang.flag} {lang.label}</span>
                </motion.button>

                <button
                  onClick={() => setIsOpen(false)}
                  className="p-2 rounded-full hover:bg-slate-200/50 dark:hover:bg-white/[0.1] text-slate-500 dark:text-slate-400 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Kannada Mode Badge */}
            <AnimatePresence>
              {language === "kn" && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="flex items-center justify-center gap-2 py-1.5 text-[10px] font-semibold text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-500/10 border-b border-orange-100 dark:border-orange-500/20">
                    <span>🇮🇳</span>
                    <span>ಕನ್ನಡ ಮೋಡ್ ಸಕ್ರಿಯ — Zoho Catalyst Zia ಅನುವಾದ ಬಳಸುತ್ತಿದೆ</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Chat Messages Area */}
            <div className="flex-1 p-4 overflow-y-auto flex flex-col gap-4">
              {chat.map((msg, idx) => (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  key={idx}
                  className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div className={`max-w-[80%] p-3 rounded-2xl text-sm shadow-sm ${
                    msg.sender === "user"
                      ? "bg-blue-600 text-white rounded-br-sm"
                      : "bg-white/80 dark:bg-white/[0.05] border border-slate-200 dark:border-white/[0.05] text-slate-700 dark:text-slate-200 rounded-bl-sm dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]"
                  }`}>
                    {msg.sender === "bot" ? (
                      <>
                        <ThinkingBlock thinking={msg.thinking} isStreaming={isLoading && !msg.text} />
                        {msg.text ? (
                          <>
                            <div className="prose prose-sm dark:prose-invert max-w-none prose-table:border-collapse prose-th:border prose-th:border-slate-300 dark:prose-th:border-white/20 prose-th:p-1.5 prose-td:border prose-td:border-slate-200 dark:prose-td:border-white/10 prose-td:p-1.5">
                              <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.text}</ReactMarkdown>
                            </div>
                            {/* Show translating indicator on the last bot message */}
                            {isTranslating && idx === chat.length - 1 && (
                              <div className="mt-2 flex items-center gap-1.5 text-orange-500 dark:text-orange-400">
                                <Loader2 className="w-3 h-3 animate-spin" />
                                <span className="text-[10px] font-medium">{lang.translating}</span>
                              </div>
                            )}
                          </>
                        ) : (
                          <div className="flex items-center gap-2 text-slate-400 py-1">
                            <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                            <span className="text-xs">{lang.analyzing}</span>
                          </div>
                        )}
                      </>
                    ) : (
                      msg.text
                    )}
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Input Area */}
            <div className="p-4 border-t border-slate-200/70 dark:border-white/[0.08] bg-white/40 dark:bg-white/[0.02]">
              <form onSubmit={handleSend} className="relative flex items-center">
                <input
                  id="chatbot-message-input"
                  type="text"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={lang.placeholder}
                  className="w-full pl-4 pr-12 py-3 rounded-xl bg-slate-100/50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.05] text-slate-900 dark:text-white placeholder:text-slate-400 outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all text-sm dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]"
                />
                <button
                  id="chatbot-send-button"
                  type="submit"
                  disabled={!message.trim() || isLoading}
                  className="absolute right-2 p-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:hover:bg-blue-600 text-white transition-colors"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
              {/* Powered by label */}
              {language === "kn" && (
                <p className="mt-1.5 text-center text-[9px] text-slate-400 dark:text-white/30 tracking-wide">
                  ✦ Powered by Zoho Catalyst Zia Text Translation
                </p>
              )}
            </div>

          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Action Button */}
      <motion.button
        id="chatbot-toggle-button"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white shadow-[0_0_20px_rgba(37,99,235,0.4)] border border-blue-400/50 dark:border-white/[0.2] hover:shadow-[0_0_30px_rgba(37,99,235,0.6)] transition-shadow relative"
      >
        {isOpen ? <X className="w-6 h-6" /> : <MessageSquare className="w-6 h-6" />}
        {!isOpen && (
          <span className="absolute top-0 right-0 w-3.5 h-3.5 bg-red-500 border-2 border-white dark:border-[#070B14] rounded-full shadow-sm" />
        )}
      </motion.button>

    </div>
  );
}

export default Chatbot;