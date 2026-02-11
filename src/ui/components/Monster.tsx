import type { EvolutionStage } from "../../engine/types.js";

interface MonsterProps {
  stage: EvolutionStage;
}

export function Monster({ stage }: MonsterProps) {
  // TODO: Implement SVG monster for each evolution stage
  return (
    <div className="flex items-center justify-center w-64 h-64">
      <span className="text-6xl">{stageEmoji(stage)}</span>
    </div>
  );
}

function stageEmoji(stage: EvolutionStage): string {
  switch (stage) {
    case "baby":
      return "🐣";
    case "child":
      return "🐲";
    case "teen":
      return "🔥";
    case "adult":
      return "⚔️";
    case "ultimate":
      return "👑";
  }
}
