import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Bell, Sun, Moon, Monitor, Menu } from "lucide-react";
import { useTheme } from "../theme-provider";

export default function Navbar({ onMenuClick }: { onMenuClick?: () => void }) {
  const { theme, setTheme } = useTheme();
  const [isThemeOpen, setIsThemeOpen] = useState(false);

  return (
    <header className="h-16 border-b border-neutral-200 dark:border-neutral-800/50 bg-white/70 dark:bg-black/70 backdrop-blur-2xl flex items-center justify-between px-4 sm:px-6 z-30 relative transition-colors duration-500">
      
      <div className="flex items-center gap-3 w-full sm:w-auto">
        {/* Mobile Hamburger Button */}
        <button 
          onClick={onMenuClick} 
          className="md:hidden p-2 text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white rounded-lg bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Animated Search Bar (Hidden on very small screens) */}
        <div className="relative group hidden sm:block w-64 md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 group-focus-within:text-black dark:group-focus-within:text-white transition-colors" />
          <input
            type="text"
            placeholder="Search incidents, zones, or officers..."
            className="w-full rounded-xl bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 px-10 py-2 text-sm outline-none focus:border-neutral-400 dark:focus:border-neutral-600 transition-all text-black dark:text-white placeholder:text-neutral-500"
          />
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-4 shrink-0">
        
        {/* Theme Toggle */}
        <div className="relative">
          <button
            onClick={() => setIsThemeOpen(!isThemeOpen)}
            className="p-2 rounded-xl bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-all text-neutral-600 dark:text-neutral-300"
          >
            {theme === "light" && <Sun className="w-4 h-4" />}
            {theme === "dark" && <Moon className="w-4 h-4" />}
            {theme === "system" && <Monitor className="w-4 h-4" />}
          </button>

          <AnimatePresence>
            {isThemeOpen && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 mt-2 w-36 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xl overflow-hidden py-1 z-50"
              >
                <button onClick={() => { setTheme("light"); setIsThemeOpen(false); }} className="w-full px-3 py-2 text-left text-sm flex items-center gap-3 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors">
                  <Sun className="w-4 h-4" /> Light
                </button>
                <button onClick={() => { setTheme("dark"); setIsThemeOpen(false); }} className="w-full px-3 py-2 text-left text-sm flex items-center gap-3 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors">
                  <Moon className="w-4 h-4" /> Dark
                </button>
                <button onClick={() => { setTheme("system"); setIsThemeOpen(false); }} className="w-full px-3 py-2 text-left text-sm flex items-center gap-3 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors">
                  <Monitor className="w-4 h-4" /> System
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Notification Bell */}
        <button className="relative p-2 rounded-xl bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-all text-neutral-600 dark:text-neutral-300 hidden sm:block">
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white dark:border-black"></span>
        </button>

        <div className="w-px h-6 bg-neutral-300 dark:bg-neutral-800 mx-1 hidden sm:block"></div>

        {/* Mini Profile */}
        <button className="flex items-center gap-3 hover:opacity-80 transition-opacity">
          <div className="text-right hidden md:block">
            <p className="text-sm font-bold text-black dark:text-white leading-none">8:27 PM</p>
            <p className="text-[10px] text-neutral-500 mt-1 uppercase font-bold tracking-wider">Vellore, IN</p>
          </div>
          <div className="w-9 h-9 rounded-full bg-neutral-200 dark:bg-neutral-800 flex items-center justify-center border border-neutral-300 dark:border-neutral-700 shadow-sm">
            <span className="text-xs font-bold text-black dark:text-white">IR</span>
          </div>
        </button>

      </div>
    </header>
  );
}