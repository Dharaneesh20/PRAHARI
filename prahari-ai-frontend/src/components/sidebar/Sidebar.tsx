import { motion } from "framer-motion";
import { navigation } from "../../data/navigation";
import { useLocation, useNavigate } from "react-router-dom";

export default function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <aside className="w-64 h-screen border-r border-neutral-200 dark:border-neutral-800/60 bg-white/70 dark:bg-black/70 backdrop-blur-3xl shadow-[0_8px_32px_0_rgba(0,0,0,0.05)] flex flex-col relative z-20 transition-colors duration-500">
      
      {/* 1. Brand Header */}
      <div className="p-6 flex items-center gap-3 border-b border-neutral-200 dark:border-neutral-800/60 transition-colors duration-500">
        <div className="w-10 h-10 bg-neutral-100 dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-sm flex items-center justify-center p-1.5 relative overflow-hidden">
          <img 
            src="/image_9a4dc1.png" 
            alt="Prahari AI Logo" 
            className="w-full h-full object-contain relative z-10" 
          />
        </div>
        <div>
          <h1 className="text-xl font-bold text-black dark:text-white tracking-wide transition-colors duration-500">
            Prahari AI
          </h1>
          <p className="text-[10px] uppercase text-neutral-500 font-bold tracking-widest mt-0.5 transition-colors duration-500">
            Command Center
          </p>
        </div>
      </div>

      {/* 2. Animated Navigation */}
      <nav className="flex-1 px-3 py-6 overflow-y-auto">
        <ul className="space-y-1.5">
          {navigation.map((item, index) => {
            // Check if the current URL matches the item's path
            const isActive = location.pathname === item.path;
            const Icon = item.icon;

            return (
              <motion.li
                key={item.name}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 + 0.1 }}
                className="relative"
              >
                <button
                  onClick={() => navigate(item.path)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 relative z-10 ${
                    isActive
                      ? "text-black dark:text-white font-bold drop-shadow-sm"
                      : "text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white dark:hover:bg-white/[0.04] hover:bg-neutral-100"
                  }`}
                >
                  <Icon 
                    className={`w-5 h-5 transition-all duration-300 ${
                      isActive ? "text-black dark:text-white" : "text-neutral-400 dark:text-neutral-500"
                    }`} 
                  />
                  <span className="text-sm tracking-wide">{item.name}</span>
                </button>

                {/* 3. Liquid Glass Active Indicator */}
                {isActive && (
                  <motion.div
                    layoutId="active-nav"
                    className="absolute inset-0 bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl z-0"
                    transition={{ type: "spring", stiffness: 350, damping: 30 }}
                  >
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-1/2 bg-black dark:bg-white rounded-r-full shadow-sm" />
                  </motion.div>
                )}
              </motion.li>
            );
          })}
        </ul>
      </nav>

      {/* 4. Frosted Profile Card */}
      <div className="p-4 m-4 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm relative overflow-hidden group hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors cursor-pointer">
        <div className="flex items-center gap-3 relative z-10">
          <div className="relative">
            <div className="w-10 h-10 rounded-full bg-neutral-200 dark:bg-black flex items-center justify-center border border-neutral-300 dark:border-neutral-700">
              <span className="text-sm font-bold text-black dark:text-white">IR</span>
            </div>
            <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white dark:border-[#090D16] rounded-full" />
          </div>
          
          <div>
            <p className="text-sm font-bold text-black dark:text-white tracking-wide transition-colors duration-500">Inspector Raj</p>
            <p className="text-xs text-neutral-500 flex items-center gap-1.5 mt-0.5 transition-colors duration-500">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500/80 animate-pulse" />
              Karnataka Police
            </p>
          </div>
        </div>
      </div>
      
    </aside>
  );
}