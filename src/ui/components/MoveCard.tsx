import { useState } from "react";
import type { Move, StatName } from "../../engine/types.js";
import { TYPE_COLORS } from "../../engine/type-system.js";

interface MoveCardProps {
  move: Move;
}

const STAT_TYPE_MAP: Record<StatName, string> = {
  knowledge: "scholar",
  arsenal: "arsenal",
  reflex: "sentinel",
  mastery: "artisan",
  guard: "guardian",
  synergy: "catalyst",
};

const TYPE_LABELS: Record<StatName, string> = {
  knowledge: "KNW",
  arsenal: "ARS",
  reflex: "RFX",
  mastery: "MST",
  guard: "GRD",
  synergy: "SYN",
};

const CATEGORY_SOURCE: Record<string, { bg: string; color: string; label: string }> = {
  attack: { bg: "#2c3e50", color: "#fff", label: "CMD" },
  support: { bg: "#27ae60", color: "#fff", label: "MCP" },
  reflex: { bg: "#F39C12", color: "#fff", label: "Hook" },
  passive: { bg: "#9B59B6", color: "#fff", label: "CLAUDE.md" },
  guard: { bg: "#4A90D9", color: "#fff", label: "Perm" },
};

export function MoveCard({ move }: MoveCardProps) {
  const [expanded, setExpanded] = useState(false);
  const agemonType = STAT_TYPE_MAP[move.type] as keyof typeof TYPE_COLORS;
  const typeColor = TYPE_COLORS[agemonType]?.primary ?? "#999";
  const typeLabel = TYPE_LABELS[move.type] ?? move.type.toUpperCase().slice(0, 3);

  return (
    <div
      onClick={() => setExpanded(!expanded)}
      style={{
        border: `1px solid var(--border-color, #e0e0e8)`,
        borderLeft: `4px solid ${typeColor}`,
        borderRadius: "var(--border-radius, 6px)",
        padding: "10px 12px",
        cursor: "pointer",
        background: expanded ? "var(--bg-secondary, #f8f8fa)" : "var(--bg-card, #fff)",
        transition: "background 0.15s, box-shadow 0.15s",
        boxShadow: expanded ? "var(--shadow-md)" : "var(--shadow-sm)",
      }}
    >
      {/* Header row */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "8px",
        }}
      >
        <span
          style={{
            fontWeight: 700,
            color: "var(--text-primary, #1a1a2e)",
            fontSize: "13px",
          }}
        >
          {move.name}
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: "6px", flexShrink: 0 }}>
          <span
            style={{
              border: `1px solid ${typeColor}`,
              color: typeColor,
              padding: "1px 6px",
              borderRadius: "10px",
              fontSize: "10px",
              fontWeight: "bold",
              fontFamily: "var(--font-mono, monospace)",
            }}
          >
            {typeLabel}
          </span>
          <span
            style={{
              fontSize: "11px",
              fontFamily: "var(--font-mono, monospace)",
              color: "var(--text-muted, #9e9eae)",
            }}
          >
            PWR {move.power}
          </span>
          <span
            style={{
              fontSize: "11px",
              color: "var(--text-muted, #9e9eae)",
              transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
              transition: "transform 0.15s",
            }}
          >
            {"\u25BC"}
          </span>
        </div>
      </div>

      {/* Description always visible */}
      <div
        style={{
          fontSize: "11px",
          color: "var(--text-secondary, #636e72)",
          marginTop: "4px",
          fontStyle: "italic",
        }}
      >
        &ldquo;{move.description}&rdquo;
      </div>

      {/* Expanded details */}
      {expanded && (
        <div
          style={{
            marginTop: "10px",
            paddingTop: "10px",
            borderTop: "1px solid var(--border-color, #e0e0e8)",
            fontSize: "11px",
            color: "var(--text-secondary, #636e72)",
            display: "flex",
            flexDirection: "column",
            gap: "6px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            {(() => {
              const style = CATEGORY_SOURCE[move.category] ?? CATEGORY_SOURCE.attack;
              return (
                <span
                  style={{
                    background: style.bg,
                    color: style.color,
                    padding: "2px 6px",
                    borderRadius: "3px",
                    fontSize: "9px",
                    fontWeight: "bold",
                    fontFamily: "var(--font-mono, monospace)",
                  }}
                >
                  {style.label}
                </span>
              );
            })()}
            <span
              style={{
                fontSize: "10px",
                color: "var(--text-muted, #9e9eae)",
                fontFamily: "var(--font-mono, monospace)",
              }}
            >
              {move.source}
            </span>
          </div>

          {move.capabilities.length > 0 && (
            <div>
              <strong style={{ fontSize: "10px" }}>Capabilities:</strong>
              <ul
                style={{
                  margin: "4px 0 0 0",
                  paddingLeft: "16px",
                  listStyle: "disc",
                }}
              >
                {move.capabilities.map((cap, i) => (
                  <li key={i} style={{ fontSize: "10px", marginBottom: "2px" }}>
                    {cap}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                fontSize: "10px",
              }}
            >
              <span
                style={{
                  width: "6px",
                  height: "6px",
                  borderRadius: "50%",
                  background: move.status === "active" ? "#27ae60" : "#9e9eae",
                }}
              />
              {move.status === "active" ? "ACTIVE" : "INACTIVE"}
            </span>
            <span
              style={{
                fontSize: "10px",
                background: "var(--bg-card, #fff)",
                border: "1px solid var(--border-color, #e0e0e8)",
                padding: "1px 6px",
                borderRadius: "3px",
                fontFamily: "var(--font-mono, monospace)",
              }}
            >
              {move.scope}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
