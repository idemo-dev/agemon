import { useState, useMemo } from "react";
import type { AgemonProfile, MoveCategory } from "../../engine/types.js";
import { getTypeLabel, TYPE_COLORS } from "../../engine/type-system.js";
import { PixelMonster } from "./PixelMonster.js";
import { RadarChart } from "./RadarChart.js";
import { MoveList } from "./MoveList.js";
import { Evolution } from "./Evolution.js";

interface AgemonDetailProps {
  profile: AgemonProfile;
  onBack: () => void;
}

const EQUIPMENT_EMOJI: Record<string, string> = {
  github: "\u{1F419}",
  filesystem: "\u{1F4C1}",
  slack: "\u{1F4AC}",
  postgres: "\u{1F5C4}",
  puppeteer: "\u{1F3AD}",
  playwright: "\u{1F3AD}",
  docker: "\u{1F433}",
  redis: "\u26A1",
  sqlite: "\u{1F4BE}",
  fetch: "\u{1F310}",
};

function getEquipmentEmoji(name: string): string {
  const lower = name.toLowerCase();
  for (const [key, emoji] of Object.entries(EQUIPMENT_EMOJI)) {
    if (lower.includes(key)) return emoji;
  }
  return "\u{1F527}";
}

const CATEGORY_META: Record<
  MoveCategory,
  { label: string; emoji: string; color: string }
> = {
  attack: { label: "CMD", emoji: "\u2694", color: "#2c3e50" },
  support: { label: "MCP", emoji: "\u{1F527}", color: "#27ae60" },
  reflex: { label: "Hook", emoji: "\u26A1", color: "#F39C12" },
  passive: { label: "Knowledge", emoji: "\u{1F4D6}", color: "#9B59B6" },
  guard: { label: "Guard", emoji: "\u{1F6E1}", color: "#4A90D9" },
};

type CategoryFilter = MoveCategory | "all";

export function AgemonDetail({ profile, onBack }: AgemonDetailProps) {
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("all");

  const xpProgress =
    profile.evolution.nextLevelXp > 0
      ? (profile.xp / profile.evolution.nextLevelXp) * 100
      : 100;

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const move of profile.moves) {
      counts[move.category] = (counts[move.category] || 0) + 1;
    }
    return counts;
  }, [profile.moves]);

  const filteredMoves = useMemo(
    () =>
      categoryFilter === "all"
        ? profile.moves
        : profile.moves.filter((m) => m.category === categoryFilter),
    [profile.moves, categoryFilter],
  );

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "16px",
        maxWidth: "540px",
        margin: "0 auto",
      }}
    >
      {/* Back button */}
      <button
        onClick={onBack}
        style={{
          alignSelf: "flex-start",
          background: "none",
          border: "1px solid var(--border-color, #e0e0e8)",
          borderRadius: "var(--border-radius, 6px)",
          padding: "6px 12px",
          cursor: "pointer",
          fontSize: "12px",
          color: "var(--text-secondary, #636e72)",
          fontFamily: "var(--font-mono, monospace)",
          transition: "all 0.15s",
        }}
      >
        {"\u2190"} Back
      </button>

      {/* Header Card */}
      <div
        style={{
          background: "var(--bg-card, #fff)",
          border: "1px solid var(--border-color, #e0e0e8)",
          borderRadius: "var(--border-radius, 6px)",
          padding: "20px",
          boxShadow: "var(--shadow-sm)",
        }}
      >
        {/* Name + Level */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <h2
            style={{
              margin: 0,
              fontSize: "22px",
              fontWeight: 700,
              color: "var(--text-primary, #1a1a2e)",
            }}
          >
            {profile.displayName}
          </h2>
          <span
            style={{
              background: "var(--color-brand, #e74c3c)",
              color: "#fff",
              padding: "3px 10px",
              borderRadius: "12px",
              fontSize: "12px",
              fontWeight: 700,
              fontFamily: "var(--font-mono, monospace)",
            }}
          >
            Lv.{profile.level}
          </span>
        </div>

        {/* Identity: source + title */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            marginTop: "6px",
          }}
        >
          <span
            style={{
              background:
                profile.source === "command" ? "#2c3e50" : "#27ae60",
              color: "#fff",
              padding: "1px 6px",
              borderRadius: "3px",
              fontSize: "10px",
              fontWeight: "bold",
              fontFamily: "var(--font-mono, monospace)",
            }}
          >
            {profile.source === "command" ? "CMD" : "MCP"}
          </span>
          <span
            style={{
              fontSize: "12px",
              color: "var(--text-muted, #9e9eae)",
              fontFamily: "var(--font-mono, monospace)",
            }}
          >
            {profile.name}
          </span>
          <span
            style={{
              fontSize: "11px",
              color: "var(--text-secondary, #636e72)",
              fontStyle: "italic",
            }}
          >
            {"\u00B7"} {profile.evolution.stage.charAt(0).toUpperCase() + profile.evolution.stage.slice(1)} {profile.evolution.title}
          </span>
        </div>

        {/* Type badge pills */}
        <div style={{ display: "flex", gap: "6px", marginTop: "10px" }}>
          {profile.types.map((type) => {
            const color = TYPE_COLORS[type]?.primary ?? "#999";
            return (
              <span
                key={type}
                style={{
                  border: `1.5px solid ${color}`,
                  color: color,
                  background: "transparent",
                  padding: "2px 10px",
                  borderRadius: "12px",
                  fontSize: "11px",
                  fontWeight: 700,
                }}
              >
                {getTypeLabel(type)}
              </span>
            );
          })}
        </div>

        {/* Sprite + RadarChart */}
        <div
          style={{
            display: "flex",
            gap: "16px",
            alignItems: "center",
            justifyContent: "center",
            marginTop: "16px",
          }}
        >
          <div
            style={{
              width: "160px",
              height: "160px",
              flexShrink: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
            }}
          >
            <PixelMonster profile={profile} size="full" />
          </div>
          <div style={{ flexShrink: 0 }}>
            <RadarChart stats={profile.stats} types={profile.types} size={180} />
          </div>
        </div>

        {/* XP Bar */}
        <div style={{ marginTop: "16px" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: "12px",
              fontFamily: "var(--font-mono, monospace)",
              color: "var(--text-secondary, #636e72)",
              marginBottom: "6px",
            }}
          >
            <span style={{ fontWeight: 600 }}>
              XP {profile.xp} / {profile.evolution.nextLevelXp}
            </span>
            <span>Next Lv.{profile.level + 1}</span>
          </div>
          <div
            style={{
              width: "100%",
              height: "10px",
              background: "var(--bg-secondary, #f8f8fa)",
              borderRadius: "5px",
              overflow: "hidden",
              border: "1px solid var(--border-color, #e0e0e8)",
            }}
          >
            <div
              style={{
                width: `${Math.min(xpProgress, 100)}%`,
                height: "100%",
                background: "linear-gradient(90deg, #1ABC9C, #4A90D9)",
                borderRadius: "5px",
                transition: "width 0.6s ease",
              }}
            />
          </div>
        </div>
      </div>

      {/* Evolution Section - moved up before Moves */}
      <div
        style={{
          background: "var(--bg-card, #fff)",
          border: "1px solid var(--border-color, #e0e0e8)",
          borderRadius: "var(--border-radius, 6px)",
          padding: "16px",
        }}
      >
        <h3
          style={{
            margin: "0 0 12px 0",
            fontSize: "15px",
            fontWeight: 700,
            color: "var(--text-primary, #1a1a2e)",
          }}
        >
          {"\u{1F4C8}"} EVOLUTION PATH
        </h3>
        <Evolution evolution={profile.evolution} />
      </div>

      {/* Equipment Section */}
      {profile.equipment.length > 0 && (
        <div
          style={{
            background: "var(--bg-card, #fff)",
            border: "1px solid var(--border-color, #e0e0e8)",
            borderRadius: "var(--border-radius, 6px)",
            padding: "16px",
          }}
        >
          <h3
            style={{
              margin: "0 0 12px 0",
              fontSize: "15px",
              fontWeight: 700,
              color: "var(--text-primary, #1a1a2e)",
            }}
          >
            {"\u{1F527}"} EQUIPMENT ({profile.equipment.length})
          </h3>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
            {profile.equipment.map((eq) => (
              <div
                key={eq.name}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                  padding: "4px 10px",
                  border: "1px solid var(--border-color, #e0e0e8)",
                  borderRadius: "12px",
                  fontSize: "12px",
                  fontFamily: "var(--font-mono, monospace)",
                  background: "var(--bg-card, #fff)",
                }}
              >
                <span>{getEquipmentEmoji(eq.name)}</span>
                <span>{eq.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Moves Section with category filter */}
      <div
        style={{
          background: "var(--bg-card, #fff)",
          border: "1px solid var(--border-color, #e0e0e8)",
          borderRadius: "var(--border-radius, 6px)",
          padding: "16px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            justifyContent: "space-between",
            marginBottom: "12px",
          }}
        >
          <h3
            style={{
              margin: 0,
              fontSize: "15px",
              fontWeight: 700,
              color: "var(--text-primary, #1a1a2e)",
            }}
          >
            {"\u2694"} MOVES ({profile.moves.length})
          </h3>
          <span
            style={{
              fontSize: "10px",
              color: "var(--text-muted, #9e9eae)",
              fontFamily: "var(--font-mono, monospace)",
            }}
          >
            click to expand
          </span>
        </div>

        {/* Category filter chips */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "6px",
            marginBottom: "12px",
          }}
        >
          <FilterChip
            label="All"
            count={profile.moves.length}
            color="#666"
            active={categoryFilter === "all"}
            onClick={() => setCategoryFilter("all")}
          />
          {(Object.entries(CATEGORY_META) as [MoveCategory, typeof CATEGORY_META.attack][]).map(
            ([cat, meta]) => {
              const count = categoryCounts[cat] || 0;
              if (count === 0) return null;
              return (
                <FilterChip
                  key={cat}
                  label={`${meta.emoji} ${meta.label}`}
                  count={count}
                  color={meta.color}
                  active={categoryFilter === cat}
                  onClick={() =>
                    setCategoryFilter(categoryFilter === cat ? "all" : cat)
                  }
                />
              );
            },
          )}
        </div>

        <MoveList moves={filteredMoves} />
      </div>
    </div>
  );
}

function FilterChip({
  label,
  count,
  color,
  active,
  onClick,
}: {
  label: string;
  count: number;
  color: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "4px",
        padding: "4px 10px",
        borderRadius: "12px",
        fontSize: "11px",
        fontWeight: 600,
        fontFamily: "var(--font-mono, monospace)",
        cursor: "pointer",
        border: active ? `1.5px solid ${color}` : "1px solid var(--border-color, #e0e0e8)",
        background: active ? color : "var(--bg-card, #fff)",
        color: active ? "#fff" : "var(--text-secondary, #636e72)",
        transition: "all 0.15s",
      }}
    >
      {label}
      <span
        style={{
          fontSize: "10px",
          opacity: 0.8,
        }}
      >
        {count}
      </span>
    </button>
  );
}
