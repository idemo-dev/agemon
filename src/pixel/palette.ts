import type { AgemonType } from "../engine/types.js";

/**
 * 16-color restricted palette for pixel art.
 * Index 0 = transparent, Index 1 = black outline.
 */
export const PALETTE: string[] = [
  "transparent", // 0 - transparent
  "#1a1a2e",     // 1 - black outline / dark navy
  "#ffffff",     // 2 - white
  "#e0e0e8",     // 3 - light gray
  "#9e9eae",     // 4 - medium gray
  "#4A90D9",     // 5 - scholar blue
  "#7CB3E8",     // 6 - scholar blue light
  "#E74C3C",     // 7 - arsenal red
  "#F1948A",     // 8 - arsenal red light
  "#F39C12",     // 9 - sentinel orange
  "#F7DC6F",     // 10 - sentinel yellow
  "#9B59B6",     // 11 - artisan purple
  "#C39BD3",     // 12 - artisan purple light
  "#27AE60",     // 13 - guardian green
  "#82E0AA",     // 14 - guardian green light
  "#1ABC9C",     // 15 - catalyst teal
];

/**
 * Dominant color indices for each Agemon type.
 */
export const TYPE_PALETTE: Record<AgemonType, { primary: number; secondary: number }> = {
  scholar:  { primary: 5, secondary: 6 },
  arsenal:  { primary: 7, secondary: 8 },
  sentinel: { primary: 9, secondary: 10 },
  artisan:  { primary: 11, secondary: 12 },
  guardian: { primary: 13, secondary: 14 },
  catalyst: { primary: 15, secondary: 14 },
};

/**
 * Get palette with type-dominant colors in key positions.
 */
export function getTypePalette(type: AgemonType): string[] {
  return [...PALETTE];
}
