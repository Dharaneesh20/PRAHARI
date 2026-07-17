import { motion } from "framer-motion";
import { navigation } from "../../data/navigation";
import { useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { useAppContext } from "../../context/AppContext";
import { clearToken } from "../../lib/api";

export default function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, refreshProfile, setProfile, t } = useAppContext();

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
        className="p-5 flex items-center gap-3 relative z-10"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}
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
          <h1 className="text-base font-bold text-white tracking-wide leading-none">
            Prahari AI
          </h1>
          <p className="text-[10px] uppercase font-bold tracking-widest mt-1"
            style={{ color: "rgba(201,162,39,0.8)" }}>
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
                  onClick={() => navigate(item.path)}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl relative z-10 transition-all duration-200 group"
                  style={{
                    color: isActive ? "#fff" : "rgba(255,255,255,0.45)",
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.85)";
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.45)";
                  }}
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
                  <span
                    className="text-sm font-medium tracking-wide"
                    style={{ fontWeight: isActive ? 600 : 400 }}
                  >
                    {t(item.labelKey || item.name)}
                  </span>

                  {/* Active left accent bar */}
                  {isActive && (
                    <motion.div
                      layoutId="active-nav-bar"
                      className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r-full"
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
        <div
          className="glass-specular p-4 rounded-2xl cursor-pointer group relative overflow-hidden"
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.09)",
            transition: "background 0.2s",
          }}
          onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.07)")}
          onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.04)")}
        >
          <div className="flex items-center gap-3 relative z-10">
            {/* Avatar with animated gradient ring */}
            <div className="relative">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm text-white"
                style={{
                  background: "linear-gradient(135deg, #1B2A4A 0%, #3F5C86 100%)",
                  boxShadow: "0 0 0 2px rgba(201,162,39,0.5), 0 0 12px rgba(201,162,39,0.25)",
                  animation: "gradientRing 4s ease infinite",
                }}
              >
                {initials}
              </div>
              {/* Breathing green status dot */}
              <div
                className="absolute bottom-0 right-0 w-3 h-3 rounded-full border-2"
                style={{
                  background: "#2E9E6C",
                  borderColor: "rgba(15,20,40,0.9)",
                  animation: "statusBreath 2.5s ease-in-out infinite",
                }}
              />
            </div>

            <div>
              <p className="text-sm font-semibold text-white leading-none">{profile?.name || t("loadingProfile")}</p>
              <p className="text-[10px] mt-1 flex items-center gap-1.5"
                style={{ color: "rgba(255,255,255,0.45)" }}>
                <span
                  className="w-1.5 h-1.5 rounded-full inline-block"
                  style={{ background: "#2E9E6C", animation: "breathePulse 2s ease-in-out infinite" }}
                />
                {profile?.station || "Karnataka Police"} · On Duty
              </p>
            </div>
          </div>
          <button
            onClick={logout}
            className="mt-3 w-full rounded-xl px-3 py-2 text-xs font-bold transition-all hover:bg-white/10"
            style={{ color: "rgba(255,255,255,0.7)", border: "1px solid rgba(255,255,255,0.08)" }}
          >
            {t("logout")}
          </button>
        </div>
      </div>
    </aside>
  );
}
