import { createContext, useContext, useState, type ReactNode } from "react";
import type { DateRange } from "../components/DateRangePicker";

interface AppContextType {
  dateRange: DateRange;
  setDateRange: (r: DateRange) => void;
  selectedZone: string | null;
  setSelectedZone: (z: string | null) => void;
  liveIncidentBadge: number;
  setLiveIncidentBadge: (n: number) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [dateRange, setDateRange] = useState<DateRange>("7d");
  const [selectedZone, setSelectedZone] = useState<string | null>(null);
  const [liveIncidentBadge, setLiveIncidentBadge] = useState(3);

  return (
    <AppContext.Provider value={{
      dateRange, setDateRange,
      selectedZone, setSelectedZone,
      liveIncidentBadge, setLiveIncidentBadge,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export const useAppContext = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useAppContext must be used within AppProvider");
  return ctx;
};
