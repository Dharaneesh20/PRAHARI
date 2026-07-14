import { useEffect, useState, type ReactNode } from "react";
import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { glassPanelStyle } from "./GlassCard";

function useCountUp(target: number, duration = 1400, decimals = 0) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let frame = 0;
    const totalFrames = Math.round((duration / 1000) * 60);
    const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
    const tick = () => {
      frame++;
      const progress = easeOut(frame / totalFrames);
      setCount(parseFloat((progress * target).toFixed(decimals)));
      if (frame < totalFrames) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [target, duration, decimals]);
  return count;
}

interface StatCardProps {
  label: string;
  value: number;
  suffix?: string;
  prefix?: string;
  decimals?: number;
  trend?: number; // positive = up, negative = down
  trendLabel?: string;
  icon: ReactNode;
  accentColor?: string;
  delay?: number;
}

export default function StatCard({
  label, value, suffix = "", prefix = "", decimals = 0,
  trend, trendLabel, icon, accentColor = "#C9A227", delay = 0,
}: StatCardProps) {
  const display = useCountUp(value, 1400, decimals);

  const trendIcon = trend === undefined ? null
    : trend > 0 ? <TrendingUp className="w-3 h-3" />
    : trend < 0 ? <TrendingDown className="w-3 h-3" />
    : <Minus className="w-3 h-3" />;

  const trendColor = trend === undefined ? "transparent"
    : trend > 0 ? "#2E9E6C" : trend < 0 ? "#D14343" : "#6B7280";

  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay, type: "spring", stiffness: 260, damping: 24 }}
      whileHover={{ y: -2, scale: 1.02 }}
      className="glass-specular rounded-2xl p-5 flex flex-col gap-3 relative overflow-hidden cursor-default"
      style={glassPanelStyle}
    >
      {/* Accent glow corner */}
      <div
        className="absolute top-0 right-0 w-24 h-24 rounded-full pointer-events-none"
        style={{ background: `radial-gradient(circle, ${accentColor}12 0%, transparent 70%)`, transform: "translate(30%, -30%)" }}
      />

      {/* Icon */}
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
        style={{ background: `${accentColor}18`, border: `1px solid ${accentColor}30`, color: accentColor }}
      >
        {icon}
      </div>

      {/* Value */}
      <div>
        <p className="text-[11px] font-bold uppercase tracking-widest mb-1" style={{ color: "rgba(255,255,255,0.4)" }}>
          {label}
        </p>
        <p className="text-3xl font-bold tabular-nums" style={{ color: "rgba(255,255,255,0.92)" }}>
          {prefix}{decimals > 0 ? display.toFixed(decimals) : Math.round(display)}{suffix}
        </p>
      </div>

      {/* Trend */}
      {trend !== undefined && (
        <div className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: trendColor }}>
          {trendIcon}
          {trend > 0 ? "+" : ""}{trend}{trendLabel && <span style={{ color: "rgba(255,255,255,0.3)" }}>{trendLabel}</span>}
        </div>
      )}
    </motion.div>
  );
}
