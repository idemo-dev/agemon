import type { EvolutionInfo, EvolutionStage } from "../../engine/types.js";

interface EvolutionProps {
  evolution: EvolutionInfo;
}

const STAGES: { stage: EvolutionStage; label: string }[] = [
  { stage: "baby", label: "Baby" },
  { stage: "child", label: "Child" },
  { stage: "teen", label: "Teen" },
  { stage: "adult", label: "Adult" },
  { stage: "ultimate", label: "Ultimate" },
];

export function Evolution({ evolution }: EvolutionProps) {
  const currentIdx = STAGES.findIndex((s) => s.stage === evolution.stage);

  return (
    <div>
      <h3
        style={{
          fontSize: "12px",
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: "0.5px",
          color: "var(--text-muted, #9e9eae)",
          marginBottom: "12px",
        }}
      >
        Evolution Path
      </h3>
      <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
        {STAGES.map(({ stage, label }, idx) => (
          <div key={stage} style={{ display: "flex", alignItems: "center" }}>
            <div
              style={{
                padding: "6px 12px",
                borderRadius: "var(--border-radius, 6px)",
                fontSize: "11px",
                fontWeight: idx === currentIdx ? 700 : 400,
                fontFamily: "var(--font-mono, monospace)",
                background:
                  idx === currentIdx
                    ? "var(--color-brand, #e74c3c)"
                    : idx < currentIdx
                      ? "var(--color-active, #27ae60)"
                      : "var(--bg-secondary, #f8f8fa)",
                color:
                  idx <= currentIdx ? "#fff" : "var(--text-muted, #9e9eae)",
              }}
            >
              {label}
            </div>
            {idx < STAGES.length - 1 && (
              <div
                style={{
                  width: "12px",
                  height: "2px",
                  background:
                    idx < currentIdx
                      ? "var(--color-active, #27ae60)"
                      : "var(--border-color, #e0e0e8)",
                }}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
