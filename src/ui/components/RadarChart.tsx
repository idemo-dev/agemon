import type { AgemonStats, AgemonType } from "../../engine/types.js";

interface RadarChartProps {
  stats: AgemonStats;
  types: AgemonType[];
  size?: number;
}

const STAT_KEYS: (keyof AgemonStats)[] = [
  "knowledge",
  "arsenal",
  "reflex",
  "mastery",
  "guard",
  "synergy",
];

const STAT_LABELS: Record<keyof AgemonStats, string> = {
  knowledge: "KNW",
  arsenal: "ARS",
  reflex: "RFX",
  mastery: "MST",
  guard: "GRD",
  synergy: "SYN",
};

const TYPE_COLORS: Record<AgemonType, string> = {
  scholar: "#4A90D9",
  arsenal: "#E74C3C",
  sentinel: "#F39C12",
  artisan: "#9B59B6",
  guardian: "#27AE60",
  catalyst: "#1ABC9C",
};

export function RadarChart({ stats, types, size = 200 }: RadarChartProps) {
  const pad = 30; // padding for labels
  const innerSize = size;
  const svgSize = size + pad * 2;
  const center = svgSize / 2;
  const radius = innerSize * 0.38;
  const numAxes = 6;
  const angleStep = (Math.PI * 2) / numAxes;
  const startAngle = -Math.PI / 2; // Start from top

  const color = TYPE_COLORS[types[0] ?? "scholar"];

  // Generate grid lines
  const gridLevels = [20, 40, 60, 80, 100];

  function getPoint(index: number, value: number): [number, number] {
    const angle = startAngle + index * angleStep;
    const r = (value / 100) * radius;
    return [center + r * Math.cos(angle), center + r * Math.sin(angle)];
  }

  // Build stat polygon points
  const statValues = STAT_KEYS.map((key) => stats[key]);
  const points = statValues
    .map((val, i) => getPoint(i, val))
    .map(([x, y]) => `${x},${y}`)
    .join(" ");

  return (
    <svg width={svgSize} height={svgSize} viewBox={`0 0 ${svgSize} ${svgSize}`}>
      {/* Grid */}
      {gridLevels.map((level) => {
        const gridPoints = Array.from({ length: numAxes })
          .map((_, i) => getPoint(i, level))
          .map(([x, y]) => `${x},${y}`)
          .join(" ");
        return (
          <polygon
            key={level}
            points={gridPoints}
            fill="none"
            stroke="var(--border-color, #e0e0e8)"
            strokeWidth={0.5}
          />
        );
      })}

      {/* Axes */}
      {STAT_KEYS.map((_, i) => {
        const [x, y] = getPoint(i, 100);
        return (
          <line
            key={i}
            x1={center}
            y1={center}
            x2={x}
            y2={y}
            stroke="var(--border-color, #e0e0e8)"
            strokeWidth={0.5}
          />
        );
      })}

      {/* Stat polygon */}
      <polygon
        points={points}
        fill={color}
        fillOpacity={0.25}
        stroke={color}
        strokeWidth={2}
      />

      {/* Stat dots */}
      {statValues.map((val, i) => {
        const [x, y] = getPoint(i, val);
        return <circle key={i} cx={x} cy={y} r={3} fill={color} />;
      })}

      {/* Labels: abbreviation + value */}
      {STAT_KEYS.map((key, i) => {
        const [x, y] = getPoint(i, 128);
        const label = STAT_LABELS[key];
        const value = stats[key];
        return (
          <text
            key={key}
            x={x}
            y={y}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize={10}
            fontFamily="var(--font-mono, monospace)"
            fill="var(--text-secondary, #636e72)"
          >
            {label} {value}
          </text>
        );
      })}
    </svg>
  );
}
