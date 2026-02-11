import type { AgemonStats } from "../../engine/types.js";

interface StatsProps {
  stats: AgemonStats;
}

export function Stats({ stats }: StatsProps) {
  // TODO: Implement SVG radar chart
  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Stats</h2>
      {Object.entries(stats).map(([name, value]) => (
        <div key={name} className="flex items-center gap-2 mb-2">
          <span className="w-24 capitalize">{name}</span>
          <div className="flex-1 bg-gray-800 rounded-full h-3">
            <div
              className="bg-blue-500 rounded-full h-3"
              style={{ width: `${value}%` }}
            />
          </div>
          <span className="w-8 text-right">{Math.round(value)}</span>
        </div>
      ))}
    </div>
  );
}
