import type { EvolutionInfo, EvolutionStage } from "../../engine/types.js";

interface EvolutionProps {
  evolution: EvolutionInfo;
}

const STAGES: { stage: EvolutionStage | "egg"; label: string; emoji: string }[] = [
  { stage: "egg", label: "Egg", emoji: "\u{1F95A}" },
  { stage: "baby", label: "Baby", emoji: "\u{1F423}" },
  { stage: "child", label: "Child", emoji: "\u{1F47E}" },
  { stage: "teen", label: "Teen", emoji: "\u{1F525}" },
  { stage: "adult", label: "Adult", emoji: "\u2694" },
  { stage: "ultimate", label: "Ultimate", emoji: "\u{1F451}" },
];

export function Evolution({ evolution }: EvolutionProps) {
  const currentIdx = STAGES.findIndex((s) => s.stage === evolution.stage);

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
      {STAGES.map(({ stage, label, emoji }, idx) => {
        const isCurrent = idx === currentIdx;
        const isPast = idx < currentIdx;
        const isFuture = idx > currentIdx;

        return (
          <div key={stage} style={{ display: "flex", alignItems: "center" }}>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "2px",
                padding: "6px 10px",
                borderRadius: "var(--border-radius, 6px)",
                border: isCurrent
                  ? "2px solid var(--color-brand, #e74c3c)"
                  : "1px solid var(--border-color, #e0e0e8)",
                background: isCurrent
                  ? "var(--bg-card, #fff)"
                  : isPast
                    ? "var(--bg-card, #fff)"
                    : "var(--bg-secondary, #f8f8fa)",
                opacity: isFuture ? 0.4 : 1,
                minWidth: "48px",
              }}
            >
              <span style={{ fontSize: "16px" }}>{emoji}</span>
              <span
                style={{
                  fontSize: "9px",
                  fontWeight: isCurrent ? 700 : 400,
                  fontFamily: "var(--font-mono, monospace)",
                  color: isCurrent
                    ? "var(--color-brand, #e74c3c)"
                    : isPast
                      ? "var(--text-primary, #1a1a2e)"
                      : "var(--text-muted, #9e9eae)",
                }}
              >
                {label}
              </span>
            </div>
            {idx < STAGES.length - 1 && (
              <div
                style={{
                  width: "12px",
                  height: "2px",
                  background: isPast
                    ? "var(--color-active, #27ae60)"
                    : "var(--border-color, #e0e0e8)",
                  marginLeft: "2px",
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
