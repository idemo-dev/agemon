import type { AgemonProfile, AgemonType } from "../../engine/types.js";
import { PixelMonster } from "./PixelMonster.js";
import { getTypeLabel } from "../../engine/type-system.js";

interface AgemonListProps {
  agemon: AgemonProfile[];
  scope: "global" | "project";
  onSelect: (profile: AgemonProfile) => void;
}

const TYPE_COLORS: Record<AgemonType, string> = {
  scholar: "#4A90D9",
  arsenal: "#E74C3C",
  sentinel: "#F39C12",
  artisan: "#9B59B6",
  guardian: "#27AE60",
  catalyst: "#1ABC9C",
};

export function AgemonList({ agemon, scope, onSelect }: AgemonListProps) {
  if (agemon.length === 0) {
    return (
      <div style={{ padding: "12px", color: "var(--text-muted, #9e9eae)", fontSize: "13px" }}>
        No {scope} Agemon detected
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
      {agemon.map((profile) => (
        <div
          key={profile.id}
          onClick={() => onSelect(profile)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            padding: "10px 12px",
            background: "var(--bg-card, #fff)",
            border: "1px solid var(--border-color, #e0e0e8)",
            borderRadius: "var(--border-radius, 6px)",
            cursor: "pointer",
            transition: "background 0.15s",
          }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.background = "var(--bg-hover, #f0f0f5)")
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.background = "var(--bg-card, #fff)")
          }
        >
          <div
            style={{
              width: "64px",
              height: "64px",
              flexShrink: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <PixelMonster profile={profile} size="mini" />
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontWeight: 600,
                fontSize: "14px",
                color: "var(--text-primary, #1a1a2e)",
              }}
            >
              {profile.displayName}
            </div>
            <div
              style={{
                fontSize: "11px",
                color: "var(--text-muted, #9e9eae)",
                fontFamily: "var(--font-mono, monospace)",
              }}
            >
              {profile.source === "command" ? "CMD" : "MCP"} / {profile.name}
            </div>
          </div>

          <div style={{ display: "flex", gap: "4px", flexShrink: 0 }}>
            {profile.types.map((type) => (
              <span
                key={type}
                style={{
                  background: TYPE_COLORS[type],
                  color: "#fff",
                  padding: "2px 6px",
                  borderRadius: "3px",
                  fontSize: "10px",
                  fontWeight: "bold",
                }}
              >
                {getTypeLabel(type)}
              </span>
            ))}
          </div>

          <div
            style={{
              fontFamily: "var(--font-mono, monospace)",
              fontSize: "13px",
              color: "var(--text-secondary, #636e72)",
              flexShrink: 0,
            }}
          >
            Lv.{profile.level}
          </div>
        </div>
      ))}
    </div>
  );
}
