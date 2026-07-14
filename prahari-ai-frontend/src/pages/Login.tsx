import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, WifiOff, ShieldCheck, ArrowRight, Shield, User, Building2, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import LiquidCanvas from "../components/LiquidCanvas";

type LoginState = "idle" | "loading" | "error" | "success";
type Role = "Investigator" | "Station Admin" | "Citizen Portal";

const ROLES: { value: Role; icon: typeof Shield; desc: string }[] = [
  { value: "Investigator", icon: User, desc: "Field & investigation officers" },
  { value: "Station Admin", icon: Building2, desc: "Station management & records" },
  { value: "Citizen Portal", icon: Users, desc: "Public complaint & tracking" },
];

export default function Login() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<LoginState>("idle");
  const [badgeId, setBadgeId] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("Investigator");
  const [ripples, setRipples] = useState<{ id: number; x: number; y: number }[]>([]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!badgeId || !password) return;

    setStatus("loading");
    setTimeout(() => {
      if (!window.navigator.onLine) {
        setStatus("error");
      } else {
        setStatus("success");
        setTimeout(() => navigate("/"), 1500);
      }
    }, 2800);
  };

  const handleButtonClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const id = Date.now();
    setRipples((prev) => [...prev, { id, x, y }]);
    setTimeout(() => setRipples((prev) => prev.filter((r) => r.id !== id)), 700);
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center relative overflow-hidden font-['Inter','Ubuntu',sans-serif]">

      {/* Full-bleed animated canvas */}
      <LiquidCanvas />

      <AnimatePresence mode="wait">

        {/* ── IDLE: Login Form ─────────────────────────────────── */}
        {status === "idle" && (
          <motion.div
            key="login"
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -24, scale: 0.96, filter: "blur(8px)" }}
            transition={{ type: "spring", stiffness: 260, damping: 22 }}
            className="glass-specular relative z-10 w-full max-w-md mx-4 p-8 rounded-3xl flex flex-col gap-6"
            style={{
              backdropFilter: "blur(32px) saturate(180%)",
              WebkitBackdropFilter: "blur(32px) saturate(180%)",
              background: "rgba(15, 22, 45, 0.88)",
              border: "1px solid rgba(255,255,255,0.12)",
              boxShadow: "0 24px 80px rgba(0,0,0,0.7), inset 0 1px 1px rgba(255,255,255,0.1)",
            }}
          >

            {/* Logo section */}
            <div className="flex flex-col items-center gap-5">
              <div className="flex items-center gap-4">
                <img
                  src="/image_9a5181.jpg"
                  alt="Karnataka Police Logo"
                  className="w-14 h-14 object-contain rounded-xl"
                  style={{ filter: "drop-shadow(0 0 12px rgba(201,162,39,0.3))" }}
                />
                <div className="w-px h-10" style={{ background: "rgba(255,255,255,0.12)" }} />
                <motion.div
                  animate={{ scale: [1, 1.04, 1] }}
                  transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                  style={{ filter: "drop-shadow(0 0 12px rgba(201,162,39,0.25))" }}
                >
                  <img
                    src="/image_9a4dc1.png"
                    alt="Prahari AI"
                    className="w-14 h-14 object-contain"
                  />
                </motion.div>
              </div>
              <div className="text-center">
                <h1 className="text-2xl font-bold text-white tracking-wider">PRAHARI AI</h1>
                <p className="text-xs text-white/40 font-bold uppercase tracking-widest mt-1">
                  Tactical Intelligence Platform
                </p>
              </div>
            </div>

            {/* Role selector */}
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.4)" }}>
                Access Role
              </label>
              <div
                className="grid grid-cols-3 gap-1.5 p-1 rounded-2xl"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
              >
                {ROLES.map(({ value, icon: Icon }) => (
                  <motion.button
                    key={value}
                    type="button"
                    whileTap={{ scale: 0.96 }}
                    onClick={() => setRole(value)}
                    className="flex flex-col items-center gap-1 py-2 px-1 rounded-xl transition-all duration-200 text-xs font-semibold"
                    style={
                      role === value
                        ? {
                            background: "linear-gradient(135deg, rgba(201,162,39,0.2), rgba(63,92,134,0.2))",
                            border: "1px solid rgba(201,162,39,0.4)",
                            color: "#C9A227",
                            boxShadow: "0 2px 12px rgba(201,162,39,0.15)",
                          }
                        : {
                            background: "transparent",
                            border: "1px solid transparent",
                            color: "rgba(255,255,255,0.35)",
                          }
                    }
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span className="leading-tight text-center text-[10px]">{value}</span>
                  </motion.button>
                ))}
              </div>
            </div>

            {/* Login form */}
            <form onSubmit={handleLogin} className="flex flex-col gap-4">
              {/* Badge ID */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.4)" }}>
                  Officer Badge ID
                </label>
                <input
                  type="text"
                  value={badgeId}
                  onChange={(e) => setBadgeId(e.target.value)}
                  placeholder="e.g. KSP-8921"
                  className="w-full px-4 py-3 rounded-xl outline-none text-sm font-medium text-white placeholder:text-white/25 transition-all"
                  style={{
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    boxShadow: "inset 0 2px 4px rgba(0,0,0,0.3)",
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = "rgba(201,162,39,0.55)";
                    e.currentTarget.style.boxShadow = "inset 0 2px 4px rgba(0,0,0,0.3), 0 0 0 2px rgba(201,162,39,0.12)";
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)";
                    e.currentTarget.style.boxShadow = "inset 0 2px 4px rgba(0,0,0,0.3)";
                  }}
                />
              </div>

              {/* Secure Access Code */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.4)" }}>
                  Secure Access Code
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 rounded-xl outline-none text-sm font-medium text-white placeholder:text-white/25 transition-all"
                  style={{
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    boxShadow: "inset 0 2px 4px rgba(0,0,0,0.3)",
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = "rgba(201,162,39,0.55)";
                    e.currentTarget.style.boxShadow = "inset 0 2px 4px rgba(0,0,0,0.3), 0 0 0 2px rgba(201,162,39,0.12)";
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)";
                    e.currentTarget.style.boxShadow = "inset 0 2px 4px rgba(0,0,0,0.3)";
                  }}
                />
              </div>

              {/* Auth button with ripple */}
              <motion.button
                type="submit"
                disabled={!badgeId || !password}
                whileHover={{ scale: 1.02, brightness: 1.1 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleButtonClick}
                className="mt-2 w-full py-3.5 rounded-2xl font-bold text-sm text-black flex items-center justify-center gap-2 relative overflow-hidden disabled:opacity-30"
                style={{
                  background: "linear-gradient(135deg, #C9A227 0%, #e8b92e 60%, #b8901f 100%)",
                  boxShadow: "0 4px 24px rgba(201,162,39,0.45)",
                }}
              >
                {/* Ripple effects */}
                {ripples.map(({ id, x, y }) => (
                  <span
                    key={id}
                    className="absolute rounded-full pointer-events-none"
                    style={{
                      left: x,
                      top: y,
                      width: 8,
                      height: 8,
                      marginLeft: -4,
                      marginTop: -4,
                      background: "rgba(255,255,255,0.5)",
                      animation: "rippleOut 0.65s ease-out forwards",
                    }}
                  />
                ))}
                Authenticate <ArrowRight className="w-4 h-4" />
              </motion.button>
            </form>

            {/* Security note */}
            <div
              className="flex items-center gap-2 py-3 px-4 rounded-xl"
              style={{
                background: "rgba(46,158,108,0.08)",
                border: "1px solid rgba(46,158,108,0.2)",
              }}
            >
              <ShieldCheck className="w-4 h-4 shrink-0" style={{ color: "#2E9E6C" }} />
              <p className="text-[11px] leading-snug" style={{ color: "rgba(255,255,255,0.45)" }}>
                All connections are encrypted via TLS 1.3. Audit-logged on the KSP blockchain ledger.
              </p>
            </div>
          </motion.div>
        )}

        {/* ── LOADING ──────────────────────────────────────────── */}
        {status === "loading" && (
          <motion.div
            key="loading"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            transition={{ duration: 0.4 }}
            className="relative z-10 flex flex-col items-center text-center w-full max-w-2xl px-6"
          >
            <motion.img
              animate={{ scale: [1, 1.06, 1] }}
              transition={{ repeat: Infinity, duration: 2 }}
              src="/image_9a4dc1.png"
              alt="Prahari AI"
              className="w-24 h-24 object-contain mb-8"
              style={{ filter: "drop-shadow(0 0 24px rgba(201,162,39,0.5))" }}
            />
            <h2 className="text-4xl font-bold mb-4 tracking-widest text-white">PRAHARI</h2>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="flex flex-wrap justify-center gap-x-2 text-sm text-white/40 font-medium tracking-wide mb-12"
            >
              <span><strong className="text-white">P</strong>redictive</span> •{" "}
              <span><strong className="text-white">R</strong>isk</span> •{" "}
              <span><strong className="text-white">A</strong>nalysis &</span> •{" "}
              <span><strong className="text-white">H</strong>otspot</span> •{" "}
              <span><strong className="text-white">A</strong>lert</span> •{" "}
              <span><strong className="text-white">R</strong>outing</span> •{" "}
              <span><strong className="text-white">I</strong>ntelligence</span>
            </motion.div>
            <div className="flex items-center gap-3 text-white/50">
              <Loader2 className="w-5 h-5 animate-spin" style={{ color: "#C9A227" }} />
              <span className="font-mono text-sm uppercase tracking-wider">
                Establishing secure connection to KSP Servers…
              </span>
            </div>
          </motion.div>
        )}

        {/* ── ERROR ────────────────────────────────────────────── */}
        {status === "error" && (
          <motion.div
            key="error"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0, x: [0, -8, 8, -6, 6, -3, 3, 0] }}
            transition={{ duration: 0.5, x: { duration: 0.45, type: "spring", stiffness: 500, damping: 20 } }}
            className="relative z-10 flex flex-col items-center text-center p-8 rounded-3xl max-w-sm mx-4"
            style={{
              background: "rgba(209,67,67,0.1)",
              border: "1px solid rgba(209,67,67,0.35)",
              backdropFilter: "blur(24px)",
            }}
          >
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center mb-6"
              style={{ background: "rgba(209,67,67,0.15)", border: "1px solid rgba(209,67,67,0.3)" }}
            >
              <WifiOff className="w-8 h-8" style={{ color: "#D14343" }} />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Connection Terminated</h2>
            <p className="text-white/50 mb-8 max-w-xs text-sm leading-relaxed">
              Error 404: Unable to reach KSP databases. Please ensure you are connected to a secure network.
            </p>
            <button
              onClick={() => setStatus("idle")}
              className="px-6 py-2.5 rounded-xl font-bold text-white transition-colors hover:bg-white/10"
              style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)" }}
            >
              Retry Connection
            </button>
          </motion.div>
        )}

        {/* ── SUCCESS ──────────────────────────────────────────── */}
        {status === "success" && (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative z-10 flex flex-col items-center text-center"
          >
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 260, damping: 18, delay: 0.1 }}
              className="w-20 h-20 rounded-full flex items-center justify-center mb-6"
              style={{
                background: "rgba(46,158,108,0.15)",
                border: "1px solid rgba(46,158,108,0.4)",
                boxShadow: "0 0 40px rgba(46,158,108,0.25)",
              }}
            >
              <ShieldCheck className="w-10 h-10" style={{ color: "#2E9E6C" }} />
            </motion.div>
            <h2 className="text-2xl font-bold text-white mb-2">Access Granted</h2>
            <p className="font-mono text-sm uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.4)" }}>
              Initializing Command Center…
            </p>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}