import type { AgemonProfile } from "../../engine/types.js";
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
};

function getEquipmentEmoji(name: string): string {
  const lower = name.toLowerCase();
  for (const [key, emoji] of Object.entries(EQUIPMENT_EMOJI)) {
    if (lower.includes(key)) return emoji;
  }
  return "\u{1F527}";
}

export function AgemonDetail({ profile, onBack }: AgemonDetailProps) {
  const xpProgress = profile.evolution.nextLevelXp > 0
    ? (profile.xp / profile.evolution.nextLevelXp) * 100
    : 100;

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
        {/* Row 1: Name + Level badge */}
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

        {/* Row 2: Subtitle */}
        <div
          style={{
            fontSize: "12px",
            color: "var(--text-muted, #9e9eae)",
            fontFamily: "var(--font-mono, monospace)",
            marginTop: "4px",
          }}
        >
          &ldquo;{profile.evolution.title}&rdquo; &mdash; Stage: {profile.evolution.stage}
        </div>

        {/* Row 3: Type badge pills */}
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

        {/* Row 4: Sprite + RadarChart side by side */}
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

        {/* Row 5: XP Bar */}
        <div style={{ marginTop: "16px" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: "11px",
              fontFamily: "var(--font-mono, monospace)",
              color: "var(--text-secondary, #636e72)",
              marginBottom: "4px",
            }}
          >
            <span>XP: {profile.xp} / {profile.evolution.nextLevelXp}</span>
            <span>Next Lv.{profile.level + 1}</span>
          </div>
          <div
            style={{
              width: "100%",
              height: "8px",
              background: "var(--bg-secondary, #f8f8fa)",
              borderRadius: "4px",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${Math.min(xpProgress, 100)}%`,
                height: "100%",
                background: "linear-gradient(90deg, #1ABC9C, #4A90D9)",
                borderRadius: "4px",
                transition: "width 0.3s ease",
              }}
            />
          </div>
        </div>
      </div>

      {/* Moves Section */}
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
            tap to expand
          </span>
        </div>
        <MoveList moves={profile.moves} />
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

      {/* Evolution Section */}
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
    </div>
  );
}
