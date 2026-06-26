"use client";

export interface LineChartPoint {
  runId: string;
  y: number;
}

export interface LineChartSeries {
  id: string;
  name: string;
  color: string;
  points: LineChartPoint[];
}

export interface LineChartAxisItem {
  runId: string;
  label: string;
}

interface LineChartProps {
  xAxis: LineChartAxisItem[];
  series: LineChartSeries[];
  height?: number;
  yFormat?: (value: number) => string;
  yMax?: number;
  onPointClick?: (runId: string) => void;
}

const VIEW_W = 800;
const PAD_L = 48;
const PAD_R = 16;
const PAD_T = 16;
const PAD_B = 40;

export function LineChart({
  xAxis,
  series,
  height = 260,
  yFormat = (v) => v.toFixed(0),
  yMax,
  onPointClick,
}: LineChartProps) {
  const plotW = VIEW_W - PAD_L - PAD_R;
  const plotH = height - PAD_T - PAD_B;

  const allY = series.flatMap((s) => s.points.map((p) => p.y));
  const computedMax = yMax ?? (allY.length ? Math.max(...allY) : 1);
  const top = computedMax <= 0 ? 1 : computedMax * 1.1;

  const xFor = (runId: string) => {
    const idx = xAxis.findIndex((a) => a.runId === runId);
    if (idx < 0) return PAD_L;
    if (xAxis.length === 1) return PAD_L + plotW / 2;
    return PAD_L + (idx / (xAxis.length - 1)) * plotW;
  };

  const yFor = (value: number) => PAD_T + plotH - (value / top) * plotH;

  const yTicks = 4;
  const ticks = Array.from({ length: yTicks + 1 }, (_, i) => (top / yTicks) * i);

  return (
    <svg
      viewBox={`0 0 ${VIEW_W} ${height}`}
      className="w-full"
      style={{ height }}
      role="img"
    >
      {ticks.map((t) => {
        const y = yFor(t);
        return (
          <g key={t}>
            <line x1={PAD_L} y1={y} x2={VIEW_W - PAD_R} y2={y} stroke="#e2e8f0" strokeWidth={1} />
            <text x={PAD_L - 8} y={y + 4} textAnchor="end" className="fill-slate-400" fontSize={11}>
              {yFormat(t)}
            </text>
          </g>
        );
      })}

      {xAxis.map((a, idx) => {
        const x = xFor(a.runId);
        const show = xAxis.length <= 8 || idx % Math.ceil(xAxis.length / 8) === 0;
        if (!show) return null;
        return (
          <text
            key={a.runId}
            x={x}
            y={height - PAD_B + 18}
            textAnchor="middle"
            className="fill-slate-400"
            fontSize={10}
          >
            {a.label}
          </text>
        );
      })}

      {series.map((s) => {
        const pts = [...s.points].sort(
          (a, b) => xAxis.findIndex((x) => x.runId === a.runId) - xAxis.findIndex((x) => x.runId === b.runId),
        );
        const path = pts.map((p) => `${xFor(p.runId)},${yFor(p.y)}`).join(" ");
        return (
          <g key={s.id}>
            {pts.length > 1 && (
              <polyline points={path} fill="none" stroke={s.color} strokeWidth={2} />
            )}
            {pts.map((p) => (
              <circle
                key={p.runId}
                cx={xFor(p.runId)}
                cy={yFor(p.y)}
                r={4.5}
                fill="#fff"
                stroke={s.color}
                strokeWidth={2}
                style={{ cursor: onPointClick ? "pointer" : "default" }}
                onClick={() => onPointClick?.(p.runId)}
              >
                <title>{`${s.name}: ${yFormat(p.y)}`}</title>
              </circle>
            ))}
          </g>
        );
      })}
    </svg>
  );
}
