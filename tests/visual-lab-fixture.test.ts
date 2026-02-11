import { describe, expect, it } from "vitest";
import { resolve } from "node:path";
import { scanAndBuild } from "../src/cli/scanner.js";
import { generateSprite } from "../src/pixel/sprite-generator.js";

describe("visual diff lab fixture", () => {
  it("produces diverse agents and sprite signatures", async () => {
    const fixtureProject = resolve(
      process.cwd(),
      "fixtures/visual-diff-lab/project",
    );
    const fixtureHome = resolve(process.cwd(), "fixtures/visual-diff-lab/home");

    const previousHome = process.env.HOME;
    process.env.HOME = fixtureHome;

    try {
      const dashboard = await scanAndBuild(fixtureProject);
      const all = [
        ...dashboard.trainer.globalAgemon,
        ...dashboard.trainer.projectAgemon,
      ];

      expect(all.length).toBe(10);

      const spriteSignatures = all.map((profile) => {
        const sprite = generateSprite(profile);
        return JSON.stringify(
          sprite.layers.map((layer) => ({
            name: layer.name,
            pixels: layer.pixels,
          })),
        );
      });

      const uniqueSpriteCount = new Set(spriteSignatures).size;
      expect(uniqueSpriteCount).toBeGreaterThanOrEqual(8);

      const stages = new Set(all.map((profile) => profile.evolution.stage));
      expect(stages.has("baby")).toBe(true);
      expect(stages.has("teen")).toBe(true);

      const typeSignatures = new Set(
        all.map((profile) => profile.types.join("+")),
      );
      expect(typeSignatures.size).toBeGreaterThanOrEqual(3);
    } finally {
      process.env.HOME = previousHome;
    }
  });
});
