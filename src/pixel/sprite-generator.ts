import type { AgemonProfile, SpriteDefinition } from "../engine/types.js";
import { generateSpritePalette } from "./palette.js";
import { buildVisualGenome } from "./genome.js";
import { resolveDesignedGenome } from "./designer-agent.js";
import { validateSpriteAsset } from "./sprite-asset.js";
import { selectParts, STAGE_SIZES } from "./parts.js";

/**
 * Generate a SpriteDefinition from an AgemonProfile.
 * Deterministic: same profile → same sprite.
 */
export function generateSprite(profile: AgemonProfile): SpriteDefinition {
  const expectedSize = STAGE_SIZES[profile.evolution.stage];
  if (profile.spriteAsset) {
    const validation = validateSpriteAsset(profile.spriteAsset, expectedSize);
    if (validation.ok && validation.asset) {
      return validation.asset;
    }
  }

  return generateProceduralSprite(profile);
}

export function generateProceduralSprite(profile: AgemonProfile): SpriteDefinition {
  const stage = profile.evolution.stage;
  const size = STAGE_SIZES[stage];
  const baseGenome = buildVisualGenome(profile);
  const designed = resolveDesignedGenome(profile, baseGenome);
  const layers = selectParts(profile, designed.genome);
  const palette = generateSpritePalette(profile, designed.genome);

  return {
    width: size,
    height: size,
    layers,
    palette,
  };
}

/**
 * Generate a mini sprite (8x8) by downsampling.
 */
export function generateMiniSprite(profile: AgemonProfile): SpriteDefinition {
  const fullSprite = generateSprite(profile);
  const miniSize = 8;
  const scale = fullSprite.width / miniSize;

  // Composite all layers into a single pixel array
  const composite: number[][] = Array.from({ length: fullSprite.width }, () =>
    Array(fullSprite.width).fill(0),
  );

  for (const layer of fullSprite.layers) {
    for (let y = 0; y < layer.pixels.length; y++) {
      for (let x = 0; x < (layer.pixels[y]?.length ?? 0); x++) {
        const px = layer.pixels[y][x];
        if (px !== 0) {
          const gy = y + layer.offsetY;
          const gx = x + layer.offsetX;
          if (gy >= 0 && gy < fullSprite.width && gx >= 0 && gx < fullSprite.width) {
            composite[gy][gx] = px;
          }
        }
      }
    }
  }

  // Downsample via nearest-neighbor
  const miniPixels: number[][] = Array.from({ length: miniSize }, () =>
    Array(miniSize).fill(0),
  );

  for (let y = 0; y < miniSize; y++) {
    for (let x = 0; x < miniSize; x++) {
      const srcY = Math.floor(y * scale);
      const srcX = Math.floor(x * scale);
      miniPixels[y][x] = composite[srcY]?.[srcX] ?? 0;
    }
  }

  return {
    width: miniSize,
    height: miniSize,
    layers: [{ name: "mini", pixels: miniPixels, offsetX: 0, offsetY: 0 }],
    palette: fullSprite.palette,
  };
}
