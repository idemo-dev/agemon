import { describe, expect, it } from "vitest";
import {
  evaluateSpriteAssetQuality,
  validateSpriteAsset,
} from "../src/pixel/sprite-asset.js";
import { PALETTE, PIXEL_INDEX } from "../src/pixel/palette.js";

describe("sprite-asset validation", () => {
  it("accepts a valid sprite asset", () => {
    const asset = makeAsset(24);
    const result = validateSpriteAsset(asset, 24);
    expect(result.ok).toBe(true);
    expect(result.errors).toEqual([]);
    expect(result.asset?.width).toBe(24);
  });

  it("rejects invalid palette and pixel values", () => {
    const invalid = makeAsset(24);
    invalid.palette = ["transparent", "#111111"];
    invalid.layers[0].pixels[0][0] = 99;

    const result = validateSpriteAsset(invalid, 24);
    expect(result.ok).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});

describe("sprite-asset quality", () => {
  it("scores contiguous asymmetrical sprites higher", () => {
    const parsed = validateSpriteAsset(makeAsset(24), 24);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok || !parsed.asset) return;

    const quality = evaluateSpriteAssetQuality(parsed.asset);
    expect(quality.score).toBeGreaterThan(0.58);
    expect(quality.issues.length).toBeLessThanOrEqual(1);
  });

  it("flags noisy fragmented sprites", () => {
    const noisy = makeNoisyAsset(24);
    const parsed = validateSpriteAsset(noisy, 24);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok || !parsed.asset) return;

    const quality = evaluateSpriteAssetQuality(parsed.asset);
    expect(quality.score).toBeLessThan(0.5);
    expect(quality.issues.length).toBeGreaterThan(0);
  });
});

function makeAsset(size: number) {
  const pixels = Array.from({ length: size }, (_, y) =>
    Array.from({ length: size }, (_, x) => {
      if (x >= 7 && x <= 14 && y >= 5 && y <= 16) {
        return PIXEL_INDEX.baseMid;
      }
      if (x >= 9 && x <= 11 && y >= 2 && y <= 5) {
        return PIXEL_INDEX.baseLight;
      }
      if (x >= 14 && x <= 16 && y >= 10 && y <= 13) {
        return PIXEL_INDEX.accent;
      }
      if (x >= 5 && x <= 6 && y >= 11 && y <= 12) {
        return PIXEL_INDEX.highlight;
      }
      return PIXEL_INDEX.transparent;
    }),
  );

  return {
    width: size,
    height: size,
    palette: [...PALETTE],
    layers: [
      {
        name: "body",
        offsetX: 0,
        offsetY: 0,
        pixels,
      },
    ],
  };
}

function makeNoisyAsset(size: number) {
  const pixels = Array.from({ length: size }, (_, y) =>
    Array.from({ length: size }, (_, x) => {
      if ((x + y) % 7 === 0 && x % 3 === 0) {
        return PIXEL_INDEX.accent;
      }
      return PIXEL_INDEX.transparent;
    }),
  );

  return {
    width: size,
    height: size,
    palette: [...PALETTE],
    layers: [
      {
        name: "body",
        offsetX: 0,
        offsetY: 0,
        pixels,
      },
    ],
  };
}
