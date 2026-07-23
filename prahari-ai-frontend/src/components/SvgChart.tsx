import { useEffect, useRef } from "react";

interface DataPoint { label: string; value: number; }

interface SvgAreaChartProps {
  data: DataPoint[];
  height?: number;
  color?: string;
  showLabels?: boolean;
  showGrid?: boolean;
  animate?: boolean;
  id?: string; // unique gradient ID
}

export function SvgAreaChart({
  data, height = 140, color = "#C9A227", showLabels = true,
  showGrid = true, animate = true, id = "chart",
}: SvgAreaChartProps) {
  const pathRef = useRef<SVGPathElement>(null);
  const areaRef = useRef<SVGPathElement>(null);

  const labelHeight = showLabels ? 24 : 0;
  const svgH = Math.max(40, height - labelHeight);
  const PAD = { top: 8, bottom: 4 };
  const chartH = svgH - PAD.top - PAD.bottom;

  const values = data.map(d => d.value);
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = max - min || 1;

  // Map to pixel coords using percentage widths
  const pts = data.map((d, i) => ({
    x: data.length <= 1 ? 50 : (i / (data.length - 1)) * 100,
    y: PAD.top + chartH - ((d.value - min) / range) * chartH,
  }));

  // Smooth bezier path
  const linePath = pts.reduce((acc, p, i) => {
    if (i === 0) return `M ${p.x} ${p.y}`;
    const prev = pts[i - 1];
    const cp = (prev.x + p.x) / 2;
    return `${acc} C ${cp} ${prev.y} ${cp} ${p.y} ${p.x} ${p.y}`;
  }, "");

  const areaPath = `${linePath} L ${pts[pts.length - 1].x} ${svgH - PAD.bottom} L ${pts[0].x} ${svgH - PAD.bottom} Z`;

  // Animate draw-in via stroke-dashoffset
  useEffect(() => {
    if (!animate || !pathRef.current) return;
    const len = pathRef.current.getTotalLength();
    pathRef.current.style.strokeDasharray = `${len}`;
    pathRef.current.style.strokeDashoffset = `${len}`;
    requestAnimationFrame(() => {
      if (pathRef.current) {
        pathRef.current.style.transition = "stroke-dashoffset 1.4s cubic-bezier(0.4,0,0.2,1)";
        pathRef.current.style.strokeDashoffset = "0";
      }
    });
  }, [animate, data]);

  const gradId = `grad-${id}`;
  const gridLines = [0.25, 0.5, 0.75];

  // Show every Nth label
  const labelEvery = data.length > 20 ? 7 : data.length > 10 ? 4 : 1;

  return (
    <div className="w-full flex flex-col justify-between" style={{ height }}>
      <div className="relative w-full flex-1 min-h-0">
        <svg
          viewBox={`0 0 100 ${svgH}`}
          preserveAspectRatio="none"
          className="w-full h-full overflow-visible"
        >
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.38" />
              <stop offset="100%" stopColor={color} stopOpacity="0.02" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          {showGrid && gridLines.map((frac) => (
            <line
              key={frac}
              x1="0" x2="100"
              y1={PAD.top + chartH * (1 - frac)}
              y2={PAD.top + chartH * (1 - frac)}
              stroke="rgba(255,255,255,0.06)" strokeWidth="0.5"
            />
          ))}

          {/* Area fill */}
          <path ref={areaRef} d={areaPath} fill={`url(#${gradId})`} />

          {/* Line */}
          <path ref={pathRef} d={linePath} fill="none" stroke={color} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>

      {showLabels && (
        <div className="flex justify-between items-center px-1 pt-2 text-[11px] font-mono text-slate-400/70 select-none">
          {data.map((d, i) => {
            if (i % labelEvery !== 0 && i !== data.length - 1) return null;
            return <span key={i}>{d.label}</span>;
          })}
        </div>
      )}
    </div>
  );
}

interface SvgBarChartProps {
  data: { label: string; value: number; color?: string }[];
  height?: number;
  maxVal?: number;
}

export function SvgBarChart({ data, height = 140, maxVal }: SvgBarChartProps) {
  const max = maxVal ?? Math.max(...data.map(d => d.value), 1);
  const barW = 80 / data.length;
  const gap = 20 / (data.length + 1);
  const svgH = height - 24;

  return (
    <div className="w-full flex flex-col justify-between" style={{ height }}>
      <div className="relative w-full flex-1 min-h-0">
        <svg viewBox={`0 0 100 ${svgH}`} width="100%" height="100%" preserveAspectRatio="none">
          {data.map((d, i) => {
            const barH = (d.value / max) * (svgH - 8);
            const x = gap * (i + 1) + barW * i;
            const y = svgH - barH - 2;
            const color = d.color ?? "#C9A227";
            return (
              <g key={i}>
                <rect
                  x={x} y={y} width={barW} height={barH}
                  fill={color} fillOpacity="0.8" rx="1"
                  style={{ transition: "height 0.8s cubic-bezier(0.34,1.56,0.64,1), y 0.8s cubic-bezier(0.34,1.56,0.64,1)" }}
                />
              </g>
            );
          })}
        </svg>
      </div>
      <div className="flex justify-between items-center px-1 pt-2 text-[10px] font-mono text-slate-400/70 select-none">
        {data.map((d, i) => (
          <span key={i} className="truncate max-w-[50px] text-center">{d.label}</span>
        ))}
      </div>
    </div>
  );
}

// Simple sparkline (single row of values)
export function Sparkline({ values, color = "#C9A227", width = 60, height = 24 }: {
  values: number[]; color?: string; width?: number; height?: number;
}) {
  const max = Math.max(...values, 1);
  const pts = values.map((v, i) => `${(i / (values.length - 1)) * width},${height - (v / max) * height * 0.85}`);
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <polyline points={pts.join(" ")} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.8" />
    </svg>
  );
}
