import type { SpriteDefinition } from "../engine/types.js";

export interface SpriteAssetValidationResult {
  ok: boolean;
  errors: string[];
  asset: SpriteDefinition | null;
}

export interface SpriteAssetQuality {
  score: number;
  issues: string[];
}

export function validateSpriteAsset(
  input: unknown,
  expectedSize?: number,
): SpriteAssetValidationResult {
  const errors: string[] = [];

  if (!isRecord(input)) {
    return { ok: false, errors: ["sprite asset must be an object"], asset: null };
  }

  const width = readInteger(input.width);
  const height = readInteger(input.height);
  if (width === null || height === null) {
    errors.push("width and height must be integers");
  }

  if (expectedSize !== undefined) {
    if (width !== expectedSize || height !== expectedSize) {
      errors.push(`sprite size must match stage size ${expectedSize}x${expectedSize}`);
    }
  } else if (width !== null && height !== null) {
    if (!isSupportedSize(width, height)) {
      errors.push("sprite size must be one of 24x24, 32x32, 48x48");
    }
  }

  const palette = readPalette(input.palette, errors);
  const layers = readLayers(input.layers, width ?? 0, height ?? 0, errors);

  if (errors.length > 0 || width === null || height === null || !palette || !layers) {
    return { ok: false, errors, asset: null };
  }

  return {
    ok: true,
    errors: [],
    asset: {
      width,
      height,
      layers,
      palette,
    },
  };
}

export function evaluateSpriteAssetQuality(asset: SpriteDefinition): SpriteAssetQuality {
  const issues: string[] = [];
  const composite = compositeLayers(asset);
  const width = asset.width;
  const height = asset.height;
  const area = width * height;
  const opaque = countOpaque(composite);
  const density = opaque / Math.max(1, area);
  const isolated = countIsolatedPixels(composite);
  const isolatedRatio = isolated / Math.max(1, opaque);
  const largestComponentRatio = largestConnectedComponentRatio(composite);
  const asymmetry = mirrorAsymmetryRatio(composite);

  const densityScore = scoreRange(density, 0.1, 0.38);
  const noiseScore = 1 - clamp(isolatedRatio / 0.32, 0, 1);
  const connectivityScore = clamp((largestComponentRatio - 0.4) / 0.55, 0, 1);
  const asymmetryScore = clamp(asymmetry / 0.38, 0, 1);

  if (density < 0.08 || density > 0.45) {
    issues.push("silhouette density out of range");
  }
  if (isolatedRatio > 0.22) {
    issues.push("too many isolated pixels");
  }
  if (largestComponentRatio < 0.65) {
    issues.push("silhouette fragmentation detected");
  }
  if (asymmetry < 0.08) {
    issues.push("pose asymmetry too weak");
  }

  const score =
    densityScore * 0.2 +
    noiseScore * 0.25 +
    connectivityScore * 0.35 +
    asymmetryScore * 0.2;

  return { score, issues };
}

function readPalette(input: unknown, errors: string[]): string[] | null {
  if (!Array.isArray(input)) {
    errors.push("palette must be an array");
    return null;
  }
  if (input.length !== 16) {
    errors.push("palette must have exactly 16 colors");
    return null;
  }

  const palette: string[] = [];
  for (let i = 0; i < input.length; i++) {
    const value = input[i];
    if (typeof value !== "string") {
      errors.push(`palette[${i}] must be a string`);
      return null;
    }
    if (i === 0) {
      if (value !== "transparent") {
        errors.push("palette[0] must be 'transparent'");
        return null;
      }
      palette.push("transparent");
      continue;
    }
    if (!isHexColor(value)) {
      errors.push(`palette[${i}] must be a hex color`);
      return null;
    }
    palette.push(value.toLowerCase());
  }
  return palette;
}

function readLayers(
  input: unknown,
  width: number,
  height: number,
  errors: string[],
): SpriteDefinition["layers"] | null {
  if (!Array.isArray(input)) {
    errors.push("layers must be an array");
    return null;
  }
  if (input.length === 0 || input.length > 12) {
    errors.push("layers must contain 1..12 items");
    return null;
  }

  const layers: SpriteDefinition["layers"] = [];
  for (let i = 0; i < input.length; i++) {
    const layer = input[i];
    if (!isRecord(layer)) {
      errors.push(`layers[${i}] must be an object`);
      return null;
    }

    const name = typeof layer.name === "string" ? layer.name : `layer-${i}`;
    const offsetX = readInteger(layer.offsetX) ?? 0;
    const offsetY = readInteger(layer.offsetY) ?? 0;
    const pixels = layer.pixels;

    if (!Array.isArray(pixels) || pixels.length !== height) {
      errors.push(`layers[${i}].pixels must be a ${height}x${width} 2D array`);
      return null;
    }

    const normalizedPixels: number[][] = [];
    for (let y = 0; y < pixels.length; y++) {
      const row = pixels[y];
      if (!Array.isArray(row) || row.length !== width) {
        errors.push(`layers[${i}].pixels[${y}] must have width ${width}`);
        return null;
      }
      const normalizedRow: number[] = [];
      for (let x = 0; x < row.length; x++) {
        const value = readInteger(row[x]);
        if (value === null || value < 0 || value > 15) {
          errors.push(`layers[${i}].pixels[${y}][${x}] must be 0..15`);
          return null;
        }
        normalizedRow.push(value);
      }
      normalizedPixels.push(normalizedRow);
    }

    layers.push({ name, pixels: normalizedPixels, offsetX, offsetY });
  }

  return layers;
}

function compositeLayers(asset: SpriteDefinition): number[][] {
  const composite = createGrid(asset.width, asset.height);
  for (const layer of asset.layers) {
    for (let y = 0; y < layer.pixels.length; y++) {
      const row = layer.pixels[y];
      if (!row) continue;
      for (let x = 0; x < row.length; x++) {
        const color = row[x];
        if (color === 0) continue;
        const gx = x + layer.offsetX;
        const gy = y + layer.offsetY;
        if (gx >= 0 && gx < asset.width && gy >= 0 && gy < asset.height) {
          composite[gy][gx] = color;
        }
      }
    }
  }
  return composite;
}

function createGrid(width: number, height: number): number[][] {
  return Array.from({ length: height }, () => Array(width).fill(0));
}

function countOpaque(pixels: number[][]): number {
  let count = 0;
  for (const row of pixels) {
    for (const px of row) {
      if (px !== 0) count++;
    }
  }
  return count;
}

function countIsolatedPixels(pixels: number[][]): number {
  const h = pixels.length;
  const w = pixels[0]?.length ?? 0;
  let isolated = 0;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (pixels[y][x] === 0) continue;
      let neighbors = 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue;
          const ny = y + dy;
          const nx = x + dx;
          if (ny < 0 || ny >= h || nx < 0 || nx >= w) continue;
          if (pixels[ny][nx] !== 0) neighbors++;
        }
      }
      if (neighbors <= 1) isolated++;
    }
  }
  return isolated;
}

function largestConnectedComponentRatio(pixels: number[][]): number {
  const h = pixels.length;
  const w = pixels[0]?.length ?? 0;
  const visited = createGrid(w, h).map((row) => row.map(() => 0));
  let largest = 0;
  let total = 0;

  const queue: Array<[number, number]> = [];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (pixels[y][x] === 0) continue;
      total++;
      if (visited[y][x] === 1) continue;
      visited[y][x] = 1;
      queue.push([x, y]);
      let size = 0;

      while (queue.length > 0) {
        const current = queue.shift();
        if (!current) break;
        const [cx, cy] = current;
        size++;

        const neighbors = [
          [cx - 1, cy],
          [cx + 1, cy],
          [cx, cy - 1],
          [cx, cy + 1],
        ];
        for (const [nx, ny] of neighbors) {
          if (ny < 0 || ny >= h || nx < 0 || nx >= w) continue;
          if (pixels[ny][nx] === 0 || visited[ny][nx] === 1) continue;
          visited[ny][nx] = 1;
          queue.push([nx, ny]);
        }
      }

      if (size > largest) largest = size;
    }
  }

  return total === 0 ? 0 : largest / total;
}

function mirrorAsymmetryRatio(pixels: number[][]): number {
  const h = pixels.length;
  const w = pixels[0]?.length ?? 0;
  let diff = 0;
  let total = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < Math.floor(w / 2); x++) {
      const left = pixels[y][x];
      const right = pixels[y][w - 1 - x];
      if (left !== 0 || right !== 0) {
        total++;
        if (left !== right) diff++;
      }
    }
  }
  return total === 0 ? 0 : diff / total;
}

function scoreRange(value: number, min: number, max: number): number {
  if (value < min) return clamp(value / Math.max(0.0001, min), 0, 1);
  if (value > max) return clamp(1 - (value - max) / Math.max(0.0001, 1 - max), 0, 1);
  return 1;
}

function isSupportedSize(width: number, height: number): boolean {
  const value = `${width}x${height}`;
  return value === "24x24" || value === "32x32" || value === "48x48";
}

function isHexColor(value: string): boolean {
  return /^#[0-9a-fA-F]{6}$/.test(value);
}

function readInteger(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isInteger(value)) return null;
  return value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
