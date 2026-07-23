import { motion } from "framer-motion";
import { navigation } from "../../data/navigation";
import { useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { useAppContext } from "../../context/AppContext";
import { clearToken } from "../../lib/api";
import { useTour } from "../../context/TourContext";

export default function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, refreshProfile, setProfile, t, language } = useAppContext();
  const { startTour } = useTour();

  useEffect(() => {
    refreshProfile().catch(() => {});
  }, [refreshProfile]);

  const clearanceLevel = profile?.clearance_level ?? 1;
  const filteredNav = navigation.filter(item => (item.level || 1) <= clearanceLevel);
  const initials = profile?.name.split(" ").map((part: string) => part[0]).join("").slice(0, 2) || "--";
  const logout = () => {
    clearToken();
    setProfile(null);
    navigate("/login", { replace: true });
  };

  return (
    <aside
      className="glass-specular h-full w-full flex flex-col relative overflow-hidden"
      style={{
        borderRadius: 20,
        backdropFilter: "blur(24px) saturate(160%)",
        WebkitBackdropFilter: "blur(24px) saturate(160%)",
        background: "var(--glass-bg-dark)",
        border: "1px solid var(--glass-border-dark)",
        boxShadow: "var(--glass-shadow-dark)",
      }}
    >
      {/* Light mode overrides via CSS classes applied on <html> */}
      <style>{`
        .light aside {
          background: var(--glass-bg-light) !important;
          border-color: var(--glass-border-light) !important;
          box-shadow: var(--glass-shadow-light) !important;
        }
      `}</style>

      {/* ── Brand Header ──────────────────────────────── */}
      <div
        className="p-5 flex items-center gap-3 relative z-10 border-b border-slate-200/80 dark:border-white/10"
      >
        <motion.div
          animate={{ scale: [1, 1.04, 1] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
          className="w-10 h-10 rounded-xl flex items-center justify-center p-1.5 relative overflow-hidden"
          style={{
            background: "linear-gradient(135deg, rgba(201,162,39,0.2) 0%, rgba(63,92,134,0.3) 100%)",
            border: "1px solid rgba(201,162,39,0.35)",
            boxShadow: "0 0 16px rgba(201,162,39,0.2)",
          }}
        >
          <img
            src="/image_9a4dc1.png"
            alt="Prahari AI Logo"
            className="w-full h-full object-contain relative z-10"
          />
        </motion.div>
        <div>
          <h1 className="text-base font-bold text-slate-900 dark:text-white tracking-wide leading-none">
            Prahari AI
          </h1>
          <p className="text-[10px] uppercase font-bold tracking-widest mt-1 text-amber-600 dark:text-amber-400">
            {t("commandCenter")}
          </p>
        </div>
      </div>

      {/* ── Navigation ────────────────────────────────── */}
      <nav className="flex-1 px-3 py-5 overflow-y-auto scrollbar-hide relative z-10">
        <ul className="space-y-1">
          {filteredNav.map((item, index) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;

            return (
              <motion.li
                key={item.name}
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 + 0.1, type: "spring", stiffness: 260, damping: 22 }}
                className="relative"
              >
                {/* Spring-animated active pill */}
                {isActive && (
                  <motion.div
                    layoutId="active-nav-pill"
                    className="absolute inset-0 rounded-xl"
                    transition={{ type: "spring", stiffness: 340, damping: 28 }}
                    style={{
                      background: "linear-gradient(135deg, rgba(201,162,39,0.18) 0%, rgba(63,92,134,0.15) 100%)",
                      border: "1px solid rgba(201,162,39,0.35)",
                      boxShadow: "0 2px 12px rgba(201,162,39,0.12)",
                    }}
                  />
                )}

                <button
                  id={item.path === "/bot" ? "tour-sidebar-bot" : item.path === "/map" ? "tour-sidebar-map" : undefined}
                  onClick={() => navigate(item.path)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl relative z-10 transition-all duration-200 group ${
                    isActive
                      ? "text-slate-950 dark:text-white font-semibold"
                      : "text-slate-600 dark:text-white/50 hover:text-slate-900 dark:hover:text-white/80"
                  }`}
                >
                  <motion.div
                    whileHover={{ scale: 1.15 }}
                    transition={{ type: "spring", stiffness: 400, damping: 18 }}
                  >
                    <Icon
                      className="w-5 h-5 transition-colors duration-200"
                      style={{ color: isActive ? "#C9A227" : "inherit" }}
                    />
                  </motion.div>
                  <span className="text-sm tracking-wide">
                    {t(item.labelKey || item.name)}
                  </span>

                  {/* Active left accent bar */}
                  {isActive && (
                    <motion.div
                      layoutId="active-nav-bar"
                      className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-0 rounded-r-full"
                      style={{ background: "#C9A227" }}
                    />
                  )}
                </button>
              </motion.li>
            );
          })}
        </ul>
      </nav>

      {/* ── Profile Card ──────────────────────────────── */}
      <div className="p-3 relative z-10">
        <div className="p-4 rounded-2xl bg-slate-100/80 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 transition-all">
          <div className="flex items-center gap-3 relative z-10">
            {/* Avatar with animated gradient ring */}
            <div className="relative">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm text-white"
                style={{
                  background: "linear-gradient(135deg, #1B2A4A 0%, #3F5C86 100%)",
                  boxShadow: "0 0 0 2px rgba(201,162,39,0.5), 0 0 12px rgba(201,162,39,0.25)",
                }}
              >
                {initials}
              </div>
              <div
                className="absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white dark:border-slate-900 bg-emerald-500"
              />
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{profile?.name || t("loadingProfile")}</p>
              <p className="text-[10px] mt-1 flex items-center gap-1.5 text-slate-500 dark:text-white/45 truncate">
                <span className="w-1.5 h-1.5 rounded-full inline-block bg-emerald-500 shrink-0" />
                {profile?.station || "Karnataka Police"}
              </p>
            </div>
          </div>
          <div className="flex gap-2 mt-3">
            <button
              onClick={() => startTour()}
              className="flex-1 rounded-xl px-2 py-2 text-xs font-bold transition-all bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/20 hover:border-amber-500/40"
            >
              {language === "kn" ? "ಸಹಾಯ ಪ್ರವಾಸ" : "System Tour"}
            </button>
            <button
              onClick={logout}
              className="flex-1 rounded-xl px-2 py-2 text-xs font-bold transition-all bg-slate-200/70 dark:bg-white/10 text-slate-800 dark:text-white/80 hover:bg-slate-300 dark:hover:bg-white/20 border border-slate-300/80 dark:border-white/10"
            >
              {t("logout")}
            </button>
          </div>
        </div>
      </div>

      {/* ── Deployed on Zoho Catalyst Badge Card ───────────────────── */}
      <div className="px-3 pb-3 relative z-10">
        <div className="p-3 rounded-2xl border border-slate-200/80 dark:border-white/10 bg-slate-100/90 dark:bg-black/40 backdrop-blur-md flex flex-col gap-2 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 dark:text-white/40">
              Deployed On
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-amber-500/10 text-amber-600 dark:text-amber-400 font-semibold border border-amber-500/20">
              Zia Slate & AppSail
            </span>
          </div>
          <div className="flex items-center gap-2 pt-1 border-t border-slate-200/60 dark:border-white/10">
            <img src="/catalyst.svg" alt="Catalyst" className="w-5 h-5 shrink-0" />
            <span className="text-xs font-bold text-slate-800 dark:text-amber-400 flex-1">
              App Sail Compute
            </span>
            <img src="/zoho-logo-web.svg" alt="Zoho" className="h-3.5 dark:hidden opacity-90 shrink-0" />
            <img src="/zoho-logo-darkbg.svg" alt="Zoho" className="h-3.5 hidden dark:block opacity-90 shrink-0" />
          </div>
        </div>
      </div>
    </aside>
  );
}
