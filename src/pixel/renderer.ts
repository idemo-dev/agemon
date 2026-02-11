import type { SpriteDefinition } from "../engine/types.js";

/**
 * Render a SpriteDefinition to an HTMLCanvasElement.
 * Browser-only: uses Canvas 2D API with pixelated scaling.
 */
export function renderToCanvas(
  sprite: SpriteDefinition,
  canvas: HTMLCanvasElement,
  scale: number = 8,
): void {
  const width = sprite.width * scale;
  const height = sprite.height * scale;
  canvas.width = width;
  canvas.height = height;
  canvas.style.imageRendering = "pixelated";

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  ctx.clearRect(0, 0, width, height);

  // Render each layer
  for (const layer of sprite.layers) {
    for (let y = 0; y < layer.pixels.length; y++) {
      const row = layer.pixels[y];
      if (!row) continue;
      for (let x = 0; x < row.length; x++) {
        const colorIndex = row[x];
        if (colorIndex === 0) continue; // transparent

        const color = sprite.palette[colorIndex];
        if (!color || color === "transparent") continue;

        ctx.fillStyle = color;
        ctx.fillRect(
          (x + layer.offsetX) * scale,
          (y + layer.offsetY) * scale,
          scale,
          scale,
        );
      }
    }
  }
}

/**
 * Render a mini sprite at display size.
 */
export function renderMiniToCanvas(
  sprite: SpriteDefinition,
  canvas: HTMLCanvasElement,
  displaySize: number = 48,
): void {
  const scale = Math.floor(displaySize / sprite.width);
  renderToCanvas(sprite, canvas, scale);
}
