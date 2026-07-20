import { motion } from "framer-motion";

type DateRange = "today" | "7d" | "30d";

interface DateRangePickerProps {
  value: DateRange;
  onChange: (v: DateRange) => void;
}

const OPTIONS: { value: DateRange; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "7d",    label: "7D" },
  { value: "30d",   label: "30D" },
];

export default function DateRangePicker({ value, onChange }: DateRangePickerProps) {
  return (
    <div
      className="flex items-center gap-0.5 p-1 rounded-xl"
      style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.09)" }}
    >
      {OPTIONS.map(opt => (
        <div key={opt.value} className="relative">
          {value === opt.value && (
            <motion.div
              layoutId="date-range-active"
              className="absolute inset-0 rounded-lg"
              transition={{ type: "spring", stiffness: 380, damping: 28 }}
              style={{ background: "rgba(201,162,39,0.18)", border: "1px solid rgba(201,162,39,0.4)" }}
            />
          )}
          <button
            onClick={() => onChange(opt.value)}
            className="relative z-10 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
            style={{ color: value === opt.value ? "#C9A227" : "rgba(255,255,255,0.4)" }}
          >
            {opt.label}
          </button>
        </div>
      ))}
    </div>
  );
}

export type { DateRange };
