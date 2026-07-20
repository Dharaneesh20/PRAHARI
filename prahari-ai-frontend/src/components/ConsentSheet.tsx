import { motion, AnimatePresence } from "framer-motion";
import { ShieldCheck, X } from "lucide-react";
import { ReactNode } from "react";

interface ConsentSheetProps {
  isOpen: boolean;
  onConfirm: () => void;
  onDismiss: () => void;
  icon: ReactNode;
  headline: string;
  body: string;
  diagram?: ReactNode;
  primaryLabel?: string;
  secondaryLabel?: string;
  badge?: string;
}

/**
 * ConsentSheet — reusable consent-first bottom sheet.
 * Used for camera, microphone, and location access flows.
 * Spring slides up from bottom; full spring dismiss.
 */
export default function ConsentSheet({
  isOpen,
  onConfirm,
  onDismiss,
  icon,
  headline,
  body,
  diagram,
  primaryLabel = "Allow Access",
  secondaryLabel = "Not Now",
  badge,
}: ConsentSheetProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[200] bg-black/50 backdrop-blur-sm"
            onClick={onDismiss}
          />

          {/* Sheet */}
          <motion.div
            initial={{ y: "100%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            transition={{ type: "spring", stiffness: 280, damping: 26 }}
            className="fixed bottom-0 left-0 right-0 z-[201] flex justify-center pointer-events-none"
          >
            <div
              className="glass-specular pointer-events-auto w-full max-w-lg mx-4 mb-4 rounded-3xl p-6 flex flex-col gap-5"
              style={{
                backdropFilter: "blur(32px) saturate(180%)",
                WebkitBackdropFilter: "blur(32px) saturate(180%)",
                background: "rgba(20, 30, 55, 0.88)",
                border: "1px solid rgba(255,255,255,0.12)",
                boxShadow: "0 -8px 40px rgba(0,0,0,0.5), inset 0 1px 1px rgba(255,255,255,0.1)",
              }}
            >
              {/* Close */}
              <button
                onClick={onDismiss}
                className="absolute top-4 right-4 p-2 rounded-full hover:bg-white/10 text-white/50 hover:text-white transition-colors"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Icon + headline */}
              <div className="flex flex-col items-center text-center gap-3">
                <motion.div
                  initial={{ scale: 0.6, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.15, type: "spring", stiffness: 300, damping: 20 }}
                  className="w-16 h-16 rounded-2xl flex items-center justify-center"
                  style={{
                    background: "linear-gradient(135deg, rgba(201,162,39,0.2) 0%, rgba(63,92,134,0.2) 100%)",
                    border: "1px solid rgba(201,162,39,0.35)",
                  }}
                >
                  {icon}
                </motion.div>

                {/* Animated shield-lock badge */}
                <motion.div
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25 }}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold"
                  style={{
                    background: "rgba(46,158,108,0.15)",
                    border: "1px solid rgba(46,158,108,0.3)",
                    color: "#2E9E6C",
                  }}
                >
                  <ShieldCheck className="w-3 h-3" />
                  {badge || "Encrypted & Audit Logged"}
                </motion.div>

                <motion.h2
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="text-lg font-bold text-white leading-snug"
                >
                  {headline}
                </motion.h2>

                <motion.p
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.28 }}
                  className="text-sm text-white/60 leading-relaxed max-w-sm"
                >
                  {body}
                </motion.p>
              </div>

              {/* Optional diagram slot */}
              {diagram && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.35 }}
                  className="flex justify-center"
                >
                  {diagram}
                </motion.div>
              )}

              {/* Action buttons */}
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="flex flex-col sm:flex-row gap-3"
              >
                <button
                  onClick={onConfirm}
                  className="flex-1 py-3.5 rounded-2xl font-bold text-sm text-black transition-all hover:brightness-110 active:scale-[0.98] relative overflow-hidden"
                  style={{
                    background: "linear-gradient(135deg, #C9A227 0%, #e8b92e 100%)",
                    boxShadow: "0 4px 20px rgba(201,162,39,0.4)",
                  }}
                >
                  {primaryLabel}
                </button>
                <button
                  onClick={onDismiss}
                  className="flex-1 py-3.5 rounded-2xl font-bold text-sm text-white/70 hover:text-white transition-all hover:bg-white/10 border border-white/10"
                >
                  {secondaryLabel}
                </button>
              </motion.div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
