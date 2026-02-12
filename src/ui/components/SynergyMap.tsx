import { useMemo } from "react";
import type {
  AgemonProfile,
  AgemonRelationship,
  InteractionKind,
  MoveInteraction,
  RelationshipType,
} from "../../engine/types.js";
import { PixelMonster } from "./PixelMonster.js";

interface SynergyMapProps {
  profiles: AgemonProfile[];
  relationships: AgemonRelationship[];
  onSelectAgemon?: (profile: AgemonProfile) => void;
}

const EDGE_COLORS: Record<RelationshipType, string> = {
  dependency: "#E74C3C",
  synergy: "#27AE60",
  trigger: "#F39C12",
  "shared-scope": "#9B9BB0",
};

const RELATION_LABELS: Record<RelationshipType, string> = {
  dependency: "DEPENDENCY",
  synergy: "SYNERGY",
  trigger: "TRIGGER",
  "shared-scope": "SHARED SCOPE",
};

const KIND_BADGE: Record<InteractionKind, { bg: string; color: string; label: string }> = {
  "trigger-chain": { bg: "#E74C3C", color: "#fff", label: "trigger-chain" },
  "tool-dependency": { bg: "#3498DB", color: "#fff", label: "tool-dependency" },
  "shared-knowledge": { bg: "#27AE60", color: "#fff", label: "shared-knowledge" },
};

export function SynergyMap({
  profiles,
  relationships,
  onSelectAgemon,
}: SynergyMapProps) {
  const profileMap = useMemo(
    () => new Map(profiles.map((p) => [p.id, p])),
    [profiles],
  );

  // Filter to inter-agemon, deduplicate bidirectional pairs (A↔B shown once)
  const interRelationships = useMemo(() => {
    const seen = new Set<string>();
    return relationships.filter((r) => {
      if (r.from === r.to) return false;
      // For bidirectional types, normalize key so A|B and B|A collapse
      const pairKey =
        r.type === "shared-scope"
          ? [r.from, r.to].sort().join("|") + "|" + r.type
          : `${r.from}|${r.to}|${r.type}`;
      if (seen.has(pairKey)) return false;
      seen.add(pairKey);
      // For shared-scope, also merge interactions from the reverse
      if (r.type === "shared-scope") {
        const reverse = relationships.find(
          (rev) => rev.from === r.to && rev.to === r.from && rev.type === r.type,
        );
        if (reverse && reverse.interactions.length > r.interactions.length) {
          r.interactions = reverse.interactions;
        }
      }
      return true;
    });
  }, [relationships]);

  // Edge case: not enough Agemon
  if (profiles.length <= 1) {
    return (
      <div
        style={{
          padding: "40px 20px",
          textAlign: "center",
          color: "var(--text-muted, #718096)",
          fontFamily: "var(--font-pixel, monospace)",
          fontSize: "12px",
          lineHeight: "1.8",
        }}
      >
        <div style={{ fontSize: "32px", marginBottom: "12px" }}>
          {"\u{1F517}"}
        </div>
        Add more commands or MCP servers to see relationships
      </div>
    );
  }

  return (
    <div style={{ width: "100%" }}>
      {/* Summary */}
      <div
        style={{
          textAlign: "center",
          marginBottom: "16px",
          fontSize: "10px",
          color: "var(--text-muted, #718096)",
          fontFamily: "var(--font-mono, monospace)",
        }}
      >
        {profiles.length} Agemon
        {interRelationships.length > 0 &&
          ` · ${interRelationships.length} connection${interRelationships.length !== 1 ? "s" : ""}`}
      </div>

      {/* Relationship Cards */}
      {interRelationships.length === 0 ? (
        <div
          style={{
            padding: "20px",
            textAlign: "center",
            color: "var(--text-muted, #718096)",
            fontFamily: "var(--font-pixel, monospace)",
            fontSize: "11px",
            lineHeight: "1.8",
            border: "1px dashed var(--border-color, #e0e0e8)",
            borderRadius: "var(--border-radius, 6px)",
          }}
        >
          Add hooks or cross-references between commands to see connections
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {interRelationships.map((rel, i) => {
            const fromProfile = profileMap.get(rel.from);
            const toProfile = profileMap.get(rel.to);
            if (!fromProfile || !toProfile) return null;

            return (
              <RelationshipCard
                key={`${rel.from}|${rel.to}|${rel.type}|${i}`}
                relationship={rel}
                fromProfile={fromProfile}
                toProfile={toProfile}
                onSelectAgemon={onSelectAgemon}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Relationship Card ───

interface RelationshipCardProps {
  relationship: AgemonRelationship;
  fromProfile: AgemonProfile;
  toProfile: AgemonProfile;
  onSelectAgemon?: (profile: AgemonProfile) => void;
}

function RelationshipCard({
  relationship,
  fromProfile,
  toProfile,
  onSelectAgemon,
}: RelationshipCardProps) {
  const borderColor = EDGE_COLORS[relationship.type];
  const label = RELATION_LABELS[relationship.type];
  const isBidirectional = relationship.type === "shared-scope";

  return (
    <div
      style={{
        border: "1px solid var(--border-color, #e0e0e8)",
        borderLeft: `4px solid ${borderColor}`,
        borderRadius: "var(--border-radius, 6px)",
        background: "var(--bg-card, #fff)",
        boxShadow: "var(--shadow-sm)",
        overflow: "hidden",
      }}
    >
      {/* Header: type badge + strength */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "8px 12px",
          borderBottom: "1px solid var(--border-color, #e0e0e8)",
          background: "var(--bg-secondary, #f8f8fa)",
        }}
      >
        <span
          style={{
            background: borderColor,
            color: "#fff",
            padding: "2px 8px",
            borderRadius: "3px",
            fontSize: "9px",
            fontWeight: "bold",
            fontFamily: "var(--font-mono, monospace)",
            letterSpacing: "1px",
          }}
        >
          {label}
        </span>
        <span
          style={{
            fontSize: "10px",
            fontFamily: "var(--font-mono, monospace)",
            color: "var(--text-muted, #718096)",
          }}
        >
          STR {relationship.strength}
        </span>
      </div>

      {/* Agemon pair with sprites */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "12px",
          padding: "12px 16px",
        }}
      >
        {/* From Agemon */}
        <AgemonMini
          profile={fromProfile}
          onClick={() => onSelectAgemon?.(fromProfile)}
        />

        {/* Arrow */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "2px",
            flexShrink: 0,
          }}
        >
          <div
            style={{
              width: "40px",
              height: "2px",
              background: borderColor,
              position: "relative",
            }}
          >
            {/* Arrow head(s) */}
            {isBidirectional ? (
              <>
                <span
                  style={{
                    position: "absolute",
                    left: "-4px",
                    top: "-3px",
                    width: 0,
                    height: 0,
                    borderTop: "4px solid transparent",
                    borderBottom: "4px solid transparent",
                    borderRight: `6px solid ${borderColor}`,
                  }}
                />
                <span
                  style={{
                    position: "absolute",
                    right: "-4px",
                    top: "-3px",
                    width: 0,
                    height: 0,
                    borderTop: "4px solid transparent",
                    borderBottom: "4px solid transparent",
                    borderLeft: `6px solid ${borderColor}`,
                  }}
                />
              </>
            ) : (
              <span
                style={{
                  position: "absolute",
                  right: "-4px",
                  top: "-3px",
                  width: 0,
                  height: 0,
                  borderTop: "4px solid transparent",
                  borderBottom: "4px solid transparent",
                  borderLeft: `6px solid ${borderColor}`,
                }}
              />
            )}
          </div>
        </div>

        {/* To Agemon */}
        <AgemonMini
          profile={toProfile}
          onClick={() => onSelectAgemon?.(toProfile)}
        />
      </div>

      {/* Reason */}
      <div
        style={{
          padding: "0 12px 8px",
          fontSize: "10px",
          color: "var(--text-muted, #718096)",
          fontStyle: "italic",
          textAlign: "center",
        }}
      >
        {relationship.reason}
      </div>

      {/* Move Interactions */}
      {relationship.interactions.length > 0 && (
        <div
          style={{
            borderTop: "1px solid var(--border-color, #e0e0e8)",
            padding: "8px 12px",
            display: "flex",
            flexDirection: "column",
            gap: "6px",
          }}
        >
          {relationship.interactions.map((interaction, i) => (
            <InteractionRow
              key={i}
              interaction={interaction}
              fromProfile={fromProfile}
              toProfile={toProfile}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Mini Agemon (sprite + name) ───

function AgemonMini({
  profile,
  onClick,
}: {
  profile: AgemonProfile;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "4px",
        cursor: onClick ? "pointer" : "default",
        minWidth: "80px",
      }}
    >
      <div style={{ width: "48px", height: "48px", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <PixelMonster profile={profile} size="mini" />
      </div>
      <span
        style={{
          fontSize: "11px",
          fontWeight: 700,
          fontFamily: "var(--font-pixel, monospace)",
          color: "var(--text-primary, #1a1a2e)",
          textAlign: "center",
          lineHeight: "1.4",
        }}
      >
        {profile.displayName}
      </span>
      <span
        style={{
          fontSize: "9px",
          fontFamily: "var(--font-mono, monospace)",
          color: "var(--text-muted, #718096)",
        }}
      >
        Lv.{profile.level}
      </span>
    </div>
  );
}

// ─── Interaction Row ───

function InteractionRow({
  interaction,
  fromProfile,
  toProfile,
}: {
  interaction: MoveInteraction;
  fromProfile: AgemonProfile;
  toProfile: AgemonProfile;
}) {
  const fromMove = fromProfile.moves[interaction.fromMoveIndex];
  const toMove = toProfile.moves[interaction.toMoveIndex];
  const kindStyle = KIND_BADGE[interaction.kind];

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "3px",
        fontSize: "10px",
        color: "var(--text-secondary, #636e72)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
        <span
          style={{
            background: kindStyle.bg,
            color: kindStyle.color,
            padding: "1px 6px",
            borderRadius: "2px",
            fontSize: "8px",
            fontWeight: "bold",
            fontFamily: "var(--font-mono, monospace)",
            flexShrink: 0,
          }}
        >
          {kindStyle.label}
        </span>
        <span style={{ fontFamily: "var(--font-mono, monospace)" }}>
          {fromMove?.name ?? `move[${interaction.fromMoveIndex}]`}
          {" \u2192 "}
          {toMove?.name ?? `move[${interaction.toMoveIndex}]`}
        </span>
      </div>
      <div style={{ fontStyle: "italic", paddingLeft: "4px" }}>
        {interaction.description}
      </div>
      <div
        style={{
          fontSize: "9px",
          color: "var(--text-muted, #718096)",
          paddingLeft: "4px",
          display: "flex",
          alignItems: "flex-start",
          gap: "4px",
        }}
      >
        <span style={{ flexShrink: 0 }}>{"\uD83D\uDCA1"}</span>
        <span>{interaction.workflowOutcome}</span>
      </div>
    </div>
  );
}
