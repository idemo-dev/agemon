import { Command } from "commander";
import { scanAndBuild } from "./scanner.js";
import { startServer } from "./server.js";
import { getTypeLabel } from "../engine/type-system.js";
import type { AgemonProfile, DashboardData } from "../engine/types.js";

const program = new Command();

program
  .name("agemon")
  .description("Visualize, Grow, and Evolve your AI Dev Environment")
  .version("0.1.0");

// Default command: scan + open dashboard
program
  .option("--json", "Output raw data as JSON")
  .option("--port <port>", "Custom port for dashboard", "3333")
  .action(async (options) => {
    console.log("  Scanning your AI dev environment...\n");
    const dashboard = await scanAndBuild();

    if (options.json) {
      console.log(JSON.stringify(dashboard, null, 2));
      return;
    }

    printSummary(dashboard);

    // Start server and open browser
    const port = parseInt(options.port);
    await startServer(dashboard, port);
  });

program
  .command("scan")
  .description("Scan and print summary to terminal")
  .action(async () => {
    console.log("  Scanning your AI dev environment...\n");
    const dashboard = await scanAndBuild();
    printSummary(dashboard);
  });

program
  .command("list")
  .description("List all detected Agemon")
  .action(async () => {
    const dashboard = await scanAndBuild();
    printAgemonList(dashboard);
  });

program
  .command("show <name>")
  .description("Show details for a specific Agemon")
  .action(async (name: string) => {
    const dashboard = await scanAndBuild();
    const all = [...dashboard.trainer.globalAgemon, ...dashboard.trainer.projectAgemon];
    const profile = all.find(
      (a) => a.name === name || a.id === name || a.displayName === name,
    );
    if (!profile) {
      console.log(`  Agemon "${name}" not found.`);
      console.log(
        `  Available: ${all.map((a) => a.name).join(", ") || "none"}`,
      );
      return;
    }
    printAgemonDetail(profile);
  });

program
  .command("share [name]")
  .description("Generate share card PNG")
  .option("-o, --output <path>", "Output file path")
  .action(async (name: string | undefined, options: { output?: string }) => {
    const dashboard = await scanAndBuild();
    const { renderTrainerCard, renderAgemonCard } = await import(
      "../share/card-renderer.js"
    );

    let pngBuffer: Buffer | null;
    let defaultFilename: string;

    if (name) {
      const all = [
        ...dashboard.trainer.globalAgemon,
        ...dashboard.trainer.projectAgemon,
      ];
      const profile = all.find(
        (a) => a.name === name || a.id === name || a.displayName === name,
      );
      if (!profile) {
        console.log(`  Agemon "${name}" not found.`);
        return;
      }
      pngBuffer = await renderAgemonCard(profile);
      defaultFilename = `agemon-${profile.name}.png`;
    } else {
      pngBuffer = await renderTrainerCard(dashboard.trainer);
      defaultFilename = "agemon-trainer.png";
    }

    if (!pngBuffer) {
      console.log(
        "  Failed to generate PNG. Install 'canvas' package: npm install canvas",
      );
      return;
    }

    const { writeFile } = await import("node:fs/promises");
    const outputPath = options.output ?? defaultFilename;
    await writeFile(outputPath, pngBuffer);
    console.log(`  Share card saved: ${outputPath}`);
  });

function printSummary(dashboard: DashboardData) {
  const { trainer, scan } = dashboard;

  console.log("+-----------------------------------------+");
  console.log("|  AGEMON - AgentMonster                  |");
  console.log("+-----------------------------------------+");
  console.log(
    `|  Trainer: ${trainer.name.padEnd(28)}|`,
  );
  console.log(
    `|  Level: ${String(trainer.level).padEnd(3)}  Agemon: ${String(trainer.totalAgemon).padEnd(16)}|`,
  );
  console.log(
    `|  Moves: ${String(trainer.totalMoves).padEnd(3)}  Equipment: ${String(trainer.totalEquipment).padEnd(13)}|`,
  );
  console.log("+-----------------------------------------+");

  const allProfiles = [...trainer.globalAgemon, ...trainer.projectAgemon];

  if (allProfiles.length === 0) {
    console.log("|  No Agemon detected.                    |");
    console.log("|  Add commands, MCP, or plugins to start!|");
  } else {
    for (const p of allProfiles) {
      const srcLabels: Record<string, string> = { command: "CMD", mcp: "MCP", plugin: "PLG", base: "BASE" };
      const src = srcLabels[p.source] ?? p.source;
      const scope = p.scope === "global" ? "G" : "P";
      const typeStr = p.types.map(getTypeLabel).join("/");
      console.log(
        `|  [${scope}] ${src} ${p.displayName.padEnd(16)} Lv.${String(p.level).padEnd(3)} ${typeStr.padEnd(6)}|`,
      );
    }
  }
  console.log("+-----------------------------------------+");

  if (scan.baseKnowledge.claudeMd.exists) {
    console.log(
      `\n  Base Knowledge: CLAUDE.md (${scan.baseKnowledge.claudeMd.locations.length} location${scan.baseKnowledge.claudeMd.locations.length > 1 ? "s" : ""})`,
    );
  }
  if (scan.mcpServers.length > 0) {
    console.log(
      `  MCP Servers: ${scan.mcpServers.map((s) => s.name).join(", ")}`,
    );
  }
  if (scan.hooks.length > 0) {
    console.log(`  Hooks: ${scan.hooks.length}`);
  }
}

function printAgemonList(dashboard: DashboardData) {
  const all = [...dashboard.trainer.globalAgemon, ...dashboard.trainer.projectAgemon];

  if (all.length === 0) {
    console.log("  No Agemon detected.");
    return;
  }

  console.log("  NAME                 TYPE         SOURCE   SCOPE    LEVEL  MOVES");
  console.log("  " + "-".repeat(68));

  for (const p of all) {
    const typeStr = p.types.map(getTypeLabel).join("/");
    console.log(
      `  ${p.displayName.padEnd(21)} ${typeStr.padEnd(12)} ${p.source.padEnd(8)} ${p.scope.padEnd(8)} ${String(p.level).padEnd(6)} ${p.moves.length}`,
    );
  }
}

function printAgemonDetail(profile: AgemonProfile) {
  const bar = (value: number) => {
    const filled = Math.round(value / 10);
    return "=".repeat(filled) + "-".repeat(10 - filled);
  };

  const typeStr = profile.types.map(getTypeLabel).join(" / ");

  console.log(`\n  === ${profile.displayName} (${profile.name}) ===`);
  console.log(`  Type: ${typeStr}`);
  console.log(`  Source: ${profile.source} | Scope: ${profile.scope}`);
  console.log(`  Level: ${profile.evolution.level} | Stage: ${profile.evolution.stage} (${profile.evolution.title})`);
  console.log(`  XP: ${profile.xp} / ${profile.evolution.nextLevelXp}`);
  console.log();
  console.log(`  Knowledge: [${bar(profile.stats.knowledge)}] ${Math.round(profile.stats.knowledge)}`);
  console.log(`  Arsenal:   [${bar(profile.stats.arsenal)}] ${Math.round(profile.stats.arsenal)}`);
  console.log(`  Reflex:    [${bar(profile.stats.reflex)}] ${Math.round(profile.stats.reflex)}`);
  console.log(`  Mastery:   [${bar(profile.stats.mastery)}] ${Math.round(profile.stats.mastery)}`);
  console.log(`  Guard:     [${bar(profile.stats.guard)}] ${Math.round(profile.stats.guard)}`);
  console.log(`  Synergy:   [${bar(profile.stats.synergy)}] ${Math.round(profile.stats.synergy)}`);

  if (profile.moves.length > 0) {
    console.log(`\n  --- Moves (${profile.moves.length}) ---`);
    for (const move of profile.moves) {
      const typeLabel = move.category.toUpperCase().padEnd(7);
      console.log(
        `  [${typeLabel}] ${move.name.padEnd(25)} Pow:${String(move.power).padStart(3)}  ${move.description.slice(0, 40)}`,
      );
    }
  }

  if (profile.equipment.length > 0) {
    console.log(`\n  --- Equipment ---`);
    for (const eq of profile.equipment) {
      console.log(`  ${eq.name} (${eq.type})`);
    }
  }
}

program.parse();
