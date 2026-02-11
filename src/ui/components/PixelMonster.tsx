import { useRef, useEffect } from "react";
import type { AgemonProfile } from "../../engine/types.js";
import { generateSprite } from "../../pixel/sprite-generator.js";
import { renderToCanvas } from "../../pixel/renderer.js";
import { generateIdleFrames, getCurrentFrame } from "../../pixel/animation.js";

interface PixelMonsterProps {
  profile: AgemonProfile;
  size?: "mini" | "full";
}

export function PixelMonster({ profile, size = "full" }: PixelMonsterProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const baseSprite = generateSprite(profile);
    const frames = generateIdleFrames(baseSprite);
    const scale = size === "mini" ? 4 : 8;

    function animate() {
      const frameIdx = getCurrentFrame(frames.length);
      renderToCanvas(frames[frameIdx], canvas!, scale);
      animRef.current = requestAnimationFrame(animate);
    }

    animate();

    return () => {
      cancelAnimationFrame(animRef.current);
    };
  }, [profile, size]);

  const displaySize = size === "mini" ? 64 : undefined;

  return (
    <canvas
      ref={canvasRef}
      style={{
        imageRendering: "pixelated",
        maxWidth: displaySize ? `${displaySize}px` : "100%",
        maxHeight: displaySize ? `${displaySize}px` : "100%",
      }}
    />
  );
}
