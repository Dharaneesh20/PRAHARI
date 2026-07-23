import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, Check, Copy, Cpu, Globe, Lock, LogOut, Settings as SettingsIcon, Shield, Trash2, User, X } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTheme } from "../components/theme-provider";
import GlassCard, { glassPanelStyle } from "../components/GlassCard";
import { clearToken, notifications as notificationsApi, settings as settingsApi } from "../lib/api";
import type { AppPreferences, AuditEntry, NotificationItem, NotificationPreferences, UserProfile } from "../lib/types";
import { useAppContext } from "../context/AppContext";
import { mockNotifications } from "../data/mockData";

type Section = "profile" | "preferences" | "providers" | "notifications" | "security" | "audit" | "language";

const sectionConfig: { id: Section; labelKey: string; icon: typeof User }[] = [
  { id: "profile", labelKey: "profile", icon: User },
  { id: "preferences", labelKey: "preferences", icon: SettingsIcon },
  { id: "providers", labelKey: "AI Providers", icon: Cpu },
  { id: "notifications", labelKey: "notifications", icon: Bell },
  { id: "security", labelKey: "security", icon: Shield },
  { id: "audit", labelKey: "audit", icon: Lock },
  { id: "language", labelKey: "language", icon: Globe },
];

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <div className="flex items-center justify-between py-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
      <span className="text-sm" style={{ color: "rgba(255,255,255,0.72)" }}>{label}</span>
      <button onClick={() => onChange(!checked)} className="w-11 h-6 rounded-full relative transition-all" style={{ background: checked ? "#C9A227" : "rgba(255,255,255,0.12)" }}>
        <motion.div className="absolute top-1 w-4 h-4 rounded-full bg-white shadow" animate={{ left: checked ? 26 : 4 }} transition={{ type: "spring", stiffness: 400, damping: 28 }} />
      </button>
    </div>
  );
}

function Field({ label, value, onChange, type = "text", rows }: { label: string; value: string; onChange: (value: string) => void; type?: string; rows?: number }) {
  const baseClass = "px-3 py-2.5 rounded-xl text-sm outline-none text-white transition-all bg-white/5 border border-white/10";
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.4)" }}>{label}</span>
      {rows ? (
        <textarea rows={rows} value={value} onChange={e => onChange(e.target.value)} className={baseClass} />
      ) : (
        <input type={type} value={value} onChange={e => onChange(e.target.value)} className={baseClass} />
      )}
    </label>
  );
}

export default function Settings() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { theme, setTheme } = useTheme();
  const { profile, setProfile, refreshProfile, language, setLanguage, t } = useAppContext();
  const [section, setSection] = useState<Section>((searchParams.get("section") as Section) || "profile");
  const [draft, setDraft] = useState<UserProfile | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [prefs, setPrefs] = useState<AppPreferences>({ density: "comfortable", reduceMotion: false, soundAlerts: true, language, syncFilters: false });
  const [notifPrefs, setNotifPrefs] = useState<NotificationPreferences>({
    newIncident: true, assignedCase: true, reportReady: true, systemAlerts: true,
    channels: { inApp: true, email: true, sms: false },
  });
  const [notificationItems, setNotificationItems] = useState<NotificationItem[]>([]);
  const [auditLog, setAuditLog] = useState<AuditEntry[]>([]);
  const [auditSearch, setAuditSearch] = useState("");
  const [passwordForm, setPasswordForm] = useState({ current: "", next: "", confirm: "" });
  const [deletePassword, setDeletePassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([refreshProfile(), settingsApi.auditLog(), settingsApi.get(), notificationsApi.list()])
      .then(([user, audit, savedSettings, savedNotifications]) => {
        if (user) setDraft(user);
        setAuditLog(audit);
        setPrefs(savedSettings.preferences);
        setNotifPrefs(savedSettings.notificationPreferences);
        setNotificationItems(savedNotifications);
      })
      .catch(err => {
        setNotificationItems(mockNotifications);
        setError(err instanceof Error ? err.message : "Failed to load settings.");
      })
      .finally(() => setLoading(false));
  }, [refreshProfile]);

  useEffect(() => {
    const requested = searchParams.get("section") as Section | null;
    if (requested && sectionConfig.some(item => item.id === requested)) {
      setSection(requested);
    }
  }, [searchParams]);

  const flash = (text: string) => {
    setMessage(text);
    setError("");
    window.setTimeout(() => setMessage(""), 2400);
  };

  const persistPreferences = async (next: AppPreferences) => {
    setPrefs(next);
    const saved = await settingsApi.update({ preferences: next });
    setPrefs(saved.preferences);
    if (saved.preferences.language !== language) await setLanguage(saved.preferences.language);
    flash(t("saved"));
  };

  const persistNotificationPreferences = async (next: NotificationPreferences) => {
    setNotifPrefs(next);
    const saved = await settingsApi.update({ notificationPreferences: next });
    setNotifPrefs(saved.notificationPreferences);
    flash(t("saved"));
  };

  const saveProfile = async () => {
    if (!draft) return;
    try {
      const saved = await settingsApi.updateProfile({
        name: draft.name,
        username: draft.username,
        email: draft.email,
        phone: draft.phone,
        bio: draft.bio,
        avatar: draft.avatar,
      });
      setProfile(saved.profile);
      setDraft(saved.profile);
      setIsDetailsOpen(false);
      flash(t("saved"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Profile update failed.");
    }
  };

  const changePassword = async () => {
    if (passwordForm.next !== passwordForm.confirm) {
      setError("New password and confirmation do not match.");
      return;
    }
    try {
      await settingsApi.changePassword(passwordForm.current, passwordForm.next);
      setPasswordForm({ current: "", next: "", confirm: "" });
      flash("Password updated.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Password update failed.");
    }
  };

  const deleteAccount = async () => {
    if (!window.confirm("Delete this account permanently?")) return;
    try {
      await settingsApi.deleteAccount(deletePassword);
      clearToken();
      setProfile(null);
      navigate("/login", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete account failed.");
    }
  };

  const logout = () => {
    clearToken();
    setProfile(null);
    navigate("/login", { replace: true });
  };

  const markNotificationRead = async (id: string) => {
    try {
      const updated = await notificationsApi.markRead(id);
      setNotificationItems(items => items.map(item => item.id === id ? updated : item));
    } catch {
      setNotificationItems(items => items.map(item => item.id === id ? { ...item, read: true } : item));
    }
  };

  const filteredAudit = auditLog.filter(entry =>
    entry.action.toLowerCase().includes(auditSearch.toLowerCase()) ||
    entry.resource.toLowerCase().includes(auditSearch.toLowerCase())
  );

  if (loading) return <div className="flex h-full items-center justify-center text-white/50">Loading settings...</div>;

  return (
    <div className="flex flex-col md:flex-row h-full overflow-hidden">
      <div className="w-full md:w-56 shrink-0 flex flex-row md:flex-col overflow-x-auto md:overflow-y-auto border-b md:border-b-0 md:border-r py-3 md:py-4 px-2 md:px-0 gap-1 md:gap-0 scrollbar-hide" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
        <p className="px-4 mb-3 text-[10px] font-bold uppercase tracking-widest hidden md:block text-white/30">{t("settings")}</p>
        {sectionConfig.map(item => {
          const Icon = item.icon;
          const active = section === item.id;
          return (
            <div key={item.id} className="relative mx-1 md:mx-2 shrink-0">
              {active && <motion.div layoutId="settings-active" className="absolute inset-0 rounded-xl" transition={{ type: "spring", stiffness: 380, damping: 28 }} style={{ background: "rgba(201,162,39,0.12)", border: "1px solid rgba(201,162,39,0.3)" }} />}
              <button onClick={() => setSection(item.id)} className="relative z-10 flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap" style={{ color: active ? "#C9A227" : "rgba(255,255,255,0.5)" }}>
                <Icon className="w-4 h-4 shrink-0" />
                {item.id === "providers" ? "AI Providers" : t(item.labelKey)}
              </button>
            </div>
          );
        })}
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-hide p-4 md:p-6">
        {(message || error) && (
          <div className="mb-4 rounded-xl px-4 py-3 text-sm" style={{ background: error ? "rgba(209,67,67,0.16)" : "rgba(46,158,108,0.16)", color: error ? "#ff9b9b" : "#76d69d", border: `1px solid ${error ? "rgba(209,67,67,0.35)" : "rgba(46,158,108,0.35)"}` }}>
            {error || message}
          </div>
        )}

        <AnimatePresence mode="wait">
          {section === "profile" && profile && (
            <motion.div key="profile" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex flex-col gap-5 max-w-xl">
              <h2 className="text-lg font-bold text-white/90">{t("profile")}</h2>
              <GlassCard>
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-xl font-bold text-white shrink-0 overflow-hidden" style={{ background: "linear-gradient(135deg, #1B2A4A 0%, #3F5C86 100%)", boxShadow: "0 0 0 2px rgba(201,162,39,0.5)" }}>
                    {profile.avatar ? <img src={profile.avatar} alt="" className="h-full w-full object-cover" /> : profile.name.split(" ").map((part: string) => part[0]).join("").slice(0, 2)}
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-white/90">{profile.name}</p>
                    <p className="text-sm text-white/45">{profile.rank} - {profile.station}</p>
                    <p className="text-xs text-white/35">{profile.username || profile.badgeId}</p>
                  </div>
                </div>
              </GlassCard>
              <GlassCard title="Personal Information">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-white/75">
                  <p><span className="text-white/35">{t("email")}:</span> {profile.email || "-"}</p>
                  <p><span className="text-white/35">{t("phone")}:</span> {profile.phone || "-"}</p>
                  <p className="sm:col-span-2"><span className="text-white/35">{t("bio")}:</span> {profile.bio || "-"}</p>
                </div>
              </GlassCard>
              <button onClick={() => { setDraft(profile); setIsDetailsOpen(true); }} className="w-full max-w-xs py-3 rounded-xl font-bold text-sm text-black flex items-center justify-center gap-2" style={{ background: "linear-gradient(135deg, #C9A227 0%, #e8b92e 100%)" }}>
                {t("changeDetails")}
              </button>
              <button onClick={logout} className="w-full max-w-xs py-3 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2 bg-white/10">
                <LogOut className="w-4 h-4" />{t("logout")}
              </button>
            </motion.div>
          )}

          {section === "preferences" && (
            <motion.div key="preferences" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex flex-col gap-5 max-w-xl">
              <h2 className="text-lg font-bold text-white/90">{t("preferences")}</h2>
              <GlassCard title="Theme">
                <div className="flex gap-2">
                  {(["light", "system", "dark"] as const).map(item => (
                    <button key={item} onClick={() => setTheme(item)} className="flex-1 py-2.5 rounded-xl text-sm font-semibold capitalize transition-all" style={theme === item ? { background: "rgba(201,162,39,0.18)", color: "#C9A227", border: "1px solid rgba(201,162,39,0.4)" } : { background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.45)", border: "1px solid rgba(255,255,255,0.09)" }}>
                      {item}
                    </button>
                  ))}
                </div>
              </GlassCard>
              <GlassCard title="Display & Accessibility">
                <Toggle checked={prefs.reduceMotion} onChange={v => persistPreferences({ ...prefs, reduceMotion: v })} label="Reduce Motion" />
                <Toggle checked={prefs.soundAlerts} onChange={v => persistPreferences({ ...prefs, soundAlerts: v })} label="Sound Alerts" />
                <Toggle checked={prefs.syncFilters} onChange={v => persistPreferences({ ...prefs, syncFilters: v })} label="Sync date-range filter" />
              </GlassCard>
            </motion.div>
          )}

          {section === "notifications" && (
            <motion.div key="notifications" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex flex-col gap-5 max-w-xl">
              <h2 className="text-lg font-bold text-white/90">{t("notifications")}</h2>
              <GlassCard title={t("notificationCenter")}>
                <div className="flex flex-col">
                  {notificationItems.length === 0 ? (
                    <div className="py-4 text-sm text-white/45">{t("noNotifications")}</div>
                  ) : notificationItems.map(item => (
                    <div key={item.id} className="flex items-start gap-3 py-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                      <span className="mt-1 h-2 w-2 rounded-full shrink-0" style={{ background: item.read ? "rgba(255,255,255,0.18)" : "#C9A227" }} />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-white/85">{item.title}</p>
                        <p className="mt-1 text-xs text-white/50">{item.message}</p>
                        <p className="mt-1 text-[10px] uppercase tracking-widest text-white/25">{new Date(item.createdAt).toLocaleString("en-IN")}</p>
                      </div>
                      {!item.read && (
                        <button onClick={() => markNotificationRead(item.id)} className="rounded-lg px-2 py-1 text-[10px] font-bold" style={{ color: "#C9A227", border: "1px solid rgba(201,162,39,0.35)" }}>
                          {t("markRead")}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </GlassCard>
              <GlassCard title="Alert Categories">
                <Toggle checked={notifPrefs.newIncident} onChange={v => persistNotificationPreferences({ ...notifPrefs, newIncident: v })} label="New Incident Reported" />
                <Toggle checked={notifPrefs.assignedCase} onChange={v => persistNotificationPreferences({ ...notifPrefs, assignedCase: v })} label="Case Assigned to You" />
                <Toggle checked={notifPrefs.reportReady} onChange={v => persistNotificationPreferences({ ...notifPrefs, reportReady: v })} label="Report Ready for Review" />
                <Toggle checked={notifPrefs.systemAlerts} onChange={v => persistNotificationPreferences({ ...notifPrefs, systemAlerts: v })} label="System Alerts" />
              </GlassCard>
              <GlassCard title="Delivery Channels">
                <Toggle checked={notifPrefs.channels.inApp} onChange={v => persistNotificationPreferences({ ...notifPrefs, channels: { ...notifPrefs.channels, inApp: v } })} label="In-App Notifications" />
                <Toggle checked={notifPrefs.channels.email} onChange={v => persistNotificationPreferences({ ...notifPrefs, channels: { ...notifPrefs.channels, email: v } })} label="Email" />
                <Toggle checked={notifPrefs.channels.sms} onChange={v => persistNotificationPreferences({ ...notifPrefs, channels: { ...notifPrefs.channels, sms: v } })} label="SMS" />
              </GlassCard>
            </motion.div>
          )}

          {section === "security" && (
            <motion.div key="security" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex flex-col gap-5 max-w-xl">
              <h2 className="text-lg font-bold text-white/90">{t("security")}</h2>
              <GlassCard title="Change Password">
                <div className="flex flex-col gap-3">
                  <Field label="Current Password" type="password" value={passwordForm.current} onChange={value => setPasswordForm(p => ({ ...p, current: value }))} />
                  <Field label="New Password" type="password" value={passwordForm.next} onChange={value => setPasswordForm(p => ({ ...p, next: value }))} />
                  <Field label="Confirm New Password" type="password" value={passwordForm.confirm} onChange={value => setPasswordForm(p => ({ ...p, confirm: value }))} />
                  <button onClick={changePassword} className="py-2.5 rounded-xl font-bold text-sm text-black mt-1" style={{ background: "linear-gradient(135deg, #C9A227 0%, #e8b92e 100%)" }}>Update Password</button>
                </div>
              </GlassCard>
              <GlassCard title="Account">
                <div className="flex flex-col gap-3">
                  <button onClick={logout} className="flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-sm bg-white/10 text-white"><LogOut className="w-4 h-4" />{t("logout")}</button>
                  <Field label="Password required to delete" type="password" value={deletePassword} onChange={setDeletePassword} />
                  <button onClick={deleteAccount} className="flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-sm" style={{ background: "rgba(209,67,67,0.16)", color: "#ff9b9b", border: "1px solid rgba(209,67,67,0.35)" }}><Trash2 className="w-4 h-4" />{t("deleteAccount")}</button>
                </div>
              </GlassCard>
            </motion.div>
          )}

          {section === "audit" && (
            <motion.div key="audit" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex flex-col gap-5">
              <h2 className="text-lg font-bold text-white/90">{t("audit")}</h2>
              <input value={auditSearch} onChange={e => setAuditSearch(e.target.value)} className="w-full pl-4 pr-4 py-2.5 rounded-xl text-sm outline-none text-white bg-white/5 border border-white/10" />
              <div className="rounded-2xl overflow-hidden" style={{ ...glassPanelStyle }}>
                <table className="w-full text-xs">
                  <thead><tr>{["Timestamp", "Action", "Resource", "Hash"].map(h => <th key={h} className="px-4 py-3 text-left font-bold uppercase tracking-widest text-white/30">{h}</th>)}</tr></thead>
                  <tbody>{filteredAudit.map(entry => (
                    <tr key={entry.id} style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                      <td className="px-4 py-3 font-mono text-white/40">{new Date(entry.timestamp).toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" })}</td>
                      <td className="px-4 py-3 text-white/75">{entry.action}</td>
                      <td className="px-4 py-3 font-semibold" style={{ color: "#C9A227" }}>{entry.resource}</td>
                      <td className="px-4 py-3"><button onClick={() => navigator.clipboard?.writeText(entry.hash)} className="flex items-center gap-1.5 font-mono text-white/35"><span>{entry.hash.slice(0, 14)}...</span><Copy className="w-3 h-3" /></button></td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            </motion.div>
          )}

          {section === "providers" && (
            <motion.div key="providers" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex flex-col gap-5 max-w-xl">
              <h2 className="text-lg font-bold text-white/90">AI Providers</h2>
              
              <GlassCard title="NVIDIA AI Hosted APIs">
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-white/40 uppercase font-bold tracking-wider">Status</span>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      Connected
                    </span>
                  </div>
                  <div>
                    <p className="text-xs text-white/40 uppercase font-bold tracking-wider mb-2">Purpose & Capabilities</p>
                    <div className="flex flex-wrap gap-2">
                      {["Speech Recognition", "Voice Synthesis", "Translation", "LLM Inference"].map(p => (
                        <span key={p} className="px-2.5 py-1 rounded-lg text-xs font-mono bg-white/5 border border-white/10 text-amber-300">
                          {p}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </GlassCard>

              <GlassCard title={
                <div className="flex items-center gap-2">
                  <img src="/catalyst.svg" alt="Catalyst" className="w-5 h-5 inline" />
                  <img src="/zoho-logo-darkbg.svg" alt="Zoho" className="h-3.5 inline opacity-90" />
                  <span>Zia & Catalyst Services (Zia Slate & AppSail)</span>
                </div>
              }>
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-white/40 uppercase font-bold tracking-wider">Status</span>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      Connected
                    </span>
                  </div>
                  <div>
                    <p className="text-xs text-white/40 uppercase font-bold tracking-wider mb-2">Purpose & Microservices</p>
                    <div className="flex flex-wrap gap-2">
                      {["Zia Voice (QuickML TTS & STT)", "Zia OCR Engine", "Vision AI", "Text Analytics", "Image Moderation", "Identity Scanner", "Barcode Scanner"].map(p => (
                        <span key={p} className="px-2.5 py-1 rounded-lg text-xs font-mono bg-white/5 border border-white/10 text-amber-300">
                          {p}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </GlassCard>
            </motion.div>
          )}

          {section === "language" && (
            <motion.div key="language" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex flex-col gap-5 max-w-xl">
              <h2 className="text-lg font-bold text-white/90">{t("language")}</h2>
              <GlassCard title="Interface Language">
                <div className="flex gap-3">
                  {[{ code: "en" as const, label: "English", native: "English" }, { code: "kn" as const, label: "Kannada", native: "ಕನ್ನಡ" }].map(item => (
                    <button key={item.code} onClick={() => persistPreferences({ ...prefs, language: item.code })} className="flex-1 py-4 rounded-xl flex flex-col items-center gap-2 font-semibold transition-all" style={prefs.language === item.code ? { background: "rgba(201,162,39,0.18)", border: "1px solid rgba(201,162,39,0.4)", color: "#C9A227" } : { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.09)", color: "rgba(255,255,255,0.5)" }}>
                      <span className="text-2xl">{item.native}</span>
                      <span className="text-sm">{item.label}</span>
                      {prefs.language === item.code && <Check className="w-4 h-4" />}
                    </button>
                  ))}
                </div>
              </GlassCard>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {isDetailsOpen && draft && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-2xl p-5" style={{ ...glassPanelStyle, background: "rgba(10,14,26,0.98)" }}>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">{t("changeDetails")}</h3>
              <button onClick={() => setIsDetailsOpen(false)} className="rounded-xl p-2 text-white/50 hover:bg-white/10"><X className="h-5 w-5" /></button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label={t("fullName")} value={draft.name || ""} onChange={value => setDraft(p => p ? { ...p, name: value } : p)} />
              <Field label={t("username")} value={draft.username || ""} onChange={value => setDraft(p => p ? { ...p, username: value } : p)} />
              <Field label={t("email")} type="email" value={draft.email || ""} onChange={value => setDraft(p => p ? { ...p, email: value } : p)} />
              <Field label={t("phone")} type="tel" value={draft.phone || ""} onChange={value => setDraft(p => p ? { ...p, phone: value } : p)} />
              <Field label="Avatar URL" value={draft.avatar || ""} onChange={value => setDraft(p => p ? { ...p, avatar: value } : p)} />
              <div />
              <div className="sm:col-span-2"><Field label={t("bio")} rows={4} value={draft.bio || ""} onChange={value => setDraft(p => p ? { ...p, bio: value } : p)} /></div>
            </div>
            <button onClick={saveProfile} className="mt-5 w-full py-3 rounded-xl font-bold text-sm text-black" style={{ background: "linear-gradient(135deg, #C9A227 0%, #e8b92e 100%)" }}>{t("saveChanges")}</button>
          </div>
        </div>
      )}
    </div>
  );
}
