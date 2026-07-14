import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Bell, Sun, Moon, Monitor, Menu, MapPin } from "lucide-react";
import { useTheme } from "../theme-provider";

type ThemeOption = "light" | "dark" | "system";

const THEME_OPTIONS: { value: ThemeOption; icon: typeof Sun; label: string }[] = [
  { value: "light", icon: Sun, label: "Light" },
  { value: "system", icon: Monitor, label: "System" },
  { value: "dark", icon: Moon, label: "Dark" },
];

function LiveClock() {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="text-right hidden md:block">
      <p className="text-sm font-bold leading-none" style={{ color: "rgba(255,255,255,0.9)" }}>
        {time.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
      </p>
      <div className="flex items-center gap-1 justify-end mt-1">
        <div className="relative w-2 h-2">
          <div
            className="absolute inset-0 rounded-full"
            style={{ background: "#2E9E6C", animation: "pinPulse 2s ease-out infinite" }}
          />
          <div className="absolute inset-0 rounded-full" style={{ background: "#2E9E6C" }} />
        </div>
        <p className="text-[10px] uppercase font-bold tracking-wider" style={{ color: "rgba(255,255,255,0.45)" }}>
          Karnataka, IN
        </p>
      </div>
    </div>
  );
}

export default function Navbar({ onMenuClick }: { onMenuClick?: () => void }) {
  const { theme, setTheme } = useTheme();
  const [notifCount] = useState(3);
  const pillRef = useRef<HTMLDivElement>(null);

  const handleThemeChange = (newTheme: ThemeOption) => {
    if (!pillRef.current) { setTheme(newTheme); return; }
    const rect = pillRef.current.getBoundingClientRect();
    setTheme(newTheme, rect.left + rect.width / 2, rect.top + rect.height / 2);
  };

  return (
    <header
      className="glass-specular h-14 flex items-center justify-between px-4 sm:px-5 z-30 relative shrink-0"
      style={{
        backdropFilter: "blur(24px) saturate(160%)",
        WebkitBackdropFilter: "blur(24px) saturate(160%)",
        background: "rgba(255,255,255,0.04)",
        borderBottom: "1px solid rgba(255,255,255,0.08)",
        boxShadow: "0 1px 0 rgba(255,255,255,0.05)",
      }}
    >
      {/* ── Left: Menu + Search ─────────────────────────────── */}
      <div className="flex items-center gap-3 flex-1">
        {/* Mobile hamburger */}
        <button
          onClick={onMenuClick}
          className="md:hidden p-2 rounded-xl transition-all hover:bg-white/10"
          style={{ color: "rgba(255,255,255,0.6)" }}
          aria-label="Open navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Search */}
        <div className="relative group hidden sm:block w-64 md:w-80">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 transition-all duration-300 group-focus-within:text-[#C9A227]"
            style={{
              color: "rgba(255,255,255,0.35)",
              animation: "searchIconPulse 3s ease-in-out infinite",
            }}
          />
          <input
            type="text"
            placeholder="Search incidents, zones, officers..."
            className="w-full rounded-xl px-10 py-2 text-sm outline-none transition-all text-white placeholder:text-white/25"
            style={{
              background: "rgba(255,255,255,0.055)",
              border: "1px solid rgba(255,255,255,0.09)",
            }}
            onFocus={(e) => {
              e.currentTarget.style.border = "1px solid rgba(201,162,39,0.5)";
              e.currentTarget.style.background = "rgba(255,255,255,0.08)";
            }}
            onBlur={(e) => {
              e.currentTarget.style.border = "1px solid rgba(255,255,255,0.09)";
              e.currentTarget.style.background = "rgba(255,255,255,0.055)";
            }}
          />
        </div>
      </div>

      {/* ── Right: Clock, Theme Pill, Bell, Avatar ──────────── */}
      <div className="flex items-center gap-3 shrink-0">
        <LiveClock />

        <div className="w-px h-5 hidden md:block" style={{ background: "rgba(255,255,255,0.1)" }} />

        {/* ── 3-way theme pill ── */}
        <div
          ref={pillRef}
          className="flex items-center gap-0.5 p-1 rounded-full"
          style={{
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.1)",
          }}
        >
          {THEME_OPTIONS.map(({ value, icon: Icon, label }) => {
            const isActive = theme === value;
            return (
              <motion.button
                key={value}
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleThemeChange(value)}
                title={label}
                aria-label={`Set theme to ${label}`}
                className="relative p-1.5 rounded-full transition-all duration-200"
                style={{ color: isActive ? "#C9A227" : "rgba(255,255,255,0.4)" }}
              >
                {/* Active glow ring */}
                {isActive && (
                  <motion.div
                    layoutId="theme-active-ring"
                    className="absolute inset-0 rounded-full"
                    transition={{ type: "spring", stiffness: 380, damping: 26 }}
                    style={{
                      background: "rgba(201,162,39,0.14)",
                      boxShadow: "0 0 8px rgba(201,162,39,0.4)",
                      border: "1px solid rgba(201,162,39,0.4)",
                    }}
                  />
                )}
                <Icon className="w-3.5 h-3.5 relative z-10" />
              </motion.button>
            );
          })}
        </div>

        {/* ── Notification bell ── */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="relative p-2 rounded-xl transition-all hidden sm:block"
          style={{
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.09)",
            color: "rgba(255,255,255,0.6)",
          }}
          aria-label="Notifications"
        >
          <Bell className="w-4 h-4" />
          {notifCount > 0 && (
            <motion.span
              className="absolute top-1 right-1 w-2 h-2 rounded-full"
              style={{
                background: "#D14343",
                boxShadow: "0 0 6px rgba(209,67,67,0.6)",
                animation: "bellPulse 3s ease-in-out infinite",
              }}
              aria-label={`${notifCount} notifications`}
            />
          )}
        </motion.button>

        <div className="w-px h-5 hidden sm:block" style={{ background: "rgba(255,255,255,0.1)" }} />

        {/* ── Profile avatar ── */}
        <motion.button
          whileHover={{ scale: 1.04 }}
          className="flex items-center gap-2.5 hover:opacity-90 transition-opacity"
          aria-label="Profile"
        >
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white"
            style={{
              background: "linear-gradient(135deg, #1B2A4A 0%, #3F5C86 100%)",
              boxShadow: "0 0 0 2px rgba(201,162,39,0.5), 0 0 10px rgba(201,162,39,0.2)",
            }}
          >
            IR
          </div>
        </motion.button>
      </div>
    </header>
  );
}