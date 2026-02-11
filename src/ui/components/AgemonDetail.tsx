import type { AgemonProfile } from "../../engine/types.js";
import { getTypeLabel } from "../../engine/type-system.js";
import { PixelMonster } from "./PixelMonster.js";
import { RadarChart } from "./RadarChart.js";
import { MoveList } from "./MoveList.js";
import { Evolution } from "./Evolution.js";

interface AgemonDetailProps {
  profile: AgemonProfile;
  onBack: () => void;
}

export function AgemonDetail({ profile, onBack }: AgemonDetailProps) {
  const TYPE_COLORS: Record<string, string> = {
    scholar: "#4A90D9",
    arsenal: "#E74C3C",
    sentinel: "#F39C12",
    artisan: "#9B59B6",
    guardian: "#27AE60",
    catalyst: "#1ABC9C",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
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
        }}
      >
        Back
      </button>

      {/* Header card */}
      <div
        style={{
          background: "var(--bg-card, #fff)",
          border: "1px solid var(--border-color, #e0e0e8)",
          borderRadius: "var(--border-radius, 6px)",
          padding: "24px",
          boxShadow: "var(--shadow-sm)",
          display: "flex",
          gap: "24px",
          alignItems: "flex-start",
        }}
      >
        {/* Sprite */}
        <div style={{ flexShrink: 0 }}>
          <PixelMonster profile={profile} size="full" />
        </div>

        {/* Info */}
        <div style={{ flex: 1 }}>
          <h2
            style={{
              margin: 0,
              fontSize: "24px",
              fontWeight: 700,
              color: "var(--text-primary, #1a1a2e)",
            }}
          >
            {profile.displayName}
          </h2>
          <div
            style={{
              fontSize: "13px",
              color: "var(--text-muted, #9e9eae)",
              fontFamily: "var(--font-mono, monospace)",
              marginTop: "4px",
            }}
          >
            {profile.source === "command" ? "CMD" : "MCP"} / {profile.name}
          </div>

          <div style={{ display: "flex", gap: "6px", marginTop: "8px" }}>
            {profile.types.map((type) => (
              <span
                key={type}
                style={{
                  background: TYPE_COLORS[type] ?? "#999",
                  color: "#fff",
                  padding: "3px 10px",
                  borderRadius: "4px",
                  fontSize: "12px",
                  fontWeight: "bold",
                }}
              >
                {getTypeLabel(type)}
              </span>
            ))}
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "8px",
              marginTop: "12px",
              fontSize: "13px",
              fontFamily: "var(--font-mono, monospace)",
            }}
          >
            <div style={{ color: "var(--text-secondary, #636e72)" }}>
              Level: <strong style={{ color: "var(--text-primary, #1a1a2e)" }}>{profile.level}</strong>
            </div>
            <div style={{ color: "var(--text-secondary, #636e72)" }}>
              Stage: <strong style={{ color: "var(--text-primary, #1a1a2e)" }}>{profile.evolution.stage}</strong>
            </div>
            <div style={{ color: "var(--text-secondary, #636e72)" }}>
              XP: <strong style={{ color: "var(--text-primary, #1a1a2e)" }}>{profile.xp}/{profile.evolution.nextLevelXp}</strong>
            </div>
            <div style={{ color: "var(--text-secondary, #636e72)" }}>
              Moves: <strong style={{ color: "var(--text-primary, #1a1a2e)" }}>{profile.moves.length}</strong>
            </div>
          </div>
        </div>

        {/* Radar Chart */}
        <div style={{ flexShrink: 0 }}>
          <RadarChart stats={profile.stats} types={profile.types} />
        </div>
      </div>

      {/* Evolution */}
      <div
        style={{
          background: "var(--bg-card, #fff)",
          border: "1px solid var(--border-color, #e0e0e8)",
          borderRadius: "var(--border-radius, 6px)",
          padding: "16px",
        }}
      >
        <Evolution evolution={profile.evolution} />
      </div>

      {/* Moves */}
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
            fontSize: "16px",
            fontWeight: 700,
            color: "var(--text-primary, #1a1a2e)",
          }}
        >
          Moves ({profile.moves.length})
        </h3>
        <MoveList moves={profile.moves} />
      </div>

      {/* Equipment */}
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
              fontSize: "16px",
              fontWeight: 700,
              color: "var(--text-primary, #1a1a2e)",
            }}
          >
            Equipment
          </h3>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
            {profile.equipment.map((eq) => (
              <div
                key={eq.name}
                style={{
                  padding: "6px 12px",
                  background: "var(--bg-secondary, #f8f8fa)",
                  borderRadius: "var(--border-radius, 6px)",
                  fontSize: "13px",
                  fontFamily: "var(--font-mono, monospace)",
                }}
              >
                {eq.name}{" "}
                <span style={{ color: "var(--text-muted, #9e9eae)", fontSize: "11px" }}>
                  ({eq.type})
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
