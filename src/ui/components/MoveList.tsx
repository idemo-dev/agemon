import { useMemo } from "react";
import type { Move } from "../../engine/types.js";
import { MoveCard } from "./MoveCard.js";

interface MoveListProps {
  moves: Move[];
}

interface GroupedMove {
  move: Move;
  count: number;
}

function groupMoves(moves: Move[]): GroupedMove[] {
  const map = new Map<string, GroupedMove>();
  for (const move of moves) {
    const key = `${move.name}::${move.category}::${move.type}`;
    const existing = map.get(key);
    if (existing) {
      existing.count++;
      // Keep the one with higher power
      if (move.power > existing.move.power) {
        existing.move = move;
      }
    } else {
      map.set(key, { move, count: 1 });
    }
  }
  // Sort: higher power first, then alphabetical
  return Array.from(map.values()).sort(
    (a, b) => b.move.power - a.move.power || a.move.name.localeCompare(b.move.name),
  );
}

export function MoveList({ moves }: MoveListProps) {
  const grouped = useMemo(() => groupMoves(moves), [moves]);

  if (moves.length === 0) {
    return (
      <div style={{ padding: "16px", color: "var(--text-muted, #9e9eae)" }}>
        No moves detected
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
      {grouped.map(({ move, count }) => (
        <MoveCard key={`${move.name}-${move.category}-${move.type}`} move={move} count={count} />
      ))}
    </div>
  );
}
