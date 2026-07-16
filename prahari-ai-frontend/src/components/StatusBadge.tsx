import type { Severity, IncidentStatus, UnitStatus } from "../lib/types";

// ── Severity Badge ───────────────────────────────────────────
const SEVERITY_MAP: Record<Severity, { label: string; bg: string; color: string; dot: string }> = {
  critical: { label: "CRITICAL", bg: "rgba(209,67,67,0.15)", color: "#D14343", dot: "#D14343" },
  high:     { label: "HIGH",     bg: "rgba(249,115,22,0.15)", color: "#F97316", dot: "#F97316" },
  medium:   { label: "MEDIUM",   bg: "rgba(201,162,39,0.15)", color: "#C9A227", dot: "#C9A227" },
  low:      { label: "LOW",      bg: "rgba(46,158,108,0.15)", color: "#2E9E6C", dot: "#2E9E6C" },
};

// ── Incident Status Badge ───────────────────────────────────
const INCIDENT_STATUS_MAP: Record<IncidentStatus, { label: string; bg: string; color: string }> = {
  "new":         { label: "NEW",         bg: "rgba(139,92,246,0.15)", color: "#8B5CF6" },
  "dispatched":  { label: "DISPATCHED",  bg: "rgba(201,162,39,0.15)", color: "#C9A227" },
  "in-progress": { label: "IN PROGRESS", bg: "rgba(249,115,22,0.15)", color: "#F97316" },
  "resolved":    { label: "RESOLVED",    bg: "rgba(46,158,108,0.15)", color: "#2E9E6C" },
};

// ── Unit Status Badge ────────────────────────────────────────
const UNIT_STATUS_MAP: Record<UnitStatus, { label: string; color: string; glow: string }> = {
  "on-patrol":  { label: "ON PATROL",  color: "#2E9E6C", glow: "rgba(46,158,108,0.5)" },
  "responding": { label: "RESPONDING", color: "#D14343", glow: "rgba(209,67,67,0.5)" },
  "on-break":   { label: "ON BREAK",   color: "#C9A227", glow: "rgba(201,162,39,0.4)" },
  "off-duty":   { label: "OFF DUTY",   color: "#6B7280", glow: "transparent" },
};

export function SeverityBadge({ severity }: { severity: Severity }) {
  const s = SEVERITY_MAP[severity];
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-bold tracking-wider"
      style={{ background: s.bg, color: s.color }}
    >
      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: s.dot }} />
      {s.label}
    </span>
  );
}

export function IncidentStatusBadge({ status }: { status: IncidentStatus }) {
  const s = INCIDENT_STATUS_MAP[status];
  return (
    <span
      className="inline-flex px-2 py-1 rounded-lg text-[10px] font-bold tracking-wider"
      style={{ background: s.bg, color: s.color }}
    >
      {s.label}
    </span>
  );
}

export function UnitStatusDot({ status, size = 10 }: { status: UnitStatus; size?: number }) {
  const s = UNIT_STATUS_MAP[status];
  const isActive = status === "on-patrol" || status === "responding";
  return (
    <span
      className="shrink-0 rounded-full inline-block"
      style={{
        width: size, height: size,
        background: s.color,
        boxShadow: isActive ? `0 0 0 0 ${s.glow}` : "none",
        animation: isActive ? "statusBreath 2.5s ease-in-out infinite" : "none",
      }}
      title={s.label}
    />
  );
}

export function UnitStatusBadge({ status }: { status: UnitStatus }) {
  const s = UNIT_STATUS_MAP[status];
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold tracking-wider"
      style={{ background: `${s.color}18`, color: s.color, border: `1px solid ${s.color}35` }}
    >
      <UnitStatusDot status={status} size={7} />
      {s.label}
    </span>
  );
}

export function ReportStatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; color: string }> = {
    "Draft":        { bg: "rgba(107,114,128,0.15)", color: "#9CA3AF" },
    "Under Review": { bg: "rgba(201,162,39,0.15)",  color: "#C9A227" },
    "Finalized":    { bg: "rgba(63,92,134,0.15)",   color: "#7BA7CC" },
    "Submitted":    { bg: "rgba(46,158,108,0.15)",  color: "#2E9E6C" },
  };
  const s = map[status] ?? { bg: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.6)" };
  return (
    <span className="inline-flex px-2 py-1 rounded-lg text-[10px] font-bold tracking-wider" style={{ background: s.bg, color: s.color }}>
      {status.toUpperCase()}
    </span>
  );
}
