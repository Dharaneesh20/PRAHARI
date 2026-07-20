import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Navbar from "../components/navbar/Navbar";
import Sidebar from "../components/sidebar/Sidebar";
import LiquidCanvas from "../components/LiquidCanvas";

type DashboardLayoutProps = {
  children: React.ReactNode;
};

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  return (
    <div className="flex h-screen text-black dark:text-white relative overflow-hidden font-['Inter','Ubuntu',sans-serif]">

      {/* ── Liquid Animated Background ─────────────────────────── */}
      <LiquidCanvas />

      {/* ── Mobile Sidebar Overlay ───────────────────────────────── */}
      <AnimatePresence>
        {isMobileOpen && (
          <motion.div
            key="overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
            onClick={() => setIsMobileOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* ── Sidebar (floating, not full-bleed) ───────────────────── */}
      <div
        className={`
          fixed inset-y-0 left-0 z-50 p-3
          transform transition-transform duration-300 ease-in-out
          ${isMobileOpen ? "translate-x-0" : "-translate-x-full"}
          md:relative md:translate-x-0 md:flex md:flex-col md:w-[268px] md:shrink-0
        `}
      >
        <Sidebar />
      </div>

      {/* ── Main Content ─────────────────────────────────────────── */}
      <div className="flex flex-1 flex-col z-10 w-full min-w-0 relative">
        <Navbar onMenuClick={() => setIsMobileOpen(true)} />
        <main className="flex-1 overflow-y-auto flex flex-col relative scrollbar-hide">
          {children}
        </main>
      </div>
    </div>
  );
}