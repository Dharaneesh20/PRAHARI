import { type ReactNode } from "react";
import { motion } from "framer-motion";

const glassPanelStyle = {
  backdropFilter: "blur(20px) saturate(160%)",
  WebkitBackdropFilter: "blur(20px) saturate(160%)",
  background: "rgba(255,255,255,0.055)",
  border: "1px solid rgba(255,255,255,0.10)",
  boxShadow: "0 8px 32px rgba(0,0,0,0.45), inset 0 1px 1px rgba(255,255,255,0.10)",
} as const;

interface GlassCardProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  action?: ReactNode;
  className?: string;
  noPadding?: boolean;
  delay?: number;
  style?: React.CSSProperties;
}

export default function GlassCard({
  children, title, subtitle, action, className = "", noPadding = false, delay = 0, style = {},
}: GlassCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, type: "spring", stiffness: 260, damping: 24 }}
      className={`rounded-2xl overflow-hidden glass-specular ${className}`}
      style={{ ...glassPanelStyle, ...style }}
    >
      {(title || action) && (
        <div
          className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}
        >
          <div>
            {title && (
              <h3 className="font-semibold text-sm tracking-wide" style={{ color: "rgba(255,255,255,0.88)" }}>
                {title}
              </h3>
            )}
            {subtitle && (
              <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>
                {subtitle}
              </p>
            )}
          </div>
          {action && <div>{action}</div>}
        </div>
      )}
      <div className={noPadding ? "" : "p-5"}>{children}</div>
    </motion.div>
  );
}

// Export the style for reuse
export { glassPanelStyle };
