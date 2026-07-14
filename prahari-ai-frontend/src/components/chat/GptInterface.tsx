import { useState } from "react";
import { motion } from "framer-motion";
import { Paperclip, Image as ImageIcon, Database, ArrowUp } from "lucide-react";

const SUGGESTED_PROMPTS = [
  { title: "Analyze Hotspots", text: "Show me high-risk crime zones in Koramangala for tonight." },
  { title: "Pull Case File", text: "Fetch details for Case ID #FIR-2026-892 from the database." },
  { title: "Process OCR", text: "Extract license plate numbers from the latest CCTV footage." },
  { title: "Patrol Routing", text: "Optimize patrol routes based on current active alerts." }
];

export default function GptInterface() {
  const [message, setMessage] = useState("");
  const [chat, setChat] = useState<{ sender: "user" | "bot"; text: string }[]>([]);

  const handleSend = (e?: React.FormEvent, presetMessage?: string) => {
    e?.preventDefault();
    const textToSend = presetMessage || message;
    if (!textToSend.trim()) return;

    setChat((prev) => [...prev, { sender: "user", text: textToSend }]);
    setMessage("");

    setTimeout(() => {
      setChat((prev) => [
        ...prev,
        { sender: "bot", text: "Accessing Prahari DB... Analyzing parameters. No immediate threats detected in that sector." }
      ]);
    }, 1000);
  };

  return (
    <div className="flex flex-col h-full w-full max-w-4xl mx-auto p-4 md:p-6 relative z-10">
      
      <div className="flex-1 overflow-y-auto flex flex-col gap-6 py-4 scrollbar-hide">
        {chat.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center h-full text-center px-4"
          >
            
            {/* Animated Radar Logo */}
            <div className="relative flex items-center justify-center mb-10 mt-8">
              <motion.div 
                animate={{ rotate: 360 }} 
                transition={{ repeat: Infinity, duration: 10, ease: "linear" }} 
                className="absolute w-28 h-28 border border-dashed border-neutral-300 dark:border-neutral-700 rounded-full opacity-60" 
              />
              <motion.div 
                animate={{ rotate: -360 }} 
                transition={{ repeat: Infinity, duration: 15, ease: "linear" }} 
                className="absolute w-36 h-36 border border-neutral-200 dark:border-neutral-800 rounded-full opacity-40" 
              />
              <div className="w-16 h-16 bg-white dark:bg-black rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(0,0,0,0.1)] dark:shadow-[0_0_30px_rgba(255,255,255,0.1)] border border-neutral-200 dark:border-neutral-700 p-3 relative z-10">
                <img src="/image_9a4dc1.png" alt="Prahari AI" className="w-full h-full object-contain" />
              </div>
            </div>
            
            <h2 className="text-3xl font-bold mb-10 text-black dark:text-white tracking-wide">
              How can Prahari AI assist today?
            </h2>
            
            {/* High-Tech Grid Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-2xl">
              {SUGGESTED_PROMPTS.map((prompt, idx) => (
                <motion.button
                  whileHover={{ y: -2, scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  key={idx}
                  onClick={() => handleSend(undefined, prompt.text)}
                  className="group relative flex flex-col items-start p-5 text-left rounded-2xl bg-neutral-50 dark:bg-neutral-900/50 border border-neutral-200 dark:border-neutral-800 hover:border-black dark:hover:border-neutral-400 transition-all overflow-hidden shadow-sm"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-neutral-200/50 dark:from-white/[0.05] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <span className="font-bold text-sm text-black dark:text-white relative z-10">{prompt.title}</span>
                  <span className="text-sm text-neutral-500 dark:text-neutral-400 mt-2 line-clamp-2 relative z-10">{prompt.text}</span>
                </motion.button>
              ))}
            </div>
          </motion.div>
        ) : (
          chat.map((msg, idx) => (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              key={idx} 
              className={`flex w-full ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
            >
              {msg.sender === "bot" && (
                <div className="w-8 h-8 bg-neutral-100 dark:bg-neutral-900 rounded-full flex items-center justify-center mr-4 border border-neutral-300 dark:border-neutral-700 shrink-0 p-1.5 shadow-sm">
                  <img src="/image_9a4dc1.png" alt="AI Avatar" className="w-full h-full object-contain" />
                </div>
              )}
              <div className={`max-w-[85%] sm:max-w-[75%] px-5 py-4 text-[15px] leading-relaxed shadow-sm ${
                msg.sender === "user" 
                  ? "bg-black dark:bg-white text-white dark:text-black rounded-3xl rounded-br-sm font-medium" 
                  : "bg-white dark:bg-neutral-900/80 border border-neutral-200 dark:border-neutral-800 text-black dark:text-neutral-100 rounded-3xl rounded-bl-sm backdrop-blur-md"
              }`}>
                {msg.text}
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* Sleek Terminal Input Area */}
      <div className="w-full max-w-3xl mx-auto mt-2">
        <form 
          onSubmit={handleSend}
          className="relative flex flex-col w-full bg-white dark:bg-black rounded-3xl border border-neutral-300 dark:border-neutral-700 shadow-lg dark:shadow-[0_0_40px_rgba(255,255,255,0.03)] focus-within:border-black dark:focus-within:border-neutral-400 transition-all overflow-hidden"
        >
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend(e);
              }
            }}
            placeholder="Query databases, analyze footage, or generate reports..."
            className="w-full max-h-48 min-h-[60px] py-4 pl-5 pr-12 bg-transparent text-black dark:text-white placeholder:text-neutral-500 outline-none resize-none text-[15px] font-medium"
            rows={1}
          />
          
          <div className="flex items-center justify-between px-3 pb-3 pt-1">
            <div className="flex items-center gap-1">
              <button type="button" title="Upload Document" className="p-2.5 text-neutral-500 hover:text-black dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-900 rounded-xl transition-colors">
                <Paperclip className="w-5 h-5" />
              </button>
              <button type="button" title="Upload Image for OCR" className="p-2.5 text-neutral-500 hover:text-black dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-900 rounded-xl transition-colors">
                <ImageIcon className="w-5 h-5" />
              </button>
              <button type="button" title="Link Evidence / Case ID from DB" className="p-2.5 text-neutral-500 hover:text-black dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-900 rounded-xl transition-colors flex items-center gap-2">
                <Database className="w-5 h-5" />
                <span className="text-xs font-bold uppercase tracking-wider hidden sm:block">Link DB</span>
              </button>
            </div>

            <button 
              type="submit"
              disabled={!message.trim()}
              className="p-2.5 bg-black dark:bg-white text-white dark:text-black rounded-full disabled:opacity-20 transition-all hover:scale-105 active:scale-95"
            >
              <ArrowUp className="w-5 h-5" />
            </button>
          </div>
        </form>
        <p className="text-center text-xs font-medium text-neutral-400 mt-4 tracking-wide">
          Prahari AI can make mistakes. Verify critical case data.
        </p>
      </div>
    </div>
  );
}