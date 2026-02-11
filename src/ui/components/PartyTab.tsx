import type { DashboardData, AgemonProfile } from "../../engine/types.js";
import { TrainerCard } from "./TrainerCard.js";
import { AgemonList } from "./AgemonList.js";

interface PartyTabProps {
  data: DashboardData;
  onSelectAgemon: (profile: AgemonProfile) => void;
}

export function PartyTab({ data, onSelectAgemon }: PartyTabProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      <TrainerCard trainer={data.trainer} />

      {/* Global Agemon */}
      {data.trainer.globalAgemon.length > 0 && (
        <section>
          <h3
            style={{
              fontSize: "12px",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.5px",
              color: "var(--text-muted, #9e9eae)",
              marginBottom: "8px",
            }}
          >
            Global ({data.trainer.globalAgemon.length})
          </h3>
          <AgemonList
            agemon={data.trainer.globalAgemon}
            scope="global"
            onSelect={onSelectAgemon}
          />
        </section>
      )}

      {/* Project Agemon */}
      <section>
        <h3
          style={{
            fontSize: "12px",
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.5px",
            color: "var(--text-muted, #9e9eae)",
            marginBottom: "8px",
          }}
        >
          Project ({data.trainer.projectAgemon.length})
        </h3>
        <AgemonList
          agemon={data.trainer.projectAgemon}
          scope="project"
          onSelect={onSelectAgemon}
        />
      </section>
    </div>
  );
}
