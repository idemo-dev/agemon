import type { AgemonProfile, AgemonType } from "../../engine/types.js";
import { PixelMonster } from "./PixelMonster.js";
import { getTypeLabel } from "../../engine/type-system.js";

interface AgemonListProps {
  agemon: AgemonProfile[];
  projectName: string;
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

export function AgemonList({ agemon, projectName, onSelect }: AgemonListProps) {
  if (agemon.length === 0) {
    return (
      <div
        style={{
          padding: "12px",
          color: "var(--text-muted, #9e9eae)",
          fontSize: "13px",
        }}
      >
        No Agemon detected
      </div>
    );
  }

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
        gap: "10px",
      }}
    >
      {agemon.map((profile) => {
        const scopeLabel =
          profile.scope === "global" ? "Global" : projectName;
        const scopeIcon = profile.scope === "global" ? "\u{1F310}" : "\u{1F4C2}";

        return (
          <div
            key={profile.id}
            onClick={() => onSelect(profile)}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              padding: "16px 12px 12px",
              background: "var(--bg-card, #fff)",
              border: "1px solid var(--border-color, #e0e0e8)",
              borderRadius: "var(--border-radius, 6px)",
              cursor: "pointer",
              transition: "all 0.15s",
              position: "relative",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "var(--bg-hover, #f0f0f5)";
              e.currentTarget.style.transform = "translateY(-2px)";
              e.currentTarget.style.boxShadow =
                "0 4px 12px rgba(0, 0, 0, 0.08)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "var(--bg-card, #fff)";
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "none";
            }}
          >
            {/* Source badge - top left */}
            <span
              style={{
                position: "absolute",
                top: "8px",
                left: "8px",
                background:
                  profile.source === "command" ? "#2c3e50" : "#27ae60",
                color: "#fff",
                padding: "1px 5px",
                borderRadius: "3px",
                fontSize: "9px",
                fontWeight: "bold",
                fontFamily: "var(--font-mono, monospace)",
              }}
            >
              {profile.source === "command" ? "CMD" : "MCP"}
            </span>

            {/* Level badge - top right */}
            <span
              style={{
                position: "absolute",
                top: "8px",
                right: "8px",
                fontFamily: "var(--font-pixel, monospace)",
                fontSize: "12px",
                fontWeight: 700,
                color: "var(--text-secondary, #4a5568)",
              }}
            >
              Lv.{profile.level}
            </span>

            {/* Sprite */}
            <div
              style={{
                width: "80px",
                height: "80px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: "8px",
              }}
            >
              <PixelMonster profile={profile} size="mini" />
            </div>

            {/* Name */}
            <div
              style={{
                fontWeight: 600,
                fontSize: "13px",
                color: "var(--text-primary, #1a1a2e)",
                textAlign: "center",
                marginBottom: "6px",
                fontFamily: "var(--font-pixel, monospace)",
                lineHeight: "1.6",
                letterSpacing: "1px",
              }}
            >
              {profile.displayName}
            </div>

            {/* Type badges */}
            <div style={{ display: "flex", gap: "4px" }}>
              {profile.types.map((type) => (
                <span
                  key={type}
                  style={{
                    background: TYPE_COLORS[type],
                    color: "#fff",
                    padding: "3px 8px",
                    borderRadius: "3px",
                    fontSize: "11px",
                    fontWeight: "bold",
                    fontFamily: "var(--font-pixel, monospace)",
                    letterSpacing: "1px",
                  }}
                >
                  {getTypeLabel(type)}
                </span>
              ))}
            </div>

            {/* Scope indicator */}
            <div
              style={{
                fontSize: "9px",
                color: "var(--text-muted, #9e9eae)",
                fontFamily: "var(--font-mono, monospace)",
                marginTop: "6px",
                display: "flex",
                alignItems: "center",
                gap: "3px",
              }}
            >
              <span style={{ fontSize: "10px" }}>{scopeIcon}</span>
              {scopeLabel}
            </div>
          </div>
        );
      })}
    </div>
  );
}
