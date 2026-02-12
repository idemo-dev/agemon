import { useMemo } from "react";
import type { TrainerProfile, AgemonType } from "../../engine/types.js";
import { getTypeLabel } from "../../engine/type-system.js";

interface TrainerCardProps {
  trainer: TrainerProfile;
}

const TYPE_COLORS: Record<AgemonType, string> = {
  scholar: "#4A90D9",
  arsenal: "#E74C3C",
  sentinel: "#F39C12",
  artisan: "#9B59B6",
  guardian: "#27AE60",
  catalyst: "#1ABC9C",
};

export function TrainerCard({ trainer }: TrainerCardProps) {
  const allAgemon = useMemo(
    () => [...trainer.globalAgemon, ...trainer.projectAgemon],
    [trainer],
  );

  const strongest = useMemo(
    () =>
      allAgemon.length > 0
        ? allAgemon.reduce((a, b) => (a.level > b.level ? a : b))
        : null,
    [allAgemon],
  );

  const typeDistribution = useMemo(() => {
    const counts: Partial<Record<AgemonType, number>> = {};
    for (const a of allAgemon) {
      for (const t of a.types) {
        counts[t] = (counts[t] || 0) + 1;
      }
    }
    return Object.entries(counts)
      .sort(([, a], [, b]) => b - a)
      .map(([type, count]) => ({
        type: type as AgemonType,
        count,
        ratio: allAgemon.length > 0 ? count / allAgemon.length : 0,
      }));
  }, [allAgemon]);

  return (
    <div
      style={{
        background: "var(--bg-card, #fff)",
        border: "1px solid var(--border-color, #e0e0e8)",
        borderRadius: "var(--border-radius, 6px)",
        padding: "20px",
        boxShadow: "var(--shadow-sm)",
      }}
    >
      {/* Trainer identity row */}
      <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
        <div
          style={{
            width: "48px",
            height: "48px",
            borderRadius: "50%",
            background:
              "linear-gradient(135deg, var(--color-brand, #e74c3c), var(--color-gold, #f39c12))",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#fff",
            fontWeight: "bold",
            fontSize: "20px",
            flexShrink: 0,
          }}
        >
          {trainer.name.charAt(0).toUpperCase()}
        </div>
        <div style={{ flex: 1 }}>
          <h2
            style={{
              margin: 0,
              fontSize: "18px",
              fontWeight: 700,
              color: "var(--text-primary, #1a1a2e)",
            }}
          >
            {trainer.name}
          </h2>
          <div
            style={{
              fontSize: "13px",
              color: "var(--text-secondary, #636e72)",
              fontFamily: "var(--font-mono, monospace)",
            }}
          >
            Lv.{trainer.level}
          </div>
        </div>
        {strongest && (
          <div
            style={{
              textAlign: "right",
              fontSize: "10px",
              color: "var(--text-muted, #9e9eae)",
              fontFamily: "var(--font-mono, monospace)",
            }}
          >
            <div style={{ fontWeight: 600, color: "var(--text-secondary, #636e72)", fontSize: "11px" }}>
              {"\u2B50"} {strongest.displayName}
            </div>
            <div>Lv.{strongest.level} / {strongest.evolution.stage}</div>
          </div>
        )}
      </div>

      {/* Stats grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: "12px",
          marginTop: "16px",
        }}
      >
        <StatBadge label="Agemon" value={trainer.totalAgemon} />
        <StatBadge label="Moves" value={trainer.totalMoves} />
        <StatBadge label="Tools" value={trainer.totalEquipment} />
      </div>

      {/* Type distribution bar */}
      {typeDistribution.length > 0 && (
        <div style={{ marginTop: "14px" }}>
          <div
            style={{
              fontSize: "10px",
              color: "var(--text-muted, #9e9eae)",
              textTransform: "uppercase",
              letterSpacing: "0.5px",
              marginBottom: "6px",
            }}
          >
            Type Spectrum
          </div>
          <div
            style={{
              display: "flex",
              height: "6px",
              borderRadius: "3px",
              overflow: "hidden",
              gap: "1px",
            }}
          >
            {typeDistribution.map(({ type, ratio }) => (
              <div
                key={type}
                style={{
                  flex: ratio,
                  background: TYPE_COLORS[type],
                  minWidth: "4px",
                }}
                title={`${getTypeLabel(type)}: ${Math.round(ratio * 100)}%`}
              />
            ))}
          </div>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "8px",
              marginTop: "6px",
            }}
          >
            {typeDistribution.map(({ type, count }) => (
              <span
                key={type}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "3px",
                  fontSize: "10px",
                  color: "var(--text-secondary, #636e72)",
                  fontFamily: "var(--font-mono, monospace)",
                }}
              >
                <span
                  style={{
                    width: "6px",
                    height: "6px",
                    borderRadius: "50%",
                    background: TYPE_COLORS[type],
                    flexShrink: 0,
                  }}
                />
                {getTypeLabel(type)} {count}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StatBadge({ label, value }: { label: string; value: number }) {
  return (
    <div
      style={{
        textAlign: "center",
        padding: "8px",
        background: "var(--bg-secondary, #f8f8fa)",
        borderRadius: "var(--border-radius, 6px)",
      }}
    >
      <div
        style={{
          fontSize: "20px",
          fontWeight: 700,
          color: "var(--text-primary, #1a1a2e)",
          fontFamily: "var(--font-mono, monospace)",
        }}
      >
        {value}
      </div>
      <div
        style={{
          fontSize: "10px",
          color: "var(--text-muted, #9e9eae)",
          textTransform: "uppercase",
          letterSpacing: "0.5px",
        }}
      >
        {label}
      </div>
    </div>
  );
}
