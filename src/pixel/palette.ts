import type { AgemonProfile, AgemonType } from "../engine/types.js";
import type { VisualGenome } from "./genome.js";
import {
  DEFAULT_VISUAL_PALETTE_BIAS,
  type VisualPaletteBias,
} from "./visual-spec.js";

/**
 * Palette index slots used by sprite generators.
 * Keep these stable so rendering logic can target semantic color roles.
 */
export const PIXEL_INDEX = {
  transparent: 0,
  outline: 1,
  highlight: 2,
  baseLight: 3,
  baseMid: 4,
  baseDark: 5,
  accent: 6,
  accentLight: 7,
  accentDark: 8,
  spot: 9,
  spotLight: 10,
  rune: 11,
  runeLight: 12,
  shadow: 13,
  accentMuted: 14,
  aura: 15,
} as const;

export const SPRITE_PALETTE_SLOTS = PIXEL_INDEX;

/**
 * Default palette (fallback).
 * Runtime generation should generally use generateSpritePalette().
 */
export const PALETTE: string[] = [
  "transparent",
  "#11131b",
  "#f6f7ff",
  "#8eb5ff",
  "#3f6496",
  "#243753",
  "#ef6c60",
  "#f3a198",
  "#be3f35",
  "#ffd166",
  "#ffe7ad",
  "#53c7ff",
  "#a1e7ff",
  "#121a29",
  "#b6847f",
  "#7af8df",
];

const TYPE_ACCENT_HUE: Record<AgemonType, number> = {
  scholar: 212,
  arsenal: 8,
  sentinel: 34,
  artisan: 282,
  guardian: 142,
  catalyst: 174,
};

export function generateSpritePalette(
  profile: AgemonProfile,
  genome: VisualGenome,
): string[] {
  const mainType = profile.types[0] ?? "scholar";
  const secondaryType = profile.types[1] ?? null;
  const seed = genome.seed >>> 0;
  const paletteBias = readPaletteBias(genome);

  const baseHue = normalizeHue(
    (seed % 360) + genome.poseOffset * 7 + paletteBias.baseHueShift,
  );
  const baseSat = clamp(
    36 + ((seed >>> 9) % 26) + paletteBias.baseSatShift,
    24,
    74,
  );
  const baseMidL = clamp(42 + ((seed >>> 15) % 10) - 4, 36, 52);
  const baseDarkL = clamp(baseMidL - 14, 18, 36);
  const baseLightL = clamp(baseMidL + 17, 52, 72);

  let accentHue = normalizeHue(
    TYPE_ACCENT_HUE[mainType] + ((seed >>> 5) % 28) - 14 + paletteBias.accentHueShift,
  );
  if (secondaryType) {
    accentHue = blendHue(accentHue, TYPE_ACCENT_HUE[secondaryType], 0.28);
  }

  // Avoid near-monochrome bodies by forcing hue distance.
  if (shortestHueDistance(baseHue, accentHue) < 24) {
    accentHue = normalizeHue(accentHue + 96);
  }

  const accentSat = clamp(
    60 + genome.patternDensity * 6 + ((seed >>> 18) % 8) + paletteBias.accentSatShift,
    46,
    92,
  );
  const accentLight = clamp(
    48 + ((seed >>> 22) % 6) - 2 + paletteBias.accentLightShift,
    34,
    66,
  );
  let accent = hslToHex(accentHue, accentSat, accentLight);
  const baseMid = hslToHex(baseHue, baseSat, baseMidL);
  const targetContrast = 1.35 + paletteBias.contrastBoost * 0.02;

  if (contrastRatio(baseMid, accent) < targetContrast) {
    accentHue = normalizeHue(accentHue + 110);
    accent = hslToHex(
      accentHue,
      clamp(accentSat + Math.round(paletteBias.contrastBoost * 0.6), 50, 94),
      clamp(accentLight + 4, 40, 72),
    );
  }

  const accentLightColor = hslToHex(
    accentHue,
    clamp(accentSat - 12, 46, 74),
    clamp(accentLight + 13, 54, 76),
  );
  const accentDarkColor = hslToHex(
    accentHue,
    clamp(accentSat + 6, 62, 90),
    clamp(accentLight - 16, 22, 42),
  );

  const spotHue = normalizeHue(
    accentHue + 155 + ((seed >>> 26) % 40) - 20 + Math.round(paletteBias.baseHueShift * 0.25),
  );
  const spot = hslToHex(spotHue, 86, 60);
  const spotLight = hslToHex(spotHue, 76, 75);

  const runeHue = secondaryType
    ? blendHue(baseHue, TYPE_ACCENT_HUE[secondaryType], 0.52)
    : normalizeHue(baseHue + 44);
  const rune = hslToHex(normalizeHue(runeHue), clamp(baseSat + 10, 40, 78), 50);
  const runeLight = hslToHex(normalizeHue(runeHue), clamp(baseSat + 4, 36, 70), 66);
  const shadow = hslToHex(baseHue, clamp(baseSat - 20, 8, 32), clamp(baseDarkL - 8, 8, 24));
  const accentMuted = hslToHex(
    accentHue,
    clamp(accentSat - 30, 20, 56),
    clamp(accentLight + 4, 40, 66),
  );
  const aura = hslToHex(
    normalizeHue(accentHue + 18),
    clamp(accentSat - 8, 40, 82),
    clamp(accentLight + 18, 56, 78),
  );

  return [
    "transparent",
    hslToHex(baseHue, clamp(baseSat - 28, 8, 30), 12),
    "#f7f9ff",
    hslToHex(baseHue, clamp(baseSat - 4, 26, 62), baseLightL),
    baseMid,
    hslToHex(baseHue, clamp(baseSat + 4, 34, 72), baseDarkL),
    accent,
    accentLightColor,
    accentDarkColor,
    spot,
    spotLight,
    rune,
    runeLight,
    shadow,
    accentMuted,
    aura,
  ];
}

/**
 * Legacy helper retained for compatibility.
 */
export function getTypePalette(_type: AgemonType): string[] {
  return [...PALETTE];
}

function readPaletteBias(genome: VisualGenome): VisualPaletteBias {
  const bias = (genome as Partial<{ paletteBias: Partial<VisualPaletteBias> }>).paletteBias;
  return {
    ...DEFAULT_VISUAL_PALETTE_BIAS,
    ...(bias ?? {}),
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function normalizeHue(hue: number): number {
  return ((hue % 360) + 360) % 360;
}

function shortestHueDistance(a: number, b: number): number {
  const raw = Math.abs(a - b) % 360;
  return raw > 180 ? 360 - raw : raw;
}

function blendHue(a: number, b: number, ratio: number): number {
  const safeRatio = clamp(ratio, 0, 1);
  const delta = ((b - a + 540) % 360) - 180;
  return normalizeHue(a + delta * safeRatio);
}

function hslToHex(h: number, s: number, l: number): string {
  const sat = clamp(s, 0, 100) / 100;
  const light = clamp(l, 0, 100) / 100;
  const hue = normalizeHue(h) / 360;

  if (sat === 0) {
    const gray = Math.round(light * 255);
    return toHex(gray, gray, gray);
  }

  const q = light < 0.5 ? light * (1 + sat) : light + sat - light * sat;
  const p = 2 * light - q;

  const r = hueToRgb(p, q, hue + 1 / 3);
  const g = hueToRgb(p, q, hue);
  const b = hueToRgb(p, q, hue - 1 / 3);

  return toHex(Math.round(r * 255), Math.round(g * 255), Math.round(b * 255));
}

function hueToRgb(p: number, q: number, t: number): number {
  let x = t;
  if (x < 0) x += 1;
  if (x > 1) x -= 1;
  if (x < 1 / 6) return p + (q - p) * 6 * x;
  if (x < 1 / 2) return q;
  if (x < 2 / 3) return p + (q - p) * (2 / 3 - x) * 6;
  return p;
}

function toHex(r: number, g: number, b: number): string {
  const rr = clamp(Math.round(r), 0, 255).toString(16).padStart(2, "0");
  const gg = clamp(Math.round(g), 0, 255).toString(16).padStart(2, "0");
  const bb = clamp(Math.round(b), 0, 255).toString(16).padStart(2, "0");
  return `#${rr}${gg}${bb}`;
}

function contrastRatio(hexA: string, hexB: string): number {
  const a = relativeLuminance(hexA);
  const b = relativeLuminance(hexB);
  const light = Math.max(a, b);
  const dark = Math.min(a, b);
  return (light + 0.05) / (dark + 0.05);
}

function relativeLuminance(hex: string): number {
  const rgb = hexToRgb(hex);
  if (!rgb) return 0;

  const channels = [rgb.r, rgb.g, rgb.b].map((value) => {
    const n = value / 255;
    return n <= 0.03928 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4;
  });

  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const value = hex.replace("#", "");
  if (!/^[0-9a-fA-F]{6}$/.test(value)) return null;
  return {
    r: parseInt(value.slice(0, 2), 16),
    g: parseInt(value.slice(2, 4), 16),
    b: parseInt(value.slice(4, 6), 16),
  };
}
