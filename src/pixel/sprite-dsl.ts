import type { SpriteDefinition } from "../engine/types.js";

export interface SpriteDslCompileOptions {
  expectedSize: number;
  fallbackPalette?: string[];
}

export interface SpriteDslCompileResult {
  ok: boolean;
  errors: string[];
  asset: SpriteDefinition | null;
}

interface ParsedLayer {
  name: string;
  offsetX: number;
  offsetY: number;
  pixels: number[][];
}

export function compileSpriteDsl(
  input: unknown,
  options: SpriteDslCompileOptions,
): SpriteDslCompileResult {
  const errors: string[] = [];

  if (!isRecord(input)) {
    return { ok: false, errors: ["dsl payload must be an object"], asset: null };
  }

  const expectedSize = options.expectedSize;
  const width = readInteger(input.width) ?? expectedSize;
  const height = readInteger(input.height) ?? expectedSize;

  if (width !== expectedSize || height !== expectedSize) {
    errors.push(`dsl width/height must match ${expectedSize}x${expectedSize}`);
  }

  const symbols = readSymbols(input.symbols, errors);
  const palette = readPalette(input.palette, options.fallbackPalette, errors);

  const parsedLayers = readLayers(input, width, height, symbols, errors);
  applyOverlays(input.overlays, parsedLayers, symbols, width, height, errors);

  if (errors.length > 0 || !palette || !parsedLayers) {
    return { ok: false, errors, asset: null };
  }

  return {
    ok: true,
    errors: [],
    asset: {
      width,
      height,
      palette,
      layers: parsedLayers,
    },
  };
}

function readSymbols(
  input: unknown,
  errors: string[],
): Record<string, number> | null {
  if (!isRecord(input)) {
    errors.push("symbols must be an object");
    return null;
  }

  const symbols: Record<string, number> = {};
  for (const [key, value] of Object.entries(input)) {
    if (key.length !== 1) {
      errors.push(`symbols key '${key}' must be a single character`);
      return null;
    }
    const index = readInteger(value);
    if (index === null || index < 0 || index > 15) {
      errors.push(`symbols['${key}'] must map to 0..15`);
      return null;
    }
    symbols[key] = index;
  }

  if (Object.keys(symbols).length === 0) {
    errors.push("symbols must not be empty");
    return null;
  }

  if (symbols["."] !== 0) {
    errors.push("symbols['.'] must be 0 for transparency");
    return null;
  }

  return symbols;
}

function readPalette(
  input: unknown,
  fallbackPalette: string[] | undefined,
  errors: string[],
): string[] | null {
  if (Array.isArray(input) && isPaletteArray(input)) {
    return input.map((value) => value.toLowerCase());
  }

  if (fallbackPalette && isPaletteArray(fallbackPalette)) {
    return [...fallbackPalette];
  }

  errors.push("palette must be an array of 16 colors");
  return null;
}

function readLayers(
  input: Record<string, unknown>,
  width: number,
  height: number,
  symbols: Record<string, number> | null,
  errors: string[],
): ParsedLayer[] | null {
  if (!symbols) return null;

  if (Array.isArray(input.layers)) {
    if (input.layers.length === 0) {
      errors.push("dsl layers must contain at least one layer");
      return null;
    }

    const parsed: ParsedLayer[] = [];
    for (let i = 0; i < input.layers.length; i++) {
      const layer = input.layers[i];
      if (!isRecord(layer)) {
        errors.push(`layers[${i}] must be an object`);
        return null;
      }

      const name = typeof layer.name === "string" ? layer.name : `layer-${i}`;
      const offsetX = readInteger(layer.offsetX) ?? 0;
      const offsetY = readInteger(layer.offsetY) ?? 0;
      const rows = readRows(layer.rows, width, height, `layers[${i}].rows`, errors);
      if (!rows) return null;

      const pixels = compileRows(rows, symbols, `layers[${i}]`, errors);
      if (!pixels) return null;

      parsed.push({ name, offsetX, offsetY, pixels });
    }

    return parsed;
  }

  const rows = readRows(input.rows, width, height, "rows", errors);
  if (!rows) {
    errors.push("dsl requires either rows[] or layers[]");
    return null;
  }

  const pixels = compileRows(rows, symbols, "rows", errors);
  if (!pixels) return null;

  return [
    {
      name: "body",
      offsetX: 0,
      offsetY: 0,
      pixels,
    },
  ];
}

function readRows(
  input: unknown,
  width: number,
  height: number,
  label: string,
  errors: string[],
): string[] | null {
  const parsedRows = coerceRowsInput(input);
  if (!parsedRows) {
    errors.push(`${label} must be a string[] or multiline string`);
    return null;
  }

  const rows = normalizeRowCount(parsedRows, width, height);
  for (let y = 0; y < rows.length; y++) {
    rows[y] = normalizeRowWidth(rows[y], width, ".");
  }

  return rows;
}

function compileRows(
  rows: string[],
  symbols: Record<string, number>,
  label: string,
  errors: string[],
): number[][] | null {
  const pixels: number[][] = [];
  const transparent = symbols["."] ?? 0;
  for (let y = 0; y < rows.length; y++) {
    const row = rows[y];
    const compiledRow: number[] = [];
    for (let x = 0; x < row.length; x++) {
      const ch = row[x];
      const index = symbols[ch] ?? transparent;
      compiledRow.push(index);
    }
    pixels.push(compiledRow);
  }

  return pixels;
}

function applyOverlays(
  input: unknown,
  layers: ParsedLayer[] | null,
  symbols: Record<string, number> | null,
  width: number,
  height: number,
  errors: string[],
): void {
  if (!Array.isArray(input) || !layers || !symbols) {
    return;
  }

  for (let i = 0; i < input.length; i++) {
    const item = input[i];
    if (!isRecord(item)) {
      errors.push(`overlays[${i}] must be an object`);
      continue;
    }

    const x = readInteger(item.x);
    const y = readInteger(item.y);
    const ch = typeof item.ch === "string" && item.ch.length === 1 ? item.ch : null;
    if (x === null || y === null || !ch) {
      errors.push(`overlays[${i}] must include integer x/y and single-char ch`);
      continue;
    }
    if (x < 0 || x >= width || y < 0 || y >= height) {
      errors.push(`overlays[${i}] is out of bounds`);
      continue;
    }

    const colorIndex = symbols[ch];
    if (colorIndex === undefined) {
      errors.push(`overlays[${i}] uses unknown symbol '${ch}'`);
      continue;
    }

    const layerName = typeof item.layer === "string" ? item.layer : layers[0]?.name;
    const layer = layers.find((candidate) => candidate.name === layerName) ?? layers[0];
    if (!layer) {
      errors.push(`overlays[${i}] cannot resolve target layer`);
      continue;
    }

    layer.pixels[y][x] = colorIndex;
  }
}

function isPaletteArray(input: unknown[]): input is string[] {
  if (input.length !== 16) return false;
  for (let i = 0; i < input.length; i++) {
    const value = input[i];
    if (typeof value !== "string") return false;
    if (i === 0) {
      if (value !== "transparent") return false;
      continue;
    }
    if (!/^#[0-9a-fA-F]{6}$/.test(value)) {
      return false;
    }
  }
  return true;
}

function coerceRowsInput(input: unknown): string[] | null {
  if (Array.isArray(input)) {
    return input.filter((row): row is string => typeof row === "string");
  }
  if (typeof input === "string") {
    return input
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
  }
  return null;
}

function normalizeRowCount(
  rows: string[],
  width: number,
  height: number,
): string[] {
  if (rows.length === height) {
    return [...rows];
  }
  if (rows.length > height) {
    return rows.slice(0, height);
  }
  const normalized = [...rows];
  while (normalized.length < height) {
    normalized.push(".".repeat(width));
  }
  return normalized;
}

function normalizeRowWidth(
  rawRow: string,
  width: number,
  padChar: string,
): string {
  const cleaned = rawRow
    .replace(/^[`"']+|[`"']+$/g, "")
    .replace(/[,\u3001]+$/g, "")
    .replace(/\s+/g, "")
    .replace(/　/g, "");

  if (cleaned.length === width) {
    return cleaned;
  }
  if (cleaned.length > width) {
    return cleaned.slice(0, width);
  }
  return cleaned + padChar.repeat(width - cleaned.length);
}

function readInteger(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isInteger(value)) return null;
  return value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
