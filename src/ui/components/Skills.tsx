import type { Move } from "../../engine/types.js";

interface SkillsProps {
  moves: Move[];
}

export function Skills({ moves }: SkillsProps) {
  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Moves</h2>
      {moves.length === 0 ? (
        <p className="text-gray-500">No moves detected</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {moves.map((move) => (
            <div
              key={`${move.name}-${move.source}`}
              className="bg-gray-800 px-3 py-1.5 rounded-lg text-sm"
            >
              <span>{move.name}</span>
              <span className="ml-2 text-xs text-gray-500">
                {move.category}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
