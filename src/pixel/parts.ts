import type { AgemonStats, AgemonType, EvolutionStage } from "../engine/types.js";
import type { SpriteLayer } from "../engine/types.js";
import { TYPE_PALETTE } from "./palette.js";

// 0=transparent, 1=outline, 2=white, P=primary color, S=secondary color

/**
 * Egg sprite 16x16 - simple oval shape.
 */
function eggBody(primary: number, secondary: number): number[][] {
  return [
    [0,0,0,0,0,0,1,1,1,1,0,0,0,0,0,0],
    [0,0,0,0,0,1,2,2,2,2,1,0,0,0,0,0],
    [0,0,0,0,1,2,2,2,2,2,2,1,0,0,0,0],
    [0,0,0,1,2,2,primary,2,2,primary,2,2,1,0,0,0],
    [0,0,0,1,2,primary,secondary,primary,primary,secondary,primary,2,1,0,0,0],
    [0,0,1,2,2,2,primary,2,2,primary,2,2,2,1,0,0],
    [0,0,1,2,2,2,2,2,2,2,2,2,2,1,0,0],
    [0,0,1,primary,2,2,2,2,2,2,2,2,primary,1,0,0],
    [0,0,1,primary,primary,2,2,2,2,2,2,primary,primary,1,0,0],
    [0,0,1,2,primary,primary,2,2,2,2,primary,primary,2,1,0,0],
    [0,0,0,1,2,primary,primary,primary,primary,primary,primary,2,1,0,0,0],
    [0,0,0,1,2,2,primary,primary,primary,primary,2,2,1,0,0,0],
    [0,0,0,0,1,2,2,2,2,2,2,1,0,0,0,0],
    [0,0,0,0,0,1,1,2,2,1,1,0,0,0,0,0],
    [0,0,0,0,0,0,1,1,1,1,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  ];
}

/**
 * Baby sprite 24x24 - small creature with eyes.
 */
function babyBody(primary: number, secondary: number): number[][] {
  const s = 24;
  const pixels: number[][] = Array.from({ length: s }, () => Array(s).fill(0));

  // Simple round body with big eyes
  // Head circle
  for (let y = 3; y < 14; y++) {
    for (let x = 6; x < 18; x++) {
      const dx = x - 12;
      const dy = y - 8;
      if (dx * dx + dy * dy <= 36) {
        pixels[y][x] = primary;
      }
      if (dx * dx + dy * dy > 30 && dx * dx + dy * dy <= 40) {
        pixels[y][x] = 1; // outline
      }
    }
  }

  // Eyes
  pixels[7][9] = 2; pixels[7][10] = 2;
  pixels[7][14] = 2; pixels[7][15] = 2;
  pixels[8][10] = 1; pixels[8][14] = 1; // pupils

  // Mouth
  pixels[10][11] = 1; pixels[10][12] = 1; pixels[10][13] = 1;

  // Body
  for (let y = 13; y < 20; y++) {
    for (let x = 8; x < 16; x++) {
      const dx = x - 12;
      const dy = y - 16;
      if (dx * dx + dy * dy <= 20) {
        pixels[y][x] = secondary;
      }
    }
  }

  // Feet
  pixels[20][9] = primary; pixels[20][10] = primary;
  pixels[20][14] = primary; pixels[20][15] = primary;
  pixels[21][9] = 1; pixels[21][10] = 1;
  pixels[21][14] = 1; pixels[21][15] = 1;

  return pixels;
}

/**
 * Child/Teen sprite 32x32.
 */
function childBody(primary: number, secondary: number): number[][] {
  const s = 32;
  const pixels: number[][] = Array.from({ length: s }, () => Array(s).fill(0));

  // Head
  for (let y = 2; y < 14; y++) {
    for (let x = 8; x < 24; x++) {
      const dx = x - 16;
      const dy = y - 8;
      if (dx * dx + dy * dy <= 50) {
        pixels[y][x] = primary;
      }
      if (dx * dx + dy * dy > 45 && dx * dx + dy * dy <= 55) {
        pixels[y][x] = 1;
      }
    }
  }

  // Eyes (bigger, more expressive)
  for (let dy = 0; dy < 3; dy++) {
    for (let dx = 0; dx < 3; dx++) {
      pixels[6 + dy][11 + dx] = 2;
      pixels[6 + dy][18 + dx] = 2;
    }
  }
  pixels[7][12] = 1; pixels[8][12] = 1; // left pupil
  pixels[7][19] = 1; pixels[8][19] = 1; // right pupil

  // Smile
  pixels[10][13] = 1; pixels[10][14] = 1; pixels[10][15] = 1;
  pixels[10][16] = 1; pixels[10][17] = 1; pixels[10][18] = 1;
  pixels[11][14] = 1; pixels[11][17] = 1;

  // Body
  for (let y = 14; y < 26; y++) {
    for (let x = 10; x < 22; x++) {
      const dx = x - 16;
      const dy = y - 20;
      if (dx * dx / 40 + dy * dy / 50 <= 1) {
        pixels[y][x] = secondary;
      }
    }
  }

  // Arms
  for (let y = 15; y < 20; y++) {
    pixels[y][8] = primary; pixels[y][9] = primary;
    pixels[y][22] = primary; pixels[y][23] = primary;
  }

  // Legs
  for (let y = 25; y < 29; y++) {
    pixels[y][12] = primary; pixels[y][13] = primary;
    pixels[y][18] = primary; pixels[y][19] = primary;
  }
  // Feet
  pixels[29][11] = 1; pixels[29][12] = 1; pixels[29][13] = 1;
  pixels[29][18] = 1; pixels[29][19] = 1; pixels[29][20] = 1;

  return pixels;
}

/**
 * Adult/Ultimate sprite 48x48.
 */
function adultBody(primary: number, secondary: number): number[][] {
  const s = 48;
  const pixels: number[][] = Array.from({ length: s }, () => Array(s).fill(0));

  // Head
  for (let y = 2; y < 18; y++) {
    for (let x = 14; x < 34; x++) {
      const dx = x - 24;
      const dy = y - 10;
      if (dx * dx / 100 + dy * dy / 64 <= 1) {
        pixels[y][x] = primary;
      }
    }
  }

  // Crown/spikes on top
  pixels[1][22] = secondary; pixels[1][23] = secondary;
  pixels[1][24] = secondary; pixels[1][25] = secondary;
  pixels[0][23] = primary; pixels[0][24] = primary;
  pixels[2][20] = secondary; pixels[2][27] = secondary;

  // Eyes
  for (let dy = 0; dy < 4; dy++) {
    for (let dx = 0; dx < 4; dx++) {
      pixels[8 + dy][17 + dx] = 2;
      pixels[8 + dy][27 + dx] = 2;
    }
  }
  pixels[9][18] = 1; pixels[10][18] = 1; pixels[9][19] = 1;
  pixels[9][28] = 1; pixels[10][28] = 1; pixels[9][29] = 1;

  // Mouth
  for (let x = 20; x < 28; x++) pixels[14][x] = 1;
  pixels[15][21] = 1; pixels[15][26] = 1;

  // Body
  for (let y = 18; y < 38; y++) {
    for (let x = 14; x < 34; x++) {
      const dx = x - 24;
      const dy = y - 28;
      if (dx * dx / 120 + dy * dy / 120 <= 1) {
        pixels[y][x] = secondary;
      }
    }
  }

  // Chest marking
  for (let y = 22; y < 30; y++) {
    for (let x = 20; x < 28; x++) {
      const dx = x - 24;
      const dy = y - 26;
      if (dx * dx + dy * dy <= 12) {
        pixels[y][x] = 2;
      }
    }
  }

  // Arms
  for (let y = 20; y < 30; y++) {
    for (let dx = 0; dx < 3; dx++) {
      pixels[y][11 + dx] = primary;
      pixels[y][34 + dx] = primary;
    }
  }

  // Legs
  for (let y = 37; y < 44; y++) {
    pixels[y][18] = primary; pixels[y][19] = primary; pixels[y][20] = primary;
    pixels[y][27] = primary; pixels[y][28] = primary; pixels[y][29] = primary;
  }
  // Feet
  for (let x = 16; x < 22; x++) pixels[44][x] = 1;
  for (let x = 26; x < 32; x++) pixels[44][x] = 1;

  return pixels;
}

// Stage-to-size mapping
const STAGE_SIZES: Record<EvolutionStage, number> = {
  baby: 24,
  child: 32,
  teen: 32,
  adult: 48,
  ultimate: 48,
};

/**
 * Select and generate sprite parts based on stats, types, and evolution stage.
 */
export function selectParts(
  stats: AgemonStats,
  types: AgemonType[],
  stage: EvolutionStage,
): SpriteLayer[] {
  const mainType = types[0] ?? "scholar";
  const { primary, secondary } = TYPE_PALETTE[mainType];
  const size = STAGE_SIZES[stage];

  let bodyPixels: number[][];
  switch (stage) {
    case "baby":
      bodyPixels = babyBody(primary, secondary);
      break;
    case "child":
    case "teen":
      bodyPixels = childBody(primary, secondary);
      break;
    case "adult":
    case "ultimate":
      bodyPixels = adultBody(primary, secondary);
      break;
  }

  const layers: SpriteLayer[] = [
    { name: "body", pixels: bodyPixels, offsetX: 0, offsetY: 0 },
  ];

  // Add weapon layer for teen+ based on arsenal stat
  if (["teen", "adult", "ultimate"].includes(stage) && stats.arsenal > 30) {
    layers.push(generateWeaponLayer(size, primary, stats.arsenal));
  }

  // Add aura for ultimate stage
  if (stage === "ultimate") {
    layers.push(generateAuraLayer(size, secondary));
  }

  return layers;
}

function generateWeaponLayer(size: number, color: number, arsenal: number): SpriteLayer {
  const pixels: number[][] = Array.from({ length: size }, () => Array(size).fill(0));
  const intensity = Math.min(5, Math.floor(arsenal / 20));

  // Simple sword/staff on the right side
  const cx = Math.floor(size * 0.78);
  const startY = Math.floor(size * 0.25);
  for (let i = 0; i < intensity + 3; i++) {
    if (startY + i < size) {
      pixels[startY + i][cx] = color;
      pixels[startY + i][cx + 1] = 1;
    }
  }
  // Guard
  if (startY + 2 < size && cx - 1 >= 0 && cx + 2 < size) {
    pixels[startY + 2][cx - 1] = color;
    pixels[startY + 2][cx + 2] = color;
  }

  return { name: "weapon", pixels, offsetX: 0, offsetY: 0 };
}

function generateAuraLayer(size: number, color: number): SpriteLayer {
  const pixels: number[][] = Array.from({ length: size }, () => Array(size).fill(0));

  // Sparkle aura dots around the body
  const center = Math.floor(size / 2);
  const radius = Math.floor(size * 0.45);
  for (let angle = 0; angle < 8; angle++) {
    const a = (angle * Math.PI * 2) / 8;
    const x = Math.round(center + radius * Math.cos(a));
    const y = Math.round(center + radius * Math.sin(a));
    if (x >= 0 && x < size && y >= 0 && y < size) {
      pixels[y][x] = color;
    }
  }

  return { name: "aura", pixels, offsetX: 0, offsetY: 0 };
}

export { STAGE_SIZES };
