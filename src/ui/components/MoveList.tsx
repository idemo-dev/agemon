import type { Move } from "../../engine/types.js";
import { MoveCard } from "./MoveCard.js";

interface MoveListProps {
  moves: Move[];
}

export function MoveList({ moves }: MoveListProps) {
  if (moves.length === 0) {
    return (
      <div style={{ padding: "16px", color: "var(--text-muted, #9e9eae)" }}>
        No moves detected
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
      {moves.map((move) => (
        <MoveCard key={`${move.name}-${move.source}`} move={move} />
      ))}
    </div>
  );
}
