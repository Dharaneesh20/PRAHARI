import { createContext, useContext, useEffect, useState } from "react";

type Theme = "dark" | "light" | "system";

type ThemeProviderProps = {
  children: React.ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
};

type ThemeProviderState = {
  theme: Theme;
  resolvedTheme: "dark" | "light";
  setTheme: (theme: Theme, originX?: number, originY?: number) => void;
};

const initialState: ThemeProviderState = {
  theme: "system",
  resolvedTheme: "dark",
  setTheme: () => null,
};

const ThemeProviderContext = createContext<ThemeProviderState>(initialState);

function getResolved(theme: Theme): "dark" | "light" {
  if (theme === "system") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  return theme;
}

export function ThemeProvider({
  children,
  defaultTheme = "system",
  storageKey = "prahari-ui-theme",
  ...props
}: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>(
    () => (localStorage.getItem(storageKey) as Theme) || defaultTheme
  );
  const [resolvedTheme, setResolvedTheme] = useState<"dark" | "light">(() => getResolved(
    (localStorage.getItem(storageKey) as Theme) || defaultTheme
  ));

  // Apply theme class to <html>
  useEffect(() => {
    const root = window.document.documentElement;
    const resolved = getResolved(theme);
    root.classList.remove("light", "dark");
    root.classList.add(resolved);
    setResolvedTheme(resolved);
  }, [theme]);

  // Live OS listener — fires when system theme changes while app is open
  useEffect(() => {
    if (theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => {
      const root = window.document.documentElement;
      const resolved = getResolved("system");
      root.classList.remove("light", "dark");
      root.classList.add(resolved);
      setResolvedTheme(resolved);
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [theme]);

  const setTheme = (newTheme: Theme, originX?: number, originY?: number) => {
    // Trigger radial-wipe overlay if origin coords given and motion allowed
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!prefersReduced && originX !== undefined && originY !== undefined) {
      const overlay = document.createElement("div");
      overlay.className = "radial-wipe-overlay";
      overlay.style.setProperty("--wipe-x", `${originX}px`);
      overlay.style.setProperty("--wipe-y", `${originY}px`);
      // Color the overlay with the destination theme's canvas
      const destinationDark = getResolved(newTheme) === "dark";
      overlay.style.background = destinationDark ? "#05070D" : "#F4F6FA";
      document.body.appendChild(overlay);

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          overlay.classList.add("expanding");
          setTimeout(() => {
            localStorage.setItem(storageKey, newTheme);
            setThemeState(newTheme);
            setTimeout(() => overlay.remove(), 100);
          }, 580);
        });
      });
    } else {
      localStorage.setItem(storageKey, newTheme);
      setThemeState(newTheme);
    }
  };

  return (
    <ThemeProviderContext.Provider {...props} value={{ theme, resolvedTheme, setTheme }}>
      {children}
    </ThemeProviderContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext);
  if (context === undefined)
    throw new Error("useTheme must be used within a ThemeProvider");
  return context;
};