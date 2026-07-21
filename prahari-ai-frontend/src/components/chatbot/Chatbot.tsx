import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageSquare, X, Send, Bot, Sparkles, Loader2, Brain, ChevronDown, ChevronRight } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { apiFetch, ml } from "../../lib/api";

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

function Chatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [chat, setChat] = useState<{ sender: "user" | "bot"; text: string; thinking?: string }[]>([
    { sender: "bot", text: "Prahari AI operational. How can I assist you with crime data analytics today?" }
  ]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || isLoading) return;
    
    setChat((prev) => [...prev, { sender: "user", text: message }]);
    const currentMessage = message;
    setMessage("");
    setIsLoading(true);

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
        (token) => {
          accum += token;
          setChat((prev) => {
            const copy = [...prev];
            if (copy[botIdx]) {
              copy[botIdx] = { ...copy[botIdx], text: accum };
            }
            return copy;
          });
        },
        undefined,
        (err) => {
          setChat((prev) => {
            const copy = [...prev];
            if (copy[botIdx]) {
              copy[botIdx] = { ...copy[botIdx], text: `**Error:** ${err}` };
            }
            return copy;
          });
        },
        (thinkingToken) => {
          accumThinking += thinkingToken;
          setChat((prev) => {
            const copy = [...prev];
            if (copy[botIdx]) {
              copy[botIdx] = { ...copy[botIdx], thinking: accumThinking };
            }
            return copy;
          });
        }
      );
    } catch (error: any) {
      const errMsg = typeof error === "string"
        ? error
        : (error?.message || (typeof error?.detail === "string" ? error.detail : JSON.stringify(error)));
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
            className="mb-4 w-80 sm:w-96 h-[500px] flex flex-col rounded-3xl border border-slate-200/70 dark:border-white/[0.1] bg-white/70 dark:bg-gradient-to-b dark:from-white/[0.05] dark:to-[#04060A]/90 backdrop-blur-3xl shadow-[0_8px_32px_0_rgba(0,0,0,0.1)] dark:shadow-[0_8px_32px_0_rgba(0,0,0,0.5)] overflow-hidden"
          >
            {/* Chat Header (Liquid Glass Edge) */}
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
                    <span>NVIDIA AI & Zoho Catalyst (Quick ML)</span>
                  </div>
                </div>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="p-2 rounded-full hover:bg-slate-200/50 dark:hover:bg-white/[0.1] text-slate-500 dark:text-slate-400 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

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
                          </>
                        ) : (
                          <div className="flex items-center gap-2 text-slate-400 py-1">
                            <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                            <span className="text-xs">Analyzing...</span>
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
                  type="text"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Ask Prahari AI..."
                  className="w-full pl-4 pr-12 py-3 rounded-xl bg-slate-100/50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.05] text-slate-900 dark:text-white placeholder:text-slate-400 outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all text-sm dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]"
                />
                <button 
                  type="submit"
                  disabled={!message.trim()}
                  className="absolute right-2 p-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:hover:bg-blue-600 text-white transition-colors"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
            
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Action Button */}
      <motion.button
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