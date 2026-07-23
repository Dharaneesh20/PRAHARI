import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "react-router-dom";
import { type ReactNode } from "react";

interface PageTransitionProps { children: ReactNode; }

export default function PageTransition({ children }: PageTransitionProps) {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0, y: 10, filter: "blur(4px)" }}
        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        exit={{ opacity: 0, y: -6, filter: "blur(2px)" }}
        transition={{ type: "spring", stiffness: 280, damping: 28, duration: 0.2 }}
        className="flex flex-col h-full w-full"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
