import { createContext, useContext, useState, ReactNode } from "react";

// Define the global state of the dashboard
type DashboardState = {
  alertLevel: "normal" | "warning" | "critical";
  activeRegion: string;
  activeCrimes: number;
};

type DashboardContextType = {
  state: DashboardState;
  executeAICommand: (command: string) => string; // Returns the AI's verbal response
};

const DashboardContext = createContext<DashboardContextType | undefined>(undefined);

export function DashboardProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DashboardState>({
    alertLevel: "normal",
    activeRegion: "Karnataka State",
    activeCrimes: 1254,
  });

  // The AI uses this function to manipulate the dashboard
  const executeAICommand = (prompt: string): string => {
    const input = prompt.toLowerCase();

    if (input.includes("lockdown") || input.includes("critical")) {
      setState(prev => ({ ...prev, alertLevel: "critical", activeRegion: "Bangalore South" }));
      return "Critical alert initiated. Dashboard locked to Bangalore South. Displaying high-risk zones.";
    } 
    
    if (input.includes("analyze") && input.includes("mysore")) {
      setState(prev => ({ ...prev, alertLevel: "warning", activeRegion: "Mysore" }));
      return "Analyzing Mysore sector. Elevated risk detected. Updating visual matrices.";
    }

    if (input.includes("reset") || input.includes("clear")) {
      setState({ alertLevel: "normal", activeRegion: "Karnataka State", activeCrimes: 1254 });
      return "System reset to standard monitoring mode.";
    }

    return "Query processed. No anomalous data found in current parameters.";
  };

  return (
    <DashboardContext.Provider value={{ state, executeAICommand }}>
      {children}
    </DashboardContext.Provider>
  );
}

export const useDashboard = () => {
  const context = useContext(DashboardContext);
  if (!context) throw new Error("useDashboard must be used within a DashboardProvider");
  return context;
};