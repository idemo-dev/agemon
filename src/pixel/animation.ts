import type { SpriteDefinition, SpriteLayer } from "../engine/types.js";

/**
 * Generate idle animation frames (2-3 frames, simple bounce).
 * Returns array of SpriteDefinitions for each frame.
 */
export function generateIdleFrames(baseSprite: SpriteDefinition): SpriteDefinition[] {
  const frames: SpriteDefinition[] = [];

  // Frame 0: original position
  frames.push(baseSprite);

  // Frame 1: shift up 1px
  frames.push({
    ...baseSprite,
    layers: baseSprite.layers.map((layer) => ({
      ...layer,
      offsetY: layer.offsetY - 1,
    })),
  });

  // Frame 2: back to original (same as frame 0)
  frames.push(baseSprite);

  return frames;
}

/**
 * Get the frame index for the current time.
 * @param frameCount - total number of frames
 * @param fps - frames per second (default 2 for slow bounce)
 */
export function getCurrentFrame(
  frameCount: number,
  fps: number = 2,
): number {
  const timeMs = Date.now();
  const frameInterval = 1000 / fps;
  return Math.floor(timeMs / frameInterval) % frameCount;
}
