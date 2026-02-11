import { mkdir } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { scanAndBuild } from "./scanner.js";
import { startServer } from "./server.js";
import { getTypeLabel } from "../engine/type-system.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = resolve(__dirname, "..", "..");

const fixtureRoot = resolve(repoRoot, "fixtures", "visual-diff-lab");
const projectPath = resolve(fixtureRoot, "project");
const fakeHomePath = resolve(fixtureRoot, "home");

const requestedPort = Number(process.argv[2] ?? "3334");
const port = Number.isFinite(requestedPort) ? requestedPort : 3334;

async function main(): Promise<void> {
  // Ensure fake home exists so scans remain isolated from the real user environment.
  await mkdir(fakeHomePath, { recursive: true });
  process.env.HOME = fakeHomePath;

  console.log(`Visual Lab project: ${projectPath}`);
  console.log(`Visual Lab HOME: ${fakeHomePath}\n`);

  const dashboard = await scanAndBuild(projectPath);
  const all = [...dashboard.trainer.globalAgemon, ...dashboard.trainer.projectAgemon];

  console.log("Detected Agemon for visual comparison:");
  for (const agemon of all) {
    const types = agemon.types.map(getTypeLabel).join("/");
    console.log(
      `- ${agemon.displayName.padEnd(14)} Lv.${String(agemon.level).padEnd(2)} ${agemon.evolution.stage.padEnd(8)} ${types}`,
    );
  }
  console.log();

  await startServer(dashboard, port);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
