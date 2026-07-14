import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, WifiOff, ShieldCheck, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom"; // <-- ADD THIS

type LoginState = "idle" | "loading" | "error" | "success";

export default function Login() {
  const navigate = useNavigate(); // <-- ADD THIS
  const [status, setStatus] = useState<LoginState>("idle");
  const [badgeId, setBadgeId] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!badgeId || !password) return;

    setStatus("loading");

    setTimeout(() => {
      if (!window.navigator.onLine) {
        setStatus("error");
      } else {
        setStatus("success");
        // Push user to the dashboard after 1.5 seconds of seeing the success checkmark
        setTimeout(() => navigate("/"), 1500); // <-- ADD THIS
      }
    }, 3000); 
  };
  
  // ... rest of the code stays exactly the same

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-white dark:bg-black text-neutral-900 dark:text-white font-['Ubuntu'] relative overflow-hidden">
      
      {/* Subtle Background Elements */}
      <div className="absolute top-0 left-1/4 w-1/2 h-1/2 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-neutral-200/40 to-transparent dark:from-neutral-900/40 dark:to-transparent opacity-50 pointer-events-none" />

      <AnimatePresence mode="wait">
        
        {/* ================= IDLE STATE (LOGIN FORM) ================= */}
        {status === "idle" && (
          <motion.div
            key="login"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20, filter: "blur(10px)" }}
            transition={{ duration: 0.4 }}
            className="w-full max-w-md p-8 flex flex-col items-center z-10"
          >
            {/* Logos */}
            <div className="flex flex-col items-center gap-6 mb-10">
              <img 
                src="/image_9a5181.jpg" 
                alt="Karnataka Police Logo" 
                className="w-24 h-24 object-contain mix-blend-multiply dark:mix-blend-screen"
              />
              <div className="w-px h-8 bg-neutral-300 dark:bg-neutral-800"></div>
              <div className="flex flex-col items-center gap-3">
                <img 
                  src="/image_9a4dc1.png" 
                  alt="Prahari AI Logo" 
                  className="w-16 h-16 object-contain"
                />
                <h1 className="text-3xl font-bold tracking-wide">PRAHARI AI</h1>
              </div>
            </div>

            {/* Login Form */}
            <form onSubmit={handleLogin} className="w-full flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-neutral-500">Officer Badge ID</label>
                <input
                  type="text"
                  value={badgeId}
                  onChange={(e) => setBadgeId(e.target.value)}
                  className="w-full px-4 py-3 bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl outline-none focus:ring-2 focus:ring-black dark:focus:ring-white transition-all"
                  placeholder="e.g. KSP-8921"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-neutral-500">Secure Access Code</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl outline-none focus:ring-2 focus:ring-black dark:focus:ring-white transition-all"
                  placeholder="••••••••"
                />
              </div>
              
              <button 
                type="submit"
                disabled={!badgeId || !password}
                className="mt-4 w-full py-3.5 bg-black dark:bg-white text-white dark:text-black font-bold rounded-xl flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-50 transition-opacity"
              >
                Authenticate <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          </motion.div>
        )}

        {/* ================= LOADING STATE (CONNECTING) ================= */}
        {status === "loading" && (
          <motion.div
            key="loading"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.1 }}
            transition={{ duration: 0.5 }}
            className="flex flex-col items-center text-center z-10 w-full max-w-2xl px-6"
          >
            <motion.img 
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ repeat: Infinity, duration: 2 }}
              src="/image_9a4dc1.png" 
              alt="Prahari AI" 
              className="w-24 h-24 object-contain mb-8"
            />
            
            <h2 className="text-4xl font-bold mb-4 tracking-widest">PRAHARI</h2>
            
            {/* Abbreviation Reveal */}
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="flex flex-wrap justify-center gap-x-2 text-sm md:text-base text-neutral-500 dark:text-neutral-400 font-medium tracking-wide mb-12"
            >
              <span><strong className="text-black dark:text-white">P</strong>redictive</span> • 
              <span><strong className="text-black dark:text-white">R</strong>isk</span> • 
              <span><strong className="text-black dark:text-white">A</strong>nalysis &</span> • 
              <span><strong className="text-black dark:text-white">H</strong>otspot</span> • 
              <span><strong className="text-black dark:text-white">A</strong>lert</span> • 
              <span><strong className="text-black dark:text-white">R</strong>outing</span> • 
              <span><strong className="text-black dark:text-white">I</strong>ntelligence</span>
            </motion.div>

            <div className="flex items-center gap-3 text-neutral-600 dark:text-neutral-300">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="font-mono text-sm uppercase tracking-wider">Establishing secure connection to KSP Servers...</span>
            </div>
          </motion.div>
        )}

        {/* ================= ERROR STATE (404 / OFFLINE) ================= */}
        {status === "error" && (
          <motion.div
            key="error"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center text-center z-10 p-8 rounded-3xl border border-red-500/20 bg-red-500/5 dark:bg-red-500/10"
          >
            <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-6">
              <WifiOff className="w-8 h-8 text-red-600 dark:text-red-500" />
            </div>
            <h2 className="text-2xl font-bold text-red-600 dark:text-red-500 mb-2">Connection Terminated</h2>
            <p className="text-neutral-600 dark:text-neutral-400 mb-8 max-w-xs">
              Error 404: Unable to reach KSP databases. Please ensure you are connected to a secure network.
            </p>
            <button 
              onClick={() => setStatus("idle")}
              className="px-6 py-2.5 bg-neutral-200 dark:bg-neutral-800 text-black dark:text-white font-bold rounded-lg hover:bg-neutral-300 dark:hover:bg-neutral-700 transition-colors"
            >
              Retry Connection
            </button>
          </motion.div>
        )}

        {/* ================= SUCCESS STATE ================= */}
        {status === "success" && (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center text-center z-10"
          >
            <div className="w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-6">
              <ShieldCheck className="w-10 h-10 text-green-600 dark:text-green-500" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Access Granted</h2>
            <p className="text-neutral-500 dark:text-neutral-400 font-mono text-sm uppercase">Initializing Command Center...</p>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}