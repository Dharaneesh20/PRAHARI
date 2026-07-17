import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { DateRange } from "../components/DateRangePicker";
import { auth, getToken, settings } from "../lib/api";
import type { AppPreferences, UserProfile } from "../lib/types";

interface AppContextType {
  dateRange: DateRange;
  setDateRange: (r: DateRange) => void;
  selectedZone: string | null;
  setSelectedZone: (z: string | null) => void;
  liveIncidentBadge: number;
  setLiveIncidentBadge: (n: number) => void;
  profile: UserProfile | null;
  setProfile: (profile: UserProfile | null) => void;
  refreshProfile: () => Promise<UserProfile | null>;
  language: "en" | "kn";
  setLanguage: (language: "en" | "kn") => Promise<void>;
  t: (key: string) => string;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const translations: Record<"en" | "kn", Record<string, string>> = {
  en: {
    settings: "Settings",
    profile: "Profile",
    preferences: "Preferences",
    notifications: "Notifications",
    security: "Security",
    audit: "Privacy & Audit",
    language: "Language",
    changeDetails: "Change Details",
    saveChanges: "Save Changes",
    saved: "Saved!",
    fullName: "Full Name",
    username: "Username",
    email: "Email",
    phone: "Phone",
    bio: "Bio",
    password: "Password",
    deleteAccount: "Delete Account",
    logout: "Logout",
    noNotifications: "No notifications",
    markRead: "Mark read",
    navBot: "PRAHARI AI Bot",
    navDashboard: "KPI Dashboard",
    navCrimeMap: "Crime Map",
    navIncidents: "Live Incidents",
    navAnalytics: "Analytics",
    navReports: "Reports",
    navAdmin: "Admin Panel",
    commandCenter: "Command Center",
    onDuty: "On Duty",
    loadingProfile: "Loading profile",
    notificationCenter: "Notification Center",
    openNotifications: "Open notifications",
  },
  kn: {
    settings: "ಸೆಟ್ಟಿಂಗ್‌ಗಳು",
    profile: "ಪ್ರೊಫೈಲ್",
    preferences: "ಆದ್ಯತೆಗಳು",
    notifications: "ಅಧಿಸೂಚನೆಗಳು",
    security: "ಭದ್ರತೆ",
    audit: "ಗೌಪ್ಯತೆ ಮತ್ತು ಆಡಿಟ್",
    language: "ಭಾಷೆ",
    changeDetails: "ವಿವರಗಳನ್ನು ಬದಲಿಸಿ",
    saveChanges: "ಬದಲಾವಣೆಗಳನ್ನು ಉಳಿಸಿ",
    saved: "ಉಳಿಸಲಾಗಿದೆ!",
    fullName: "ಪೂರ್ಣ ಹೆಸರು",
    username: "ಬಳಕೆದಾರ ಹೆಸರು",
    email: "ಇಮೇಲ್",
    phone: "ದೂರವಾಣಿ",
    bio: "ಪರಿಚಯ",
    password: "ಪಾಸ್‌ವರ್ಡ್",
    deleteAccount: "ಖಾತೆ ಅಳಿಸಿ",
    logout: "ಲಾಗ್ ಔಟ್",
    noNotifications: "ಅಧಿಸೂಚನೆಗಳಿಲ್ಲ",
    markRead: "ಓದಿದಂತೆ ಗುರುತಿಸಿ",
  },
};

Object.assign(translations.kn, {
  navBot: "ಪ್ರಹರಿ AI ಬಾಟ್",
  navDashboard: "KPI ಡ್ಯಾಶ್ಬೋರ್ಡ್",
  navCrimeMap: "ಅಪರಾಧ ನಕ್ಷೆ",
  navIncidents: "ಲೈವ್ ಘಟನೆಗಳು",
  navAnalytics: "ವಿಶ್ಲೇಷಣೆ",
  navReports: "ವರದಿಗಳು",
  navAdmin: "ನಿರ್ವಹಣೆ ಫಲಕ",
  commandCenter: "ಕಮಾಂಡ್ ಸೆಂಟರ್",
  onDuty: "ಕರ್ತವ್ಯದಲ್ಲಿದ್ದಾರೆ",
  loadingProfile: "ಪ್ರೊಫೈಲ್ ಲೋಡ್ ಆಗುತ್ತಿದೆ",
  notificationCenter: "ಅಧಿಸೂಚನೆ ಕೇಂದ್ರ",
  openNotifications: "ಅಧಿಸೂಚನೆಗಳನ್ನು ತೆರೆಯಿರಿ",
});

export function AppProvider({ children }: { children: ReactNode }) {
  const [dateRange, setDateRange] = useState<DateRange>("7d");
  const [selectedZone, setSelectedZone] = useState<string | null>(null);
  const [liveIncidentBadge, setLiveIncidentBadge] = useState(0);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [languageState, setLanguageState] = useState<"en" | "kn">(() => {
    const stored = localStorage.getItem("prahari-language");
    return stored === "kn" ? "kn" : "en";
  });

  const refreshProfile = useCallback(async () => {
    if (!getToken()) {
      setProfile(null);
      return null;
    }
    const user = await auth.session();
    setProfile(user);
    return user;
  }, []);

  useEffect(() => {
    refreshProfile().catch(() => setProfile(null));
    if (getToken()) {
      settings.get()
        .then(saved => {
          if (saved.preferences.language === "kn" || saved.preferences.language === "en") {
            setLanguageState(saved.preferences.language);
            localStorage.setItem("prahari-language", saved.preferences.language);
          }
        })
        .catch(() => {});
    }
  }, [refreshProfile]);

  const setLanguage = useCallback(async (language: "en" | "kn") => {
    setLanguageState(language);
    localStorage.setItem("prahari-language", language);
    if (getToken()) {
      const existing = await settings.get();
      const preferences: AppPreferences = { ...existing.preferences, language };
      await settings.update({ preferences });
    }
  }, []);

  const value = useMemo(() => ({
    dateRange, setDateRange,
    selectedZone, setSelectedZone,
    liveIncidentBadge, setLiveIncidentBadge,
    profile, setProfile,
    refreshProfile,
    language: languageState,
    setLanguage,
    t: (key: string) => translations[languageState][key] || key,
  }), [dateRange, languageState, liveIncidentBadge, profile, refreshProfile, selectedZone, setLanguage]);

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
}

export const useAppContext = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useAppContext must be used within AppProvider");
  return ctx;
};
