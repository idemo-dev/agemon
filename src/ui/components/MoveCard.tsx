import { useState } from "react";
import type { Move } from "../../engine/types.js";

interface MoveCardProps {
  move: Move;
}

const CATEGORY_COLORS: Record<Move["category"], string> = {
  attack: "#E74C3C",
  support: "#4A90D9",
  reflex: "#F39C12",
  passive: "#9B59B6",
  guard: "#27AE60",
};

const CATEGORY_LABELS: Record<Move["category"], string> = {
  attack: "ATK",
  support: "SUP",
  reflex: "RFX",
  passive: "PSV",
  guard: "GRD",
};

export function MoveCard({ move }: MoveCardProps) {
  const [expanded, setExpanded] = useState(false);
  const color = CATEGORY_COLORS[move.category];

  return (
    <div
      onClick={() => setExpanded(!expanded)}
      style={{
        border: `1px solid var(--border-color, #e0e0e8)`,
        borderRadius: "var(--border-radius, 6px)",
        padding: "8px 12px",
        cursor: "pointer",
        background: "var(--bg-card, #fff)",
        transition: "box-shadow 0.15s",
        boxShadow: expanded ? "var(--shadow-md)" : "var(--shadow-sm)",
      }}
    >
      {/* Collapsed view */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
        }}
      >
        <span
          style={{
            background: color,
            color: "#fff",
            padding: "2px 6px",
            borderRadius: "3px",
            fontSize: "10px",
            fontWeight: "bold",
            fontFamily: "var(--font-mono, monospace)",
          }}
        >
          {CATEGORY_LABELS[move.category]}
        </span>
        <span
          style={{
            flex: 1,
            fontWeight: 600,
            color: "var(--text-primary, #1a1a2e)",
            fontSize: "13px",
          }}
        >
          {move.name}
        </span>
        <span
          style={{
            fontSize: "11px",
            fontFamily: "var(--font-mono, monospace)",
            color: "var(--text-muted, #9e9eae)",
          }}
        >
          Pow:{move.power}
        </span>
      </div>

      {/* Flavor text always visible */}
      <div
        style={{
          fontSize: "11px",
          color: "var(--text-secondary, #636e72)",
          marginTop: "4px",
          fontStyle: "italic",
        }}
      >
        {move.description}
      </div>

      {/* Expanded view */}
      {expanded && (
        <div
          style={{
            marginTop: "8px",
            paddingTop: "8px",
            borderTop: "1px solid var(--border-color, #e0e0e8)",
            fontSize: "11px",
            color: "var(--text-secondary, #636e72)",
          }}
        >
          <div>
            <strong>Source:</strong> {move.source}
          </div>
          <div>
            <strong>Scope:</strong> {move.scope}
          </div>
          {move.capabilities.length > 0 && (
            <div>
              <strong>Capabilities:</strong>{" "}
              {move.capabilities.join(", ")}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
