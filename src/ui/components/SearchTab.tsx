import { useState, useMemo } from "react";
import type { DashboardData, Move, AgemonProfile } from "../../engine/types.js";
import { MoveCard } from "./MoveCard.js";

interface SearchTabProps {
  data: DashboardData;
}

export function SearchTab({ data }: SearchTabProps) {
  const [query, setQuery] = useState("");

  const allMoves = useMemo(() => {
    const all = [
      ...data.trainer.globalAgemon,
      ...data.trainer.projectAgemon,
    ];
    return all.flatMap((agemon) =>
      agemon.moves.map((move) => ({
        move,
        agemonName: agemon.displayName,
        agemonId: agemon.id,
      })),
    );
  }, [data]);

  const filtered = useMemo(() => {
    if (!query.trim()) return allMoves;
    const q = query.toLowerCase();
    return allMoves.filter(
      ({ move, agemonName }) =>
        move.name.toLowerCase().includes(q) ||
        move.category.toLowerCase().includes(q) ||
        move.type.toLowerCase().includes(q) ||
        move.description.toLowerCase().includes(q) ||
        move.capabilities.some((c) => c.toLowerCase().includes(q)) ||
        agemonName.toLowerCase().includes(q),
    );
  }, [allMoves, query]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      {/* Search input */}
      <div>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search moves by name, type, capability..."
          style={{
            width: "100%",
            padding: "10px 14px",
            border: "1px solid var(--border-color, #e0e0e8)",
            borderRadius: "var(--border-radius, 6px)",
            fontSize: "14px",
            fontFamily: "var(--font-mono, monospace)",
            background: "var(--bg-card, #fff)",
            color: "var(--text-primary, #1a1a2e)",
            outline: "none",
            boxSizing: "border-box",
          }}
        />
      </div>

      {/* Results count */}
      <div
        style={{
          fontSize: "12px",
          color: "var(--text-muted, #9e9eae)",
          fontFamily: "var(--font-mono, monospace)",
        }}
      >
        {filtered.length} move{filtered.length !== 1 ? "s" : ""} found
        {query && ` for "${query}"`}
      </div>

      {/* Results */}
      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
        {filtered.map(({ move, agemonName, agemonId }) => (
          <div key={`${agemonId}-${move.name}`}>
            <div
              style={{
                fontSize: "10px",
                color: "var(--text-muted, #9e9eae)",
                marginBottom: "2px",
                fontFamily: "var(--font-mono, monospace)",
              }}
            >
              {agemonName}
            </div>
            <MoveCard move={move} />
          </div>
        ))}
      </div>

      {filtered.length === 0 && query && (
        <div
          style={{
            textAlign: "center",
            padding: "32px",
            color: "var(--text-muted, #9e9eae)",
          }}
        >
          No moves match your search
        </div>
      )}
    </div>
  );
}
