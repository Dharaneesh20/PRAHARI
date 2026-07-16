import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { User, Settings as SettingsIcon, Bell, Shield, Lock, Globe, Check, LogOut, Copy } from "lucide-react";
import { useTheme } from "../components/theme-provider";
import GlassCard, { glassPanelStyle } from "../components/GlassCard";
import { auth as authApi, settings as settingsApi } from "../lib/api";
import type { UserProfile, AuditEntry } from "../lib/types";

type Section = "profile" | "preferences" | "notifications" | "security" | "audit" | "language";
const SECTIONS: { id: Section; label: string; icon: typeof User }[] = [
  { id: "profile",       label: "Profile",          icon: User },
  { id: "preferences",  label: "Preferences",       icon: SettingsIcon },
  { id: "notifications",label: "Notifications",     icon: Bell },
  { id: "security",     label: "Security",           icon: Shield },
  { id: "audit",        label: "Privacy & Audit",   icon: Lock },
  { id: "language",     label: "Language",           icon: Globe },
];

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <div className="flex items-center justify-between py-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
      <span className="text-sm" style={{ color: "rgba(255,255,255,0.72)" }}>{label}</span>
      <button onClick={() => onChange(!checked)} className="w-11 h-6 rounded-full relative transition-all"
        style={{ background: checked ? "#C9A227" : "rgba(255,255,255,0.12)" }}>
        <motion.div className="absolute top-1 w-4 h-4 rounded-full bg-white shadow"
          animate={{ left: checked ? 26 : 4 }}
          transition={{ type: "spring", stiffness: 400, damping: 28 }}
        />
      </button>
    </div>
  );
}

function FormField({ label, value, type = "text", disabled = false }: { label: string; value: string; type?: string; disabled?: boolean }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.4)" }}>{label}</label>
      <input
        type={type} defaultValue={value} disabled={disabled}
        className="px-3 py-2.5 rounded-xl text-sm outline-none text-white transition-all"
        style={{
          background: disabled ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.055)",
          border: "1px solid rgba(255,255,255,0.09)",
          color: disabled ? "rgba(255,255,255,0.4)" : "rgba(255,255,255,0.85)",
        }}
        onFocus={e => { e.currentTarget.style.borderColor = "rgba(201,162,39,0.5)"; }}
        onBlur={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.09)"; }}
      />
    </div>
  );
}

export default function Settings() {
  const [section, setSection] = useState<Section>("profile");
  const [prefs, setPrefs] = useState({
    density: "comfortable" as "comfortable" | "compact",
    reduceMotion: false,
    soundAlerts: true,
    language: "en" as "en" | "kn",
    syncFilters: false,
  });
  const [notifPrefs, setNotifPrefs] = useState({
    newIncident: true, assignedCase: true, reportReady: true, systemAlerts: true,
    channels: { inApp: true, email: true, sms: false },
  });
  const [saved, setSaved] = useState(false);
  const [auditSearch, setAuditSearch] = useState("");
  const { theme, setTheme } = useTheme();
  
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [auditLog, setAuditLog] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      authApi.session(),
      settingsApi.auditLog(),
    ]).then(([profile, audit]) => {
      setUserProfile(profile);
      setAuditLog(audit);
    }).catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    if (!userProfile) return;
    try {
      await settingsApi.updateProfile(userProfile.email, userProfile.phone);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) { console.error("Profile save failed", err); }
  };

  const filteredAudit = auditLog.filter(e =>
    e.action.toLowerCase().includes(auditSearch.toLowerCase()) ||
    e.resource.toLowerCase().includes(auditSearch.toLowerCase())
  );

  if (loading && !userProfile) return <div className="flex items-center justify-center h-full" style={{ color: "rgba(255,255,255,0.4)" }}><p>Loading settings...</p></div>;

  return (
    <div className="flex flex-col md:flex-row h-full overflow-hidden">

      {/* ── Left Sub-nav ─────────────────────────────────────── */}
      <div 
        className="w-full md:w-56 shrink-0 flex flex-row md:flex-col overflow-x-auto md:overflow-y-auto border-b md:border-b-0 md:border-r py-3 md:py-4 px-2 md:px-0 gap-1 md:gap-0 scrollbar-hide" 
        style={{ borderColor: "rgba(255,255,255,0.07)" }}
      >
        <p className="px-4 mb-3 text-[10px] font-bold uppercase tracking-widest hidden md:block" style={{ color: "rgba(255,255,255,0.3)" }}>Settings</p>
        {SECTIONS.map(s => {
          const Icon = s.icon;
          const active = section === s.id;
          return (
            <div key={s.id} className="relative mx-1 md:mx-2 shrink-0">
              {active && <motion.div layoutId="settings-active" className="absolute inset-0 rounded-xl" transition={{ type: "spring", stiffness: 380, damping: 28 }} style={{ background: "rgba(201,162,39,0.12)", border: "1px solid rgba(201,162,39,0.3)" }} />}
              <button onClick={() => setSection(s.id)} className="relative z-10 flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap" style={{ color: active ? "#C9A227" : "rgba(255,255,255,0.5)" }}>
                <Icon className="w-4 h-4 shrink-0" />
                {s.label}
              </button>
            </div>
          );
        })}
      </div>

      {/* ── Right Content ─────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto scrollbar-hide p-4 md:p-6">
        <AnimatePresence mode="wait">
          {/* Profile */}
          {section === "profile" && (
            <motion.div key="profile" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex flex-col gap-5 max-w-xl">
              <h2 className="text-lg font-bold" style={{ color: "rgba(255,255,255,0.92)" }}>Profile</h2>
              {/* Avatar */}
              <GlassCard>
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-xl font-bold text-white shrink-0"
                    style={{ background: "linear-gradient(135deg, #1B2A4A 0%, #3F5C86 100%)", boxShadow: "0 0 0 2px rgba(201,162,39,0.5)" }}>
                    {userProfile?.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                  </div>
                  <div>
                    <p className="font-bold" style={{ color: "rgba(255,255,255,0.9)" }}>{userProfile?.name}</p>
                    <p className="text-sm" style={{ color: "rgba(255,255,255,0.45)" }}>{userProfile?.rank} · {userProfile?.station}</p>
                    <button className="mt-1.5 text-xs font-semibold" style={{ color: "#C9A227" }}>Change Photo</button>
                  </div>
                </div>
              </GlassCard>
              <GlassCard title="Personal Information">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.4)" }}>Full Name</label>
                    <input type="text" value={userProfile?.name} disabled className="px-3 py-2.5 rounded-xl text-sm outline-none text-white transition-all bg-white/5 border border-white/10" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.4)" }}>Badge ID</label>
                    <input type="text" value={userProfile?.badgeId} disabled className="px-3 py-2.5 rounded-xl text-sm outline-none text-white transition-all bg-white/5 border border-white/10" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.4)" }}>Rank</label>
                    <input type="text" value={userProfile?.rank} disabled className="px-3 py-2.5 rounded-xl text-sm outline-none text-white transition-all bg-white/5 border border-white/10" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.4)" }}>Station</label>
                    <input type="text" value={userProfile?.station} disabled className="px-3 py-2.5 rounded-xl text-sm outline-none text-white transition-all bg-white/5 border border-white/10" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.4)" }}>Email</label>
                    <input type="email" value={userProfile?.email} onChange={e => setUserProfile(p => p ? { ...p, email: e.target.value } : null)} className="px-3 py-2.5 rounded-xl text-sm outline-none text-white transition-all bg-white/5 border border-white/10" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.4)" }}>Phone</label>
                    <input type="tel" value={userProfile?.phone} onChange={e => setUserProfile(p => p ? { ...p, phone: e.target.value } : null)} className="px-3 py-2.5 rounded-xl text-sm outline-none text-white transition-all bg-white/5 border border-white/10" />
                  </div>
                </div>
              </GlassCard>
              <button onClick={handleSave} className="w-full max-w-xs py-3 rounded-xl font-bold text-sm text-black flex items-center justify-center gap-2"
                style={{ background: "linear-gradient(135deg, #C9A227 0%, #e8b92e 100%)" }}>
                {saved ? <><Check className="w-4 h-4" /> Saved!</> : "Save Changes"}
              </button>
            </motion.div>
          )}

          {/* Preferences */}
          {section === "preferences" && (
            <motion.div key="preferences" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex flex-col gap-5 max-w-xl">
              <h2 className="text-lg font-bold" style={{ color: "rgba(255,255,255,0.92)" }}>Preferences</h2>
              <GlassCard title="Theme">
                <div className="flex gap-2">
                  {(["light", "system", "dark"] as const).map(t => (
                    <button key={t} onClick={() => setTheme(t)}
                      className="flex-1 py-2.5 rounded-xl text-sm font-semibold capitalize transition-all"
                      style={theme === t
                        ? { background: "rgba(201,162,39,0.18)", color: "#C9A227", border: "1px solid rgba(201,162,39,0.4)" }
                        : { background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.45)", border: "1px solid rgba(255,255,255,0.09)" }}>
                      {t}
                    </button>
                  ))}
                </div>
              </GlassCard>
              <GlassCard title="Display & Accessibility">
                <Toggle checked={prefs.reduceMotion} onChange={v => setPrefs(p => ({ ...p, reduceMotion: v }))} label="Reduce Motion" />
                <Toggle checked={prefs.soundAlerts} onChange={v => setPrefs(p => ({ ...p, soundAlerts: v }))} label="Sound Alerts (Live Incidents)" />
                <Toggle checked={prefs.syncFilters} onChange={v => setPrefs(p => ({ ...p, syncFilters: v }))} label="Sync date-range filter across all pages" />
              </GlassCard>
            </motion.div>
          )}

          {/* Notifications */}
          {section === "notifications" && (
            <motion.div key="notifications" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex flex-col gap-5 max-w-xl">
              <h2 className="text-lg font-bold" style={{ color: "rgba(255,255,255,0.92)" }}>Notifications</h2>
              <GlassCard title="Alert Categories">
                <Toggle checked={notifPrefs.newIncident} onChange={v => setNotifPrefs(p => ({ ...p, newIncident: v }))} label="New Incident Reported" />
                <Toggle checked={notifPrefs.assignedCase} onChange={v => setNotifPrefs(p => ({ ...p, assignedCase: v }))} label="Case Assigned to You" />
                <Toggle checked={notifPrefs.reportReady} onChange={v => setNotifPrefs(p => ({ ...p, reportReady: v }))} label="Report Ready for Review" />
                <Toggle checked={notifPrefs.systemAlerts} onChange={v => setNotifPrefs(p => ({ ...p, systemAlerts: v }))} label="System Alerts" />
              </GlassCard>
              <GlassCard title="Delivery Channels">
                <Toggle checked={notifPrefs.channels.inApp} onChange={v => setNotifPrefs(p => ({ ...p, channels: { ...p.channels, inApp: v } }))} label="In-App Notifications" />
                <Toggle checked={notifPrefs.channels.email} onChange={v => setNotifPrefs(p => ({ ...p, channels: { ...p.channels, email: v } }))} label="Email (KSP secure mail)" />
                <Toggle checked={notifPrefs.channels.sms} onChange={v => setNotifPrefs(p => ({ ...p, channels: { ...p.channels, sms: v } }))} label="SMS (field officers)" />
              </GlassCard>
            </motion.div>
          )}

          {/* Security */}
          {section === "security" && (
            <motion.div key="security" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex flex-col gap-5 max-w-xl">
              <h2 className="text-lg font-bold" style={{ color: "rgba(255,255,255,0.92)" }}>Security</h2>
              <GlassCard title="Change Password">
                <div className="flex flex-col gap-3">
                  <FormField label="Current Password" value="" type="password" />
                  <FormField label="New Password" value="" type="password" />
                  <FormField label="Confirm New Password" value="" type="password" />
                  <button className="py-2.5 rounded-xl font-bold text-sm text-black mt-1"
                    style={{ background: "linear-gradient(135deg, #C9A227 0%, #e8b92e 100%)" }}>
                    Update Password
                  </button>
                </div>
              </GlassCard>
              {/* Active Sessions */}
              <GlassCard title="Active Sessions" subtitle="Manage your active logins">
                <div className="flex flex-col gap-3">
                  {[].map((s: any) => (
                    <div key={s.id} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold" style={{ color: "rgba(255,255,255,0.8)" }}>{s.device}</p>
                        <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.35)" }}>{s.location} · {s.lastActive}</p>
                      </div>
                      {s.current
                        ? <span className="text-xs font-bold px-2 py-1 rounded-lg" style={{ background: "rgba(46,158,108,0.15)", color: "#2E9E6C" }}>Current</span>
                        : <button className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: "#D14343" }}>
                            <LogOut className="w-3 h-3" /> Sign out
                          </button>
                      }
                    </div>
                  ))}
                </div>
              </GlassCard>
            </motion.div>
          )}

          {/* Audit Log */}
          {section === "audit" && (
            <motion.div key="audit" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex flex-col gap-5">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold" style={{ color: "rgba(255,255,255,0.92)" }}>Privacy & Audit Ledger</h2>
                  <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>Your personal action log — blockchain-verified, read-only</p>
                </div>
              </div>
              <div className="relative">
                <input value={auditSearch} onChange={e => setAuditSearch(e.target.value)} placeholder="Search actions..."
                  className="w-full pl-4 pr-4 py-2.5 rounded-xl text-sm outline-none text-white"
                  style={{ background: "rgba(255,255,255,0.055)", border: "1px solid rgba(255,255,255,0.09)" }} />
              </div>
              <div className="rounded-2xl overflow-hidden" style={{ ...glassPanelStyle }}>
                <table className="w-full text-xs">
                  <thead>
                    <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                      {["Timestamp", "Action", "Resource", "Hash"].map(h => (
                        <th key={h} className="px-4 py-3 text-left font-bold uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.3)" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAudit.map((e, i) => (
                      <tr key={e.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)", background: i % 2 ? "rgba(255,255,255,0.015)" : "transparent" }}>
                        <td className="px-4 py-3 font-mono whitespace-nowrap" style={{ color: "rgba(255,255,255,0.4)" }}>
                          {new Date(e.timestamp).toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" })}
                        </td>
                        <td className="px-4 py-3" style={{ color: "rgba(255,255,255,0.75)" }}>{e.action}</td>
                        <td className="px-4 py-3 font-semibold" style={{ color: "#C9A227" }}>{e.resource}</td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => navigator.clipboard?.writeText(e.hash)}
                            className="flex items-center gap-1.5 font-mono hover:text-white transition-colors"
                            style={{ color: "rgba(255,255,255,0.3)" }}
                            title="Copy hash"
                          >
                            {e.hash.slice(0, 14)}…
                            <Copy className="w-3 h-3" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}

          {/* Language */}
          {section === "language" && (
            <motion.div key="language" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex flex-col gap-5 max-w-xl">
              <h2 className="text-lg font-bold" style={{ color: "rgba(255,255,255,0.92)" }}>Language</h2>
              <GlassCard title="Interface Language">
                <p className="text-sm mb-4" style={{ color: "rgba(255,255,255,0.45)" }}>
                  Sets the language for the application interface. This is separate from the Prahari AI Bot's bilingual (English + Kannada) query understanding.
                </p>
                <div className="flex gap-3">
                  {[{ code: "en", label: "English", native: "English" }, { code: "kn", label: "Kannada", native: "ಕನ್ನಡ" }].map(lang => (
                    <button key={lang.code} onClick={() => setPrefs(p => ({ ...p, language: lang.code as "en" | "kn" }))}
                      className="flex-1 py-4 rounded-xl flex flex-col items-center gap-2 font-semibold transition-all"
                      style={prefs.language === lang.code
                        ? { background: "rgba(201,162,39,0.18)", border: "1px solid rgba(201,162,39,0.4)", color: "#C9A227" }
                        : { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.09)", color: "rgba(255,255,255,0.5)" }}>
                      <span className="text-2xl">{lang.native}</span>
                      <span className="text-sm">{lang.label}</span>
                      {prefs.language === lang.code && <Check className="w-4 h-4" />}
                    </button>
                  ))}
                </div>
              </GlassCard>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
