import { useState, useMemo } from "react";
import type { DashboardData, Move, MoveCategory, AgemonProfile } from "../../engine/types.js";
import { MoveCard } from "./MoveCard.js";
import { PixelMonster } from "./PixelMonster.js";

interface SearchTabProps {
  data: DashboardData;
  onSelectAgemon?: (profile: AgemonProfile) => void;
}

const CATEGORY_FILTERS: {
  key: MoveCategory | "all";
  label: string;
  color: string;
}[] = [
  { key: "all", label: "All", color: "#666" },
  { key: "attack", label: "\u2694 CMD", color: "#2c3e50" },
  { key: "support", label: "\u{1F527} MCP", color: "#27ae60" },
  { key: "reflex", label: "\u26A1 Hook", color: "#F39C12" },
  { key: "passive", label: "\u{1F4D6} Knowledge", color: "#9B59B6" },
  { key: "guard", label: "\u{1F6E1} Guard", color: "#4A90D9" },
];

interface MoveEntry {
  move: Move;
  agemonName: string;
  agemonId: string;
  count: number;
}

function deduplicateSearchMoves(
  entries: { move: Move; agemonName: string; agemonId: string }[],
): MoveEntry[] {
  const map = new Map<string, MoveEntry>();
  for (const entry of entries) {
    const key = `${entry.agemonId}::${entry.move.name}::${entry.move.category}::${entry.move.type}`;
    const existing = map.get(key);
    if (existing) {
      existing.count++;
    } else {
      map.set(key, { ...entry, count: 1 });
    }
  }
  return Array.from(map.values());
}

export function SearchTab({ data, onSelectAgemon }: SearchTabProps) {
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<MoveCategory | "all">(
    "all",
  );

  const allAgemon = useMemo(
    () => [...data.trainer.globalAgemon, ...data.trainer.projectAgemon],
    [data],
  );

  const agemonMap = useMemo(() => {
    const map = new Map<string, AgemonProfile>();
    for (const a of allAgemon) map.set(a.id, a);
    return map;
  }, [allAgemon]);

  const allMoves = useMemo(() => {
    const entries = allAgemon.flatMap((agemon) =>
      agemon.moves.map((move) => ({
        move,
        agemonName: agemon.displayName,
        agemonId: agemon.id,
      })),
    );
    return deduplicateSearchMoves(entries);
  }, [allAgemon]);

  const filtered = useMemo(() => {
    let result = allMoves;

    // Apply category filter
    if (categoryFilter !== "all") {
      result = result.filter((e) => e.move.category === categoryFilter);
    }

    // Apply text search
    if (query.trim()) {
      const q = query.toLowerCase();
      result = result.filter(
        ({ move, agemonName }) =>
          move.name.toLowerCase().includes(q) ||
          move.category.toLowerCase().includes(q) ||
          move.type.toLowerCase().includes(q) ||
          move.description.toLowerCase().includes(q) ||
          move.capabilities.some((c) => c.toLowerCase().includes(q)) ||
          agemonName.toLowerCase().includes(q),
      );
    }

    return result;
  }, [allMoves, query, categoryFilter]);

  // Group by agemon for display
  const grouped = useMemo(() => {
    const map = new Map<string, { name: string; moves: MoveEntry[] }>();
    for (const entry of filtered) {
      const group = map.get(entry.agemonId) || {
        name: entry.agemonName,
        moves: [],
      };
      group.moves.push(entry);
      map.set(entry.agemonId, group);
    }
    return Array.from(map.entries());
  }, [filtered]);

  const totalUnique = filtered.length;
  const totalRaw = filtered.reduce((sum, e) => sum + e.count, 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      {/* Search input */}
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

      {/* Category filter chips */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
        {CATEGORY_FILTERS.map(({ key, label, color }) => (
          <button
            key={key}
            onClick={() =>
              setCategoryFilter(categoryFilter === key && key !== "all" ? "all" : key)
            }
            style={{
              padding: "4px 10px",
              borderRadius: "12px",
              fontSize: "11px",
              fontWeight: 600,
              fontFamily: "var(--font-mono, monospace)",
              cursor: "pointer",
              border:
                categoryFilter === key
                  ? `1.5px solid ${color}`
                  : "1px solid var(--border-color, #e0e0e8)",
              background: categoryFilter === key ? color : "var(--bg-card, #fff)",
              color:
                categoryFilter === key
                  ? "#fff"
                  : "var(--text-secondary, #636e72)",
              transition: "all 0.15s",
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Results count */}
      <div
        style={{
          fontSize: "12px",
          color: "var(--text-muted, #9e9eae)",
          fontFamily: "var(--font-mono, monospace)",
        }}
      >
        {totalUnique} unique move{totalUnique !== 1 ? "s" : ""}
        {totalRaw !== totalUnique && ` (${totalRaw} total)`}
        {query && ` for "${query}"`}
      </div>

      {/* Results grouped by Agemon */}
      {grouped.map(([agemonId, { name, moves }]) => (
        <div key={agemonId}>
          <div
            onClick={() => {
              const profile = agemonMap.get(agemonId);
              if (profile && onSelectAgemon) onSelectAgemon(profile);
            }}
            style={{
              fontSize: "11px",
              fontWeight: 600,
              color: onSelectAgemon ? "var(--text-primary, #1a1a2e)" : "var(--text-secondary, #636e72)",
              marginBottom: "6px",
              fontFamily: "var(--font-mono, monospace)",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              cursor: onSelectAgemon ? "pointer" : "default",
              padding: "4px 8px",
              borderRadius: "4px",
              transition: "background 0.15s",
            }}
            onMouseEnter={(e) => {
              if (onSelectAgemon) e.currentTarget.style.background = "var(--bg-hover, #f0f0f5)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
            }}
          >
            {(() => {
              const profile = agemonMap.get(agemonId);
              return profile ? (
                <div style={{
                  width: "28px",
                  height: "28px",
                  flexShrink: 0,
                  overflow: "hidden",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}>
                  <div style={{ transform: "scale(0.44)", transformOrigin: "center center" }}>
                    <PixelMonster profile={profile} size="mini" />
                  </div>
                </div>
              ) : null;
            })()}
            {name}
            <span
              style={{
                fontSize: "10px",
                color: "var(--text-muted, #9e9eae)",
                fontWeight: 400,
              }}
            >
              ({moves.length})
            </span>
            {onSelectAgemon && (
              <span style={{ fontSize: "10px", color: "var(--text-muted, #9e9eae)" }}>
                {"\u2192"}
              </span>
            )}
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "6px",
            }}
          >
            {moves.map(({ move, count }) => (
              <MoveCard
                key={`${move.name}-${move.category}-${move.type}`}
                move={move}
                count={count}
              />
            ))}
          </div>
        </div>
      ))}

      {filtered.length === 0 && (query || categoryFilter !== "all") && (
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
