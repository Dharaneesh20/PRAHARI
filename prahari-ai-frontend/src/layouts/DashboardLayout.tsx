import { useState } from "react";
import Navbar from "../components/navbar/Navbar";
import Sidebar from "../components/sidebar/Sidebar";

type DashboardLayoutProps = {
  children: React.ReactNode;
};

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  return (
    <div className="flex h-screen bg-white dark:bg-black text-black dark:text-white relative overflow-hidden transition-colors duration-500 font-['Ubuntu']">
      
      {/* High-Tech Tactical Grid Background */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />
      <div className="absolute inset-0 bg-white dark:bg-black [mask-image:radial-gradient(ellipse_at_center,transparent_20%,black_100%)] pointer-events-none opacity-80 dark:opacity-100" />

      {/* Mobile Sidebar Overlay Backdrop */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden transition-opacity" 
          onClick={() => setIsMobileOpen(false)} 
        />
      )}

      {/* Sidebar Container (Hidden off-screen on mobile) */}
      <div className={`fixed inset-y-0 left-0 z-50 transform ${isMobileOpen ? "translate-x-0" : "-translate-x-full"} md:relative md:translate-x-0 transition-transform duration-300 ease-in-out`}>
        <Sidebar />
      </div>

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col z-10 w-full min-w-0">
        <Navbar onMenuClick={() => setIsMobileOpen(true)} />
        <main className="flex-1 overflow-y-auto z-10 flex flex-col relative">
          {children}
        </main>
      </div>
    </div>
  );
}