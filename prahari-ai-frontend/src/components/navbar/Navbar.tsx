import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Search, Bell, Sun, Moon, Monitor, Menu, HelpCircle } from "lucide-react";
import { useTheme } from "../theme-provider";
import { useNavigate } from "react-router-dom";
import { auth, notifications } from "../../lib/api";
import type { NotificationItem } from "../../lib/types";
import { useAppContext } from "../../context/AppContext";
import { useTour } from "../../context/TourContext";

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
  const { profile, setProfile, t, language, setLanguage } = useAppContext();
  const { startTour } = useTour();
  const navigate = useNavigate();
  const [notifCount, setNotifCount] = useState(0);
  const pillRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    Promise.all([auth.session(), notifications.unreadCount()])
      .then(([user, unread]) => {
        setProfile(user);
        setNotifCount(unread.count);
      })
      .catch(() => {});
  }, [setProfile]);

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
            }}
          />
          <input
            type="text"
            placeholder={language === "kn" ? "ಘಟನೆಗಳು, ವಲಯಗಳು, ಅಧಿಕಾರಿಗಳನ್ನು ಹುಡುಕಿ..." : "Search incidents, zones, officers..."}
            className="w-full rounded-xl px-10 py-2 text-sm outline-none transition-all text-white placeholder:text-white/25"
            style={{
              background: "rgba(255,255,255,0.055)",
              border: "1px solid rgba(255,255,255,0.09)",
            }}
          />
        </div>
      </div>

      {/* ── Right: Clock, Language Switcher, Theme Pill, Bell ──────────── */}
      <div className="flex items-center gap-2.5 shrink-0">
        {/* Top Kannada / English Language Switcher Button */}
        <div className="flex items-center gap-0.5 bg-black/40 border border-white/10 rounded-xl p-0.5 text-xs shadow-sm">
          <button
            type="button"
            onClick={() => setLanguage("en")}
            className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition ${
              language === "en"
                ? "bg-[#C9A227] text-black shadow-md"
                : "text-white/60 hover:text-white"
            }`}
          >
            🇬🇧 EN
          </button>
          <button
            type="button"
            onClick={() => setLanguage("kn")}
            className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition ${
              language === "kn"
                ? "bg-[#C9A227] text-black shadow-md"
                : "text-white/60 hover:text-white"
            }`}
          >
            🇮🇳 ಕನ್ನಡ KN
          </button>
        </div>

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
              <button
                key={value}
                onClick={() => handleThemeChange(value)}
                title={label}
                className="relative p-1.5 rounded-full transition-all duration-200"
                style={{ color: isActive ? "#C9A227" : "rgba(255,255,255,0.4)" }}
              >
                <Icon className="w-3.5 h-3.5 relative z-10" />
              </button>
            );
          })}
        </div>

        {/* ── Help / Tour Button ── */}
        <button
          onClick={startTour}
          title={language === "kn" ? "ಸಿಸ್ಟಮ್ ಪ್ರವಾಸವನ್ನು ಪ್ರಾರಂಭಿಸಿ" : "Start System Tour"}
          className="p-1.5 rounded-xl transition-all duration-200 border border-amber-500/20 bg-amber-500/5 hover:bg-amber-500/15 text-[#C9A227]"
        >
          <HelpCircle className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}
