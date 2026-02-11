import type { Move, MoveCategory } from "../../engine/types.js";
import { MoveCard } from "./MoveCard.js";

interface MoveListProps {
  moves: Move[];
}

const CATEGORY_ORDER: MoveCategory[] = [
  "attack",
  "support",
  "reflex",
  "passive",
  "guard",
];

const CATEGORY_NAMES: Record<MoveCategory, string> = {
  attack: "Attack",
  support: "Support",
  reflex: "Reflex",
  passive: "Passive",
  guard: "Guard",
};

export function MoveList({ moves }: MoveListProps) {
  if (moves.length === 0) {
    return (
      <div style={{ padding: "16px", color: "var(--text-muted, #9e9eae)" }}>
        No moves detected
      </div>
    );
  }

  const grouped = CATEGORY_ORDER.map((cat) => ({
    category: cat,
    label: CATEGORY_NAMES[cat],
    moves: moves.filter((m) => m.category === cat),
  })).filter((g) => g.moves.length > 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      {grouped.map(({ category, label, moves: catMoves }) => (
        <div key={category}>
          <h3
            style={{
              fontSize: "12px",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.5px",
              color: "var(--text-muted, #9e9eae)",
              marginBottom: "8px",
            }}
          >
            {label} ({catMoves.length})
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            {catMoves.map((move) => (
              <MoveCard key={`${move.name}-${move.source}`} move={move} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
