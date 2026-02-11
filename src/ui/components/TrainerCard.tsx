import type { TrainerProfile } from "../../engine/types.js";

interface TrainerCardProps {
  trainer: TrainerProfile;
}

export function TrainerCard({ trainer }: TrainerCardProps) {
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
      <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
        <div
          style={{
            width: "48px",
            height: "48px",
            borderRadius: "50%",
            background: "linear-gradient(135deg, var(--color-brand, #e74c3c), var(--color-gold, #f39c12))",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#fff",
            fontWeight: "bold",
            fontSize: "20px",
          }}
        >
          {trainer.name.charAt(0).toUpperCase()}
        </div>
        <div>
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
      </div>

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
        <StatBadge label="Equip" value={trainer.totalEquipment} />
      </div>
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
