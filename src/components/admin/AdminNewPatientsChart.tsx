import type { MonthlyCount } from "@/lib/admin-analytics";

interface AdminNewPatientsChartProps {
  data: MonthlyCount[];
  yMax: number;
}

function buildAreaPath(
  points: Array<{ x: number; y: number }>,
  baselineY: number
): { line: string; area: string } {
  if (points.length === 0) {
    return { line: "", area: "" };
  }

  const lineParts = [`M ${points[0].x} ${points[0].y}`];

  for (let i = 1; i < points.length; i += 1) {
    const prev = points[i - 1];
    const curr = points[i];
    const span = curr.x - prev.x;
    const cp1x = prev.x + span * 0.45;
    const cp2x = curr.x - span * 0.45;
    lineParts.push(`C ${cp1x} ${prev.y}, ${cp2x} ${curr.y}, ${curr.x} ${curr.y}`);
  }

  const line = lineParts.join(" ");
  const area = `${line} L ${points[points.length - 1].x} ${baselineY} L ${points[0].x} ${baselineY} Z`;

  return { line, area };
}

export function AdminNewPatientsChart({ data, yMax }: AdminNewPatientsChartProps) {
  const width = 520;
  const height = 200;
  const padX = 12;
  const padTop = 20;
  const padBottom = 28;
  const chartH = height - padTop - padBottom;
  const scaleMax = Math.max(yMax, 1);

  const stepX = data.length > 1 ? (width - padX * 2) / (data.length - 1) : 0;

  const points = data.map((point, index) => ({
    x: padX + index * stepX,
    y: padTop + chartH - (point.count / scaleMax) * chartH,
    count: point.count,
  }));

  const baselineY = padTop + chartH;
  const { line, area } = buildAreaPath(points, baselineY);

  const gridSteps = 4;
  const gridLines = Array.from({ length: gridSteps + 1 }, (_, index) => {
    const value = (scaleMax / gridSteps) * index;
    const y = padTop + chartH - (value / scaleMax) * chartH;
    return { y, value: Math.round(value) };
  });

  return (
    <div className="admin-analytics-card">
      <h3 className="admin-analytics-card-title">Patient growth — last 6 months</h3>
      <p className="mt-0.5 text-[11px] text-muted">Cumulative unique patients over time</p>
      <div className="mt-3">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="h-auto w-full max-h-[200px]"
          role="img"
          aria-label="Cumulative patient growth for the last six months"
        >
          <defs>
            <linearGradient id="patientsAreaFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#1e3a5f" stopOpacity="0.18" />
              <stop offset="100%" stopColor="#1e3a5f" stopOpacity="0.02" />
            </linearGradient>
          </defs>

          {gridLines.map((grid) => (
            <line
              key={grid.y}
              x1={padX}
              y1={grid.y}
              x2={width - padX}
              y2={grid.y}
              stroke="#e2e8f0"
              strokeWidth="1"
            />
          ))}

          {area && <path d={area} fill="url(#patientsAreaFill)" />}
          {line && (
            <path
              d={line}
              fill="none"
              stroke="#1e3a5f"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}
          {points.map((point, index) => (
            <g key={data[index].label}>
              {point.count > 0 && (
                <text
                  x={point.x}
                  y={point.y - 8}
                  textAnchor="middle"
                  className="fill-slate-500 text-[10px] font-medium"
                >
                  {point.count}
                </text>
              )}
              <circle cx={point.x} cy={point.y} r="4" fill="white" stroke="#1e3a5f" strokeWidth="2" />
              <text
                x={point.x}
                y={height - 6}
                textAnchor="middle"
                className="fill-slate-400 text-[11px]"
              >
                {data[index].label}
              </text>
            </g>
          ))}
        </svg>
      </div>
    </div>
  );
}
