import { useRef, useEffect, useState } from "react";
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
  const [display, setDisplay] = useState<{ width: number; height: number }>({
    width: 0,
    height: 0,
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const baseSprite = generateSprite(profile);
    const frames = generateIdleFrames(baseSprite);
    const targetDisplay = size === "mini" ? 64 : 160;
    const scale = Math.max(1, Math.floor(targetDisplay / baseSprite.width));
    setDisplay({
      width: baseSprite.width * scale,
      height: baseSprite.height * scale,
    });

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

  return (
    <canvas
      ref={canvasRef}
      style={{
        imageRendering: "pixelated",
        width: display.width > 0 ? `${display.width}px` : undefined,
        height: display.height > 0 ? `${display.height}px` : undefined,
        display: "block",
        flexShrink: 0,
        margin: "0 auto",
      }}
    />
  );
}
