import { useMemo } from "react";
import type { DashboardData, AgemonProfile } from "../../engine/types.js";
import { TrainerCard } from "./TrainerCard.js";
import { AgemonList } from "./AgemonList.js";

interface PartyTabProps {
  data: DashboardData;
  onSelectAgemon: (profile: AgemonProfile) => void;
}

function getProjectName(projectPath: string): string {
  // Extract folder name from path (e.g. "/Users/foo/my-project" → "my-project")
  const parts = projectPath.replace(/\/+$/, "").split("/");
  return parts[parts.length - 1] || "project";
}

export function PartyTab({ data, onSelectAgemon }: PartyTabProps) {
  const projectName = getProjectName(data.scan.projectPath);

  const allAgemon = useMemo(
    () => [...data.trainer.globalAgemon, ...data.trainer.projectAgemon],
    [data],
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      <TrainerCard trainer={data.trainer} />

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
          Party ({allAgemon.length})
        </h3>
        <AgemonList
          agemon={allAgemon}
          projectName={projectName}
          onSelect={onSelectAgemon}
        />
      </section>
    </div>
  );
}
