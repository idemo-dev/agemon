import type {
  AgemonProfile,
  AgemonStats,
  EvolutionStage,
  SpriteLayer,
} from "../engine/types.js";
import type { VisualGenome } from "./genome.js";
import { PIXEL_INDEX } from "./palette.js";
import {
  DEFAULT_VISUAL_COMPOSITION,
  type VisualBodyPlan,
  type VisualComposition,
  type VisualMotifPart,
  VISUAL_BODY_PLANS,
  VISUAL_MOTIF_PARTS,
} from "./visual-spec.js";

interface BodyGeometry {
  archetype: VisualGenome["archetype"];
  bodyPlan: VisualBodyPlan;
  motifParts: VisualMotifPart[];
  facing: -1 | 1;
  limbLengthBias: number;
  tailLengthBias: number;
  centerX: number;
  headCenterX: number;
  headCenterY: number;
  headRx: number;
  headRy: number;
  bodyCenterX: number;
  bodyCenterY: number;
  bodyRx: number;
  bodyRy: number;
}

interface StageBaseGeometry {
  headCenterY: number;
  headRx: number;
  headRy: number;
  bodyCenterY: number;
  bodyRx: number;
  bodyRy: number;
}

interface ArchetypeAdjust {
  headDx: number;
  bodyDx: number;
  headRx: number;
  headRy: number;
  bodyRx: number;
  bodyRy: number;
  headDy: number;
  bodyDy: number;
}

interface BodyPlanAdjust {
  headScale: number;
  bodyScale: number;
  limbBias: number;
  tailBias: number;
  poseShift: number;
  forwardBias: number;
}

interface BodyColors {
  dark: number;
  mid: number;
  light: number;
}

// Stage-to-size mapping
const STAGE_SIZES: Record<EvolutionStage, number> = {
  baby: 24,
  child: 32,
  teen: 32,
  adult: 48,
  ultimate: 48,
};

const ARCHETYPE_ADJUST: Record<VisualGenome["archetype"], ArchetypeAdjust> = {
  biped: {
    headDx: 1,
    bodyDx: 0,
    headRx: 0,
    headRy: 0,
    bodyRx: 0,
    bodyRy: 0,
    headDy: 0,
    bodyDy: 0,
  },
  brute: {
    headDx: 0,
    bodyDx: 0,
    headRx: 1,
    headRy: 1,
    bodyRx: 2,
    bodyRy: 1,
    headDy: 0,
    bodyDy: 1,
  },
  slender: {
    headDx: 1,
    bodyDx: 0,
    headRx: -1,
    headRy: 0,
    bodyRx: -2,
    bodyRy: 0,
    headDy: 0,
    bodyDy: 0,
  },
  quadruped: {
    headDx: 3,
    bodyDx: -1,
    headRx: -1,
    headRy: -1,
    bodyRx: 2,
    bodyRy: -2,
    headDy: 1,
    bodyDy: 2,
  },
  avian: {
    headDx: 1,
    bodyDx: 0,
    headRx: -1,
    headRy: -1,
    bodyRx: -1,
    bodyRy: -1,
    headDy: -1,
    bodyDy: 0,
  },
  serpent: {
    headDx: 2,
    bodyDx: 0,
    headRx: -1,
    headRy: -1,
    bodyRx: 3,
    bodyRy: -3,
    headDy: 1,
    bodyDy: 1,
  },
};

const BODY_PLAN_ADJUST: Record<VisualBodyPlan, BodyPlanAdjust> = {
  sprinter: {
    headScale: 0.93,
    bodyScale: 0.92,
    limbBias: 1,
    tailBias: 1,
    poseShift: 1,
    forwardBias: 2,
  },
  bulwark: {
    headScale: 1.02,
    bodyScale: 1.16,
    limbBias: -1,
    tailBias: -1,
    poseShift: 0,
    forwardBias: 1,
  },
  mystic: {
    headScale: 1.14,
    bodyScale: 0.94,
    limbBias: 0,
    tailBias: 1,
    poseShift: -1,
    forwardBias: 2,
  },
  prowler: {
    headScale: 0.98,
    bodyScale: 1.02,
    limbBias: 1,
    tailBias: 2,
    poseShift: 1,
    forwardBias: 2,
  },
  colossus: {
    headScale: 0.9,
    bodyScale: 1.22,
    limbBias: -2,
    tailBias: -1,
    poseShift: 0,
    forwardBias: 1,
  },
  trickster: {
    headScale: 1.08,
    bodyScale: 0.9,
    limbBias: 0,
    tailBias: 2,
    poseShift: -1,
    forwardBias: 2,
  },
};

/**
 * Select and generate sprite parts based on profile, visual genome, and stage.
 */
export function selectParts(
  profile: AgemonProfile,
  genome: VisualGenome,
): SpriteLayer[] {
  const stage = profile.evolution.stage;
  const stats = profile.stats;
  const size = STAGE_SIZES[stage];
  const geometry = computeGeometry(size, stage, genome);

  const layers: SpriteLayer[] = [];

  const bodyLayer = generateBodyLayer(
    size,
    geometry,
    stats,
    {
      dark: PIXEL_INDEX.baseDark,
      mid: PIXEL_INDEX.baseMid,
      light: PIXEL_INDEX.baseLight,
    },
    genome,
  );
  layers.push(bodyLayer);

  const patternLayer = generatePatternLayer(
    size,
    geometry,
    PIXEL_INDEX.accent,
    PIXEL_INDEX.accentLight,
    PIXEL_INDEX.rune,
    PIXEL_INDEX.spot,
    genome,
  );
  if (hasVisiblePixels(patternLayer.pixels)) {
    layers.push(patternLayer);
  }

  const faceLayer = generateFaceLayer(
    size,
    geometry,
    PIXEL_INDEX.outline,
    PIXEL_INDEX.highlight,
    PIXEL_INDEX.spot,
    PIXEL_INDEX.spotLight,
    genome,
  );
  if (hasVisiblePixels(faceLayer.pixels)) {
    layers.push(faceLayer);
  }

  const hornLayer = generateHornLayer(
    size,
    geometry,
    PIXEL_INDEX.accentDark,
    PIXEL_INDEX.accent,
    PIXEL_INDEX.accentLight,
    genome,
  );
  if (hasVisiblePixels(hornLayer.pixels)) {
    layers.push(hornLayer);
  }

  const motifLayer = generateMotifLayer(
    size,
    geometry,
    PIXEL_INDEX.accent,
    PIXEL_INDEX.accentLight,
    PIXEL_INDEX.accentDark,
    PIXEL_INDEX.rune,
    PIXEL_INDEX.runeLight,
  );
  if (hasVisiblePixels(motifLayer.pixels)) {
    layers.push(motifLayer);
  }

  if (isTeenOrAbove(stage) && stats.arsenal > 30) {
    layers.push(
      generateWeaponLayer(
        size,
        geometry.facing,
        PIXEL_INDEX.accent,
        PIXEL_INDEX.accentDark,
        PIXEL_INDEX.spot,
        PIXEL_INDEX.spotLight,
        stats.arsenal,
        genome,
      ),
    );
  }

  if (stage === "ultimate") {
    layers.push(
      generateAuraLayer(
        size,
        PIXEL_INDEX.aura,
        PIXEL_INDEX.spotLight,
        genome,
        stats.synergy,
      ),
    );
  }

  return layers;
}

function isTeenOrAbove(stage: EvolutionStage): boolean {
  return stage === "teen" || stage === "adult" || stage === "ultimate";
}

function computeGeometry(
  size: number,
  stage: EvolutionStage,
  genome: VisualGenome,
): BodyGeometry {
  const base = getBaseGeometryForStage(stage);
  const adjust = ARCHETYPE_ADJUST[genome.archetype];
  const composition = readComposition(genome);
  const design = readDesignExtras(genome);
  const bodyPlanAdjust = BODY_PLAN_ADJUST[design.bodyPlan];

  const silhouetteHeadAdjust: Record<number, { x: number; y: number }> = {
    0: { x: 0, y: 0 },
    1: { x: 1, y: -1 },
    2: { x: -1, y: 1 },
  };
  const silhouetteBodyAdjust: Record<number, { x: number; y: number }> = {
    0: { x: 0, y: 0 },
    1: { x: 2, y: -1 },
    2: { x: -1, y: 2 },
  };

  const headAdjust = silhouetteHeadAdjust[genome.silhouette];
  const bodyAdjust = silhouetteBodyAdjust[genome.silhouette];

  // Keep a consistent Pokemon-like left-facing 3/4 composition.
  const facing: -1 | 1 = -1;
  const centerX = clamp(
    Math.floor(size / 2) +
      genome.poseOffset +
      bodyPlanAdjust.poseShift +
      bodyPlanAdjust.forwardBias * facing,
    4,
    size - 5,
  );

  const headCenterX = clamp(
    centerX +
      (adjust.headDx +
        (genome.silhouette === 1 ? 1 : 0) +
        Math.round(bodyPlanAdjust.forwardBias * 0.8)) *
        facing,
    3,
    size - 4,
  );
  const bodyCenterX = clamp(
    centerX + (adjust.bodyDx + Math.round(bodyPlanAdjust.forwardBias * 0.35)) * facing,
    3,
    size - 4,
  );

  const headRx = clamp(
    Math.round(
      (base.headRx + adjust.headRx + headAdjust.x) *
        composition.headScale *
        bodyPlanAdjust.headScale,
    ),
    3,
    Math.floor(size * 0.32),
  );
  const headRy = clamp(
    Math.round(
      (base.headRy + adjust.headRy + headAdjust.y) *
        composition.headScale *
        bodyPlanAdjust.headScale,
    ),
    3,
    Math.floor(size * 0.28),
  );
  const bodyRx = clamp(
    Math.round(
      (base.bodyRx + adjust.bodyRx + bodyAdjust.x) *
        composition.bodyScale *
        bodyPlanAdjust.bodyScale,
    ),
    3,
    Math.floor(size * 0.36),
  );
  const bodyRy = clamp(
    Math.round(
      (base.bodyRy + adjust.bodyRy + bodyAdjust.y) *
        composition.bodyScale *
        bodyPlanAdjust.bodyScale,
    ),
    4,
    Math.floor(size * 0.36),
  );

  return {
    archetype: genome.archetype,
    bodyPlan: design.bodyPlan,
    motifParts: design.motifParts,
    facing,
    limbLengthBias: clamp(composition.limbLengthBias + bodyPlanAdjust.limbBias, -2, 3),
    tailLengthBias: clamp(composition.tailLengthBias + bodyPlanAdjust.tailBias, -2, 5),
    centerX,
    headCenterX,
    headCenterY: clamp(
      base.headCenterY + adjust.headDy - Math.round((composition.headScale - 1) * 2),
      3,
      size - 6,
    ),
    headRx,
    headRy,
    bodyCenterX,
    bodyCenterY: clamp(
      base.bodyCenterY + adjust.bodyDy + Math.round((composition.bodyScale - 1) * 3),
      5,
      size - 5,
    ),
    bodyRx,
    bodyRy,
  };
}

function readComposition(genome: VisualGenome): VisualComposition {
  const composition = (genome as Partial<{ composition: Partial<VisualComposition> }>).composition;
  if (!composition) {
    return DEFAULT_VISUAL_COMPOSITION;
  }
  return {
    headScale: clamp(composition.headScale ?? DEFAULT_VISUAL_COMPOSITION.headScale, 0.82, 1.35),
    bodyScale: clamp(composition.bodyScale ?? DEFAULT_VISUAL_COMPOSITION.bodyScale, 0.82, 1.35),
    limbLengthBias: clamp(
      Math.round(composition.limbLengthBias ?? DEFAULT_VISUAL_COMPOSITION.limbLengthBias),
      -2,
      2,
    ),
    tailLengthBias: clamp(
      Math.round(composition.tailLengthBias ?? DEFAULT_VISUAL_COMPOSITION.tailLengthBias),
      -2,
      4,
    ),
  };
}

function readDesignExtras(genome: VisualGenome): {
  bodyPlan: VisualBodyPlan;
  motifParts: VisualMotifPart[];
} {
  const bodyPlanCandidate = (
    genome as Partial<{ bodyPlan: VisualBodyPlan }>
  ).bodyPlan;
  const motifCandidate = (
    genome as Partial<{ motifParts: VisualMotifPart[] }>
  ).motifParts;

  const bodyPlan =
    typeof bodyPlanCandidate === "string" &&
    VISUAL_BODY_PLANS.includes(bodyPlanCandidate as VisualBodyPlan)
      ? (bodyPlanCandidate as VisualBodyPlan)
      : "sprinter";

  const motifParts = Array.isArray(motifCandidate)
    ? motifCandidate
        .filter((value): value is VisualMotifPart => VISUAL_MOTIF_PARTS.includes(value))
        .filter((value, index, list) => list.indexOf(value) === index)
        .slice(0, 3)
    : [];

  return {
    bodyPlan,
    motifParts,
  };
}

function getBaseGeometryForStage(stage: EvolutionStage): StageBaseGeometry {
  switch (stage) {
    case "baby":
      return {
        headCenterY: 8,
        headRx: 5,
        headRy: 5,
        bodyCenterY: 16,
        bodyRx: 4,
        bodyRy: 5,
      };
    case "child":
    case "teen":
      return {
        headCenterY: 9,
        headRx: 7,
        headRy: 7,
        bodyCenterY: 21,
        bodyRx: 7,
        bodyRy: 8,
      };
    case "adult":
    case "ultimate":
      return {
        headCenterY: 12,
        headRx: 10,
        headRy: 9,
        bodyCenterY: 30,
        bodyRx: 10,
        bodyRy: 12,
      };
  }
}

function generateBodyLayer(
  size: number,
  geometry: BodyGeometry,
  stats: AgemonStats,
  colors: BodyColors,
  genome: VisualGenome,
): SpriteLayer {
  const pixels = createGrid(size);

  switch (geometry.archetype) {
    case "biped":
      drawBipedBody(pixels, geometry, stats, colors, genome, {
        armLengthBonus: 0,
        legLengthBonus: 0,
        armThicknessBonus: 0,
        legWidth: size <= 24 ? 1 : 2,
      });
      break;
    case "brute":
      drawBipedBody(pixels, geometry, stats, colors, genome, {
        armLengthBonus: -1,
        legLengthBonus: -1,
        armThicknessBonus: 2,
        legWidth: size <= 24 ? 2 : 3,
      });
      break;
    case "slender":
      drawBipedBody(pixels, geometry, stats, colors, genome, {
        armLengthBonus: 1,
        legLengthBonus: 2,
        armThicknessBonus: -1,
        legWidth: 1,
      });
      break;
    case "quadruped":
      drawQuadrupedBody(pixels, geometry, colors, genome);
      break;
    case "avian":
      drawAvianBody(pixels, geometry, colors, genome);
      break;
    case "serpent":
      drawSerpentBody(pixels, geometry, colors, genome);
      break;
  }

  applyDirectionalForeshortening(
    pixels,
    geometry,
    getForeshorteningDepth(geometry.bodyPlan),
  );

  if (genome.armorLevel > 0 && geometry.archetype !== "serpent") {
    drawArmorPlate(pixels, geometry, colors.dark, genome.armorLevel);
  }

  return {
    name: "body",
    pixels: applyOutline(pixels, PIXEL_INDEX.outline),
    offsetX: 0,
    offsetY: 0,
  };
}

function getForeshorteningDepth(bodyPlan: VisualBodyPlan): number {
  switch (bodyPlan) {
    case "sprinter":
    case "mystic":
    case "prowler":
    case "trickster":
      return 2;
    case "bulwark":
    case "colossus":
    default:
      return 1;
  }
}

function applyDirectionalForeshortening(
  pixels: number[][],
  geometry: BodyGeometry,
  depth: number,
): void {
  trimFarSideRegion(
    pixels,
    geometry.headCenterX,
    geometry.headCenterY,
    geometry.headRx,
    geometry.headRy,
    geometry.facing,
    depth,
  );
  trimFarSideRegion(
    pixels,
    geometry.bodyCenterX,
    geometry.bodyCenterY,
    geometry.bodyRx,
    geometry.bodyRy,
    geometry.facing,
    depth + 1,
  );
}

function trimFarSideRegion(
  pixels: number[][],
  centerX: number,
  centerY: number,
  rx: number,
  ry: number,
  facing: -1 | 1,
  depth: number,
): void {
  const width = pixels[0]?.length ?? 0;
  const trim = clamp(depth, 0, 3);
  if (trim <= 0) return;

  for (let y = centerY - ry - 1; y <= centerY + ry + 1; y++) {
    if (y < 0 || y >= pixels.length) continue;
    const row = pixels[y];
    if (!row) continue;

    const left = clamp(centerX - rx - 1, 0, width - 1);
    const right = clamp(centerX + rx + 1, 0, width - 1);
    let near = -1;
    let far = -1;

    for (let x = left; x <= right; x++) {
      if (row[x] === 0) continue;
      if (near === -1) near = x;
      far = x;
    }

    if (near === -1 || far === -1) continue;
    if (far - near < 6) continue;

    if (facing === -1) {
      for (let i = 0; i < trim; i++) {
        const x = far - i;
        if (x > near + 2) {
          row[x] = 0;
        }
      }
    } else {
      for (let i = 0; i < trim; i++) {
        const x = near + i;
        if (x < far - 2) {
          row[x] = 0;
        }
      }
    }
  }
}

function drawBipedBody(
  pixels: number[][],
  geometry: BodyGeometry,
  stats: AgemonStats,
  colors: BodyColors,
  genome: VisualGenome,
  opts: {
    armLengthBonus: number;
    legLengthBonus: number;
    armThicknessBonus: number;
    legWidth: number;
  },
): void {
  drawEllipse(
    pixels,
    geometry.headCenterX,
    geometry.headCenterY,
    geometry.headRx,
    geometry.headRy,
    colors.mid,
  );

  drawEllipse(
    pixels,
    geometry.bodyCenterX,
    geometry.bodyCenterY,
    geometry.bodyRx,
    geometry.bodyRy,
    colors.light,
  );

  drawShadowHalf(
    pixels,
    geometry.headCenterX,
    geometry.headCenterY,
    geometry.headRx,
    geometry.headRy,
    colors.dark,
    geometry.facing,
  );
  drawShadowHalf(
    pixels,
    geometry.bodyCenterX,
    geometry.bodyCenterY,
    geometry.bodyRx,
    geometry.bodyRy,
    colors.mid,
    geometry.facing,
  );

  const shoulderY = geometry.bodyCenterY - geometry.bodyRy + 2;
  const armLength = clamp(
    Math.floor(geometry.bodyRy * 0.8) +
      Math.floor(stats.arsenal / 34) +
      opts.armLengthBonus +
      geometry.limbLengthBias,
    2,
    Math.floor(pixels.length * 0.3),
  );
  const armThickness = clamp(
    1 + Math.floor(stats.guard / 45) + opts.armThicknessBonus,
    1,
    4,
  );

  const nearArmX = geometry.bodyCenterX + geometry.facing * (geometry.bodyRx + 1);
  const farArmX = geometry.bodyCenterX - geometry.facing * (geometry.bodyRx + 1);

  for (let t = 0; t < armThickness; t++) {
    for (let i = 0; i < armLength; i++) {
      setPixel(pixels, nearArmX + t * geometry.facing, shoulderY + i, colors.dark);
      if (t < Math.max(1, armThickness - 1)) {
        setPixel(pixels, farArmX - t * geometry.facing, shoulderY + i, colors.mid);
      }
    }
  }

  const legLength = clamp(
    Math.floor(geometry.bodyRy * 0.55) +
      1 +
      opts.legLengthBonus +
      geometry.limbLengthBias,
    2,
    Math.floor(pixels.length * 0.24),
  );
  const legGap = Math.max(2, Math.floor(geometry.bodyRx / 2));
  const legYStart = geometry.bodyCenterY + Math.floor(geometry.bodyRy * 0.45);
  const nearLegX = geometry.bodyCenterX + geometry.facing * legGap;
  const farLegX = geometry.bodyCenterX - geometry.facing * legGap;

  for (let y = legYStart; y < legYStart + legLength; y++) {
    for (let dx = 0; dx < opts.legWidth; dx++) {
      setPixel(
        pixels,
        nearLegX + dx * geometry.facing,
        y,
        colors.dark,
      );
      setPixel(
        pixels,
        farLegX - dx * geometry.facing,
        y,
        colors.mid,
      );
    }
  }

  const nearFootY = legYStart + legLength;
  for (let dx = -1; dx <= opts.legWidth + 1; dx++) {
    setPixel(
      pixels,
      nearLegX + dx * geometry.facing,
      nearFootY,
      colors.dark,
    );
    setPixel(
      pixels,
      farLegX - dx * geometry.facing,
      nearFootY,
      colors.mid,
    );
  }

  if (geometry.archetype === "slender") {
    const sashY = geometry.bodyCenterY;
    drawLine(
      pixels,
      geometry.bodyCenterX - 2,
      sashY,
      geometry.bodyCenterX + 2,
      sashY + 1,
      colors.dark,
    );
  }
}

function drawQuadrupedBody(
  pixels: number[][],
  geometry: BodyGeometry,
  colors: BodyColors,
  genome: VisualGenome,
): void {
  drawEllipse(
    pixels,
    geometry.bodyCenterX,
    geometry.bodyCenterY,
    Math.max(3, geometry.bodyRx + 1),
    Math.max(3, geometry.bodyRy - 2),
    colors.light,
  );

  drawEllipse(
    pixels,
    geometry.headCenterX,
    geometry.headCenterY,
    Math.max(3, geometry.headRx - 1),
    Math.max(3, geometry.headRy - 1),
    colors.mid,
  );

  drawLine(
    pixels,
    geometry.headCenterX - geometry.facing,
    geometry.headCenterY + geometry.headRy - 1,
    geometry.bodyCenterX + geometry.facing,
    geometry.bodyCenterY - geometry.bodyRy + 1,
    colors.mid,
  );

  drawShadowHalf(
    pixels,
    geometry.bodyCenterX,
    geometry.bodyCenterY,
    Math.max(3, geometry.bodyRx + 1),
    Math.max(3, geometry.bodyRy - 2),
    colors.mid,
    geometry.facing,
  );

  const legY = geometry.bodyCenterY + Math.floor((geometry.bodyRy - 1) * 0.5);
  const frontX = geometry.bodyCenterX + geometry.facing * (geometry.bodyRx - 1);
  const backX = geometry.bodyCenterX - geometry.facing * (geometry.bodyRx - 2);
  const legLength = clamp(4 + geometry.limbLengthBias, 2, 7);

  for (let i = 0; i < legLength; i++) {
    const nearColor = i % 2 === 0 ? colors.dark : colors.mid;
    setPixel(pixels, frontX, legY + i, nearColor);
    setPixel(pixels, frontX - geometry.facing, legY + i, colors.mid);
    setPixel(pixels, backX, legY + i, nearColor);
    setPixel(pixels, backX - geometry.facing, legY + i, colors.mid);
  }

  const tailBaseX = geometry.bodyCenterX - geometry.facing * (geometry.bodyRx + 1);
  const tailBaseY = geometry.bodyCenterY - 1;
  const tailLength = Math.max(
    2,
    Math.floor(geometry.bodyRx / 2) + geometry.tailLengthBias,
  );
  for (let i = 0; i < tailLength; i++) {
    setPixel(
      pixels,
      tailBaseX - geometry.facing * i,
      tailBaseY - Math.floor(i / 2),
      colors.dark,
    );
  }

  if (genome.armorLevel >= 2) {
    drawLine(
      pixels,
      geometry.bodyCenterX - geometry.bodyRx + 1,
      geometry.bodyCenterY,
      geometry.bodyCenterX + geometry.bodyRx - 1,
      geometry.bodyCenterY - 1,
      colors.dark,
    );
  }
}

function drawAvianBody(
  pixels: number[][],
  geometry: BodyGeometry,
  colors: BodyColors,
  genome: VisualGenome,
): void {
  drawEllipse(
    pixels,
    geometry.bodyCenterX,
    geometry.bodyCenterY,
    Math.max(3, geometry.bodyRx - 1),
    Math.max(3, geometry.bodyRy - 1),
    colors.light,
  );

  drawEllipse(
    pixels,
    geometry.headCenterX,
    geometry.headCenterY,
    Math.max(3, geometry.headRx - 1),
    Math.max(3, geometry.headRy - 2),
    colors.mid,
  );

  drawShadowHalf(
    pixels,
    geometry.bodyCenterX,
    geometry.bodyCenterY,
    Math.max(3, geometry.bodyRx - 1),
    Math.max(3, geometry.bodyRy - 1),
    colors.mid,
    geometry.facing,
  );

  const wingBaseY = geometry.bodyCenterY - 1;
  const nearWingBaseX = geometry.bodyCenterX + geometry.facing * (geometry.bodyRx - 1);
  const farWingBaseX = geometry.bodyCenterX - geometry.facing * (geometry.bodyRx - 1);
  const wingSpan = Math.max(
    3,
    Math.floor(geometry.bodyRx * 1.1) + Math.max(0, geometry.tailLengthBias),
  );

  for (let i = 0; i < wingSpan; i++) {
    setPixel(
      pixels,
      nearWingBaseX + geometry.facing * i,
      wingBaseY + Math.floor(i / 2),
      colors.dark,
    );
    setPixel(
      pixels,
      farWingBaseX - geometry.facing * i,
      wingBaseY + Math.floor(i / 3),
      colors.mid,
    );
  }

  const beakX = geometry.headCenterX + geometry.facing * (geometry.headRx + 1);
  const beakY = geometry.headCenterY + 1;
  setPixel(pixels, beakX, beakY, colors.dark);
  setPixel(pixels, beakX + geometry.facing, beakY, colors.dark);

  const legYStart = geometry.bodyCenterY + Math.floor(geometry.bodyRy * 0.5);
  const legGap = Math.max(1, Math.floor(geometry.bodyRx / 3));
  const legLength = clamp(3 + geometry.limbLengthBias, 2, 6);
  for (let i = 0; i < legLength; i++) {
    setPixel(pixels, geometry.bodyCenterX - legGap, legYStart + i, colors.dark);
    setPixel(pixels, geometry.bodyCenterX + legGap, legYStart + i, colors.mid);
  }

  if (genome.armorLevel >= 3) {
    drawEllipse(
      pixels,
      geometry.bodyCenterX,
      geometry.bodyCenterY,
      Math.max(2, Math.floor(geometry.bodyRx / 2)),
      2,
      colors.dark,
    );
  }
}

function drawSerpentBody(
  pixels: number[][],
  geometry: BodyGeometry,
  colors: BodyColors,
  genome: VisualGenome,
): void {
  const segments = clamp(11 + geometry.tailLengthBias, 8, 17);
  const wave = Math.max(2, Math.floor((geometry.bodyRy + geometry.headRy) / 3));
  const bodyLength = Math.max(
    8,
    Math.floor(geometry.bodyRx * 2.3) + geometry.tailLengthBias * 2,
  );

  for (let i = 0; i < segments; i++) {
    const t = i / (segments - 1);
    const x = Math.round(
      geometry.bodyCenterX +
        (t - 0.5) * bodyLength * geometry.facing,
    );
    const y = Math.round(
      geometry.bodyCenterY +
        Math.sin((t + genome.poseOffset * 0.12) * Math.PI * 2) * wave,
    );

    const color = i % 2 === 0 ? colors.light : colors.mid;
    drawEllipse(pixels, x, y, 2, 1, color);
  }

  drawEllipse(
    pixels,
    geometry.headCenterX,
    geometry.headCenterY,
    Math.max(3, geometry.headRx),
    Math.max(3, geometry.headRy - 1),
    colors.mid,
  );

  drawShadowHalf(
    pixels,
    geometry.headCenterX,
    geometry.headCenterY,
    Math.max(3, geometry.headRx),
    Math.max(3, geometry.headRy - 1),
    colors.dark,
    geometry.facing,
  );

  const tailX = geometry.bodyCenterX - geometry.facing * Math.floor(bodyLength / 2) - geometry.facing;
  const tailY = geometry.bodyCenterY + 1;
  setPixel(pixels, tailX, tailY, colors.dark);
  setPixel(pixels, tailX - geometry.facing, tailY, colors.dark);
}

function drawArmorPlate(
  pixels: number[][],
  geometry: BodyGeometry,
  color: number,
  armorLevel: number,
): void {
  const plateHeight = 1 + Math.floor(armorLevel / 2);
  const plateWidth = Math.max(3, Math.floor(geometry.bodyRx * 1.2));
  const plateX = geometry.bodyCenterX - Math.floor(plateWidth / 2);
  const plateY = geometry.bodyCenterY - Math.floor(plateHeight / 2);

  drawRect(pixels, plateX, plateY, plateWidth, plateHeight, color);

  if (armorLevel >= 3) {
    drawLine(
      pixels,
      plateX,
      plateY - 1,
      plateX + plateWidth,
      plateY - 1,
      color,
    );
  }
}

function generatePatternLayer(
  size: number,
  geometry: BodyGeometry,
  accent: number,
  accentLight: number,
  rune: number,
  spot: number,
  genome: VisualGenome,
): SpriteLayer {
  const pixels = createGrid(size);

  const left = geometry.bodyCenterX - geometry.bodyRx + 2;
  const right = geometry.bodyCenterX + geometry.bodyRx - 2;
  const top = geometry.bodyCenterY - geometry.bodyRy + 2;
  const bottom = geometry.bodyCenterY + geometry.bodyRy - 2;

  const accentColor = genome.patternStyle % 2 === 0 ? accentLight : accent;
  const secondaryColor = genome.patternStyle % 3 === 0 ? rune : spot;

  switch (genome.patternStyle) {
    case 0: {
      drawEllipse(
        pixels,
        geometry.bodyCenterX,
        geometry.bodyCenterY,
        2 + Math.floor(genome.patternDensity / 2),
        2,
        accentColor,
      );
      if (genome.patternDensity >= 3) {
        drawEllipse(
          pixels,
          geometry.bodyCenterX,
          geometry.bodyCenterY,
          4,
          1,
          secondaryColor,
        );
      }
      break;
    }
    case 1: {
      const stripeCount = genome.patternDensity + 1;
      for (let i = 1; i <= stripeCount; i++) {
        const x = left + Math.floor((i * (right - left)) / (stripeCount + 1));
        for (let y = top; y <= bottom; y++) {
          setPixel(pixels, x, y, accentColor);
        }
      }
      break;
    }
    case 2: {
      const lanes = genome.patternDensity;
      for (let lane = 0; lane < lanes; lane++) {
        for (let y = top; y <= bottom; y++) {
          const x = left + ((y - top + lane * 2) % Math.max(1, right - left + 1));
          setPixel(pixels, x, y, accentColor);
        }
      }
      break;
    }
    case 3: {
      drawLine(pixels, left, top, right, bottom, accentColor);
      drawLine(pixels, right, top, left, bottom, accentColor);
      if (genome.patternDensity >= 3) {
        drawLine(
          pixels,
          geometry.bodyCenterX,
          top,
          geometry.bodyCenterX,
          bottom,
          secondaryColor,
        );
      }
      break;
    }
    case 4: {
      const radius = Math.max(2, Math.floor((right - left) / 3));
      const count = 4 + genome.patternDensity;
      for (let i = 0; i < count; i++) {
        const angle = (i * Math.PI * 2) / count;
        const x = Math.round(geometry.bodyCenterX + radius * Math.cos(angle));
        const y = Math.round(geometry.bodyCenterY + radius * Math.sin(angle));
        setPixel(pixels, x, y, accentColor);
      }
      setPixel(pixels, geometry.bodyCenterX, geometry.bodyCenterY, secondaryColor);
      break;
    }
  }

  return {
    name: "pattern",
    pixels,
    offsetX: 0,
    offsetY: 0,
  };
}

function generateFaceLayer(
  size: number,
  geometry: BodyGeometry,
  outline: number,
  eyeWhite: number,
  eyeIris: number,
  eyeSpark: number,
  genome: VisualGenome,
): SpriteLayer {
  const pixels = createGrid(size);

  const nearSide = geometry.facing;
  const nearEyeX = geometry.headCenterX + nearSide * Math.max(1, Math.floor(geometry.headRx * 0.3));
  const farEyeX = geometry.headCenterX - nearSide * Math.max(2, Math.floor(geometry.headRx * 0.55));
  const eyeY = geometry.headCenterY - Math.max(1, Math.floor(geometry.headRy * 0.18));

  switch (genome.eyeStyle) {
    case 0: {
      drawRect(pixels, nearEyeX - 1, eyeY - 1, 2, 2, eyeWhite);
      drawRect(pixels, farEyeX, eyeY - 1, 1, 2, eyeWhite);
      setPixel(pixels, nearEyeX, eyeY, eyeIris);
      setPixel(pixels, farEyeX, eyeY, eyeIris);
      setPixel(pixels, nearEyeX - 1, eyeY - 1, eyeSpark);
      break;
    }
    case 1: {
      drawLine(pixels, nearEyeX - 2, eyeY, nearEyeX + 1, eyeY, eyeWhite);
      drawLine(pixels, farEyeX - 1, eyeY, farEyeX + 1, eyeY, eyeWhite);
      setPixel(pixels, nearEyeX, eyeY, eyeIris);
      setPixel(pixels, farEyeX, eyeY, eyeIris);
      break;
    }
    case 2: {
      drawLine(pixels, farEyeX - 1, eyeY, nearEyeX + 2, eyeY, eyeWhite);
      setPixel(pixels, nearEyeX, eyeY, eyeIris);
      setPixel(pixels, farEyeX, eyeY, eyeIris);
      break;
    }
    case 3: {
      drawLine(pixels, nearEyeX, eyeY - 1, nearEyeX, eyeY + 1, eyeWhite);
      drawLine(pixels, farEyeX, eyeY - 1, farEyeX, eyeY + 1, eyeWhite);
      setPixel(pixels, nearEyeX, eyeY, eyeIris);
      setPixel(pixels, farEyeX, eyeY, eyeIris);
      break;
    }
  }

  const mouthX = geometry.headCenterX + nearSide;
  const mouthY = geometry.headCenterY + Math.max(1, Math.floor(geometry.headRy * 0.45));

  switch (genome.mouthStyle) {
    case 0: {
      drawLine(
        pixels,
        mouthX - 2,
        mouthY,
        mouthX + 2,
        mouthY,
        outline,
      );
      setPixel(pixels, mouthX - 2, mouthY + 1, outline);
      setPixel(pixels, mouthX + 2, mouthY + 1, outline);
      break;
    }
    case 1: {
      drawLine(
        pixels,
        mouthX - 2,
        mouthY,
        mouthX + 2,
        mouthY,
        outline,
      );
      break;
    }
    case 2: {
      drawLine(
        pixels,
        mouthX - 2,
        mouthY,
        mouthX + 2,
        mouthY,
        outline,
      );
      setPixel(pixels, mouthX - 1, mouthY + 1, eyeWhite);
      setPixel(pixels, mouthX + 1, mouthY + 1, eyeWhite);
      break;
    }
    case 3: {
      drawRect(pixels, mouthX - 1, mouthY, 3, 2, outline);
      setPixel(pixels, mouthX, mouthY + 1, 0);
      break;
    }
  }

  if (geometry.archetype === "avian") {
    const beakX = geometry.headCenterX + nearSide * (geometry.headRx + 1);
    const beakY = geometry.headCenterY + 1;
    setPixel(pixels, beakX, beakY, outline);
  }

  return {
    name: "face",
    pixels,
    offsetX: 0,
    offsetY: 0,
  };
}

function generateHornLayer(
  size: number,
  geometry: BodyGeometry,
  hornDark: number,
  hornMid: number,
  hornLight: number,
  genome: VisualGenome,
): SpriteLayer {
  const pixels = createGrid(size);
  const baseY = geometry.headCenterY - geometry.headRy - 1;

  switch (genome.hornStyle) {
    case 0: {
      setPixel(pixels, geometry.headCenterX, baseY, hornLight);
      setPixel(pixels, geometry.headCenterX, baseY - 1, hornMid);
      break;
    }
    case 1: {
      const offset = Math.max(2, Math.floor(geometry.headRx * 0.5));
      drawLine(
        pixels,
        geometry.headCenterX - offset,
        baseY,
        geometry.headCenterX - offset - 1,
        baseY - 2,
        hornMid,
      );
      drawLine(
        pixels,
        geometry.headCenterX + offset,
        baseY,
        geometry.headCenterX + offset + 1,
        baseY - 2,
        hornMid,
      );
      setPixel(pixels, geometry.headCenterX - offset - 1, baseY - 2, hornLight);
      setPixel(pixels, geometry.headCenterX + offset + 1, baseY - 2, hornLight);
      break;
    }
    case 2: {
      const wingY = baseY + 1;
      const wingSize = Math.max(2, Math.floor(geometry.headRx * 0.5));
      for (let i = 0; i < wingSize; i++) {
        setPixel(pixels, geometry.headCenterX - geometry.headRx - i, wingY + i, hornLight);
        setPixel(pixels, geometry.headCenterX + geometry.headRx + i, wingY + i, hornLight);
      }
      break;
    }
    case 3: {
      const crestWidth = Math.max(4, Math.floor(geometry.headRx * 1.4));
      const startX = geometry.headCenterX - Math.floor(crestWidth / 2);
      drawLine(
        pixels,
        startX,
        baseY,
        startX + crestWidth,
        baseY,
        hornLight,
      );
      setPixel(pixels, geometry.headCenterX, baseY - 1, hornMid);
      setPixel(pixels, geometry.headCenterX, baseY - 2, hornDark);
      break;
    }
  }

  if (geometry.archetype === "serpent") {
    setPixel(
      pixels,
      geometry.headCenterX + geometry.facing * (geometry.headRx + 1),
      geometry.headCenterY - 1,
      hornLight,
    );
  }

  return {
    name: "horn",
    pixels,
    offsetX: 0,
    offsetY: 0,
  };
}

function generateMotifLayer(
  size: number,
  geometry: BodyGeometry,
  accent: number,
  accentLight: number,
  accentDark: number,
  rune: number,
  runeLight: number,
): SpriteLayer {
  const pixels = createGrid(size);
  const motifs = geometry.motifParts;
  if (motifs.length === 0) {
    return {
      name: "motif",
      pixels,
      offsetX: 0,
      offsetY: 0,
    };
  }

  for (const motif of motifs) {
    switch (motif) {
      case "crest": {
        const crestY = geometry.headCenterY - geometry.headRy - 2;
        drawLine(
          pixels,
          geometry.headCenterX - 2,
          crestY + 1,
          geometry.headCenterX,
          crestY - 1,
          accentLight,
        );
        drawLine(
          pixels,
          geometry.headCenterX,
          crestY - 1,
          geometry.headCenterX + 2,
          crestY + 1,
          accent,
        );
        break;
      }
      case "antenna": {
        const antennaBaseX = geometry.headCenterX + geometry.facing;
        const antennaBaseY = geometry.headCenterY - geometry.headRy;
        drawLine(
          pixels,
          antennaBaseX,
          antennaBaseY,
          antennaBaseX + geometry.facing * 2,
          antennaBaseY - 3,
          rune,
        );
        setPixel(
          pixels,
          antennaBaseX + geometry.facing * 2,
          antennaBaseY - 4,
          runeLight,
        );
        break;
      }
      case "mantle": {
        const mantleY = geometry.bodyCenterY - 1;
        drawLine(
          pixels,
          geometry.bodyCenterX - geometry.bodyRx,
          mantleY,
          geometry.bodyCenterX + geometry.bodyRx,
          mantleY,
          accentDark,
        );
        drawLine(
          pixels,
          geometry.bodyCenterX - geometry.bodyRx + 1,
          mantleY + 1,
          geometry.bodyCenterX + geometry.bodyRx - 1,
          mantleY + 1,
          accent,
        );
        break;
      }
      case "fins": {
        const finY = geometry.bodyCenterY - 1;
        for (let i = 0; i < 3; i++) {
          setPixel(
            pixels,
            geometry.bodyCenterX + geometry.facing * (geometry.bodyRx + i),
            finY + i,
            accentLight,
          );
          setPixel(
            pixels,
            geometry.bodyCenterX - geometry.facing * (geometry.bodyRx + i),
            finY + i + 1,
            accent,
          );
        }
        break;
      }
      case "claws": {
        const clawY = geometry.bodyCenterY + geometry.bodyRy;
        setPixel(
          pixels,
          geometry.bodyCenterX + geometry.facing * Math.max(1, geometry.bodyRx - 1),
          clawY + 1,
          accentLight,
        );
        setPixel(
          pixels,
          geometry.bodyCenterX + geometry.facing * Math.max(1, geometry.bodyRx),
          clawY + 1,
          accentLight,
        );
        setPixel(
          pixels,
          geometry.bodyCenterX - geometry.facing * Math.max(1, geometry.bodyRx - 1),
          clawY + 1,
          accent,
        );
        break;
      }
      case "tailSpike": {
        const tailBaseX = geometry.bodyCenterX - geometry.facing * (geometry.bodyRx + 1);
        const tailBaseY = geometry.bodyCenterY + 1;
        drawLine(
          pixels,
          tailBaseX,
          tailBaseY,
          tailBaseX - geometry.facing * 4,
          tailBaseY + 1,
          accentDark,
        );
        setPixel(
          pixels,
          tailBaseX - geometry.facing * 4,
          tailBaseY + 1,
          accentLight,
        );
        break;
      }
      case "orb": {
        const orbX = geometry.headCenterX + geometry.facing * (geometry.headRx + 2);
        const orbY = geometry.headCenterY - 1;
        drawEllipse(pixels, orbX, orbY, 1, 1, rune);
        setPixel(pixels, orbX, orbY, runeLight);
        break;
      }
      case "pack": {
        const packX = geometry.bodyCenterX - geometry.facing * (geometry.bodyRx - 1);
        const packY = geometry.bodyCenterY;
        drawRect(pixels, packX - 1, packY - 1, 3, 3, accentDark);
        setPixel(pixels, packX, packY, accentLight);
        break;
      }
      case "scarf": {
        const scarfY = geometry.headCenterY + geometry.headRy - 1;
        drawLine(
          pixels,
          geometry.headCenterX - 3,
          scarfY,
          geometry.headCenterX + 3,
          scarfY,
          accent,
        );
        drawLine(
          pixels,
          geometry.headCenterX + geometry.facing * 2,
          scarfY + 1,
          geometry.headCenterX + geometry.facing * 4,
          scarfY + 3,
          accentLight,
        );
        break;
      }
    }
  }

  return {
    name: "motif",
    pixels,
    offsetX: 0,
    offsetY: 0,
  };
}

function generateWeaponLayer(
  size: number,
  facing: -1 | 1,
  weaponMid: number,
  weaponDark: number,
  weaponCore: number,
  weaponGlow: number,
  arsenal: number,
  genome: VisualGenome,
): SpriteLayer {
  const pixels = createGrid(size);

  const direction = facing;
  const centerX = facing === 1 ? Math.floor(size * 0.8) : Math.floor(size * 0.2);
  const centerY = Math.floor(size * 0.5);
  const length = clamp(5 + Math.floor(arsenal / 10), 5, Math.floor(size * 0.48));
  const thickness = size >= 48 ? 2 : 1;

  switch (genome.weaponStyle) {
    case 0: {
      // Blade weapon
      for (let i = 0; i < length; i++) {
        setPixel(pixels, centerX, centerY - i, weaponDark);
        setPixel(pixels, centerX - direction, centerY - i, weaponMid);
        if (thickness > 1) {
          setPixel(pixels, centerX - direction * 2, centerY - i, weaponMid);
        }
      }
      setPixel(pixels, centerX - direction, centerY - length, weaponGlow);
      setPixel(pixels, centerX - direction * 2, centerY - length + 1, weaponGlow);
      setPixel(pixels, centerX, centerY - length + 1, PIXEL_INDEX.highlight);
      for (let i = 0; i <= 3; i++) {
        setPixel(pixels, centerX, centerY + i, weaponDark);
        setPixel(pixels, centerX - direction, centerY + i, weaponMid);
      }
      drawLine(
        pixels,
        centerX,
        centerY + 1,
        centerX - direction * 3,
        centerY + 2,
        weaponMid,
      );
      break;
    }
    case 1: {
      // Staff weapon
      for (let i = 0; i < length + 3; i++) {
        setPixel(pixels, centerX, centerY - i, weaponDark);
        setPixel(pixels, centerX - direction, centerY - i, weaponMid);
        if (thickness > 1) {
          setPixel(pixels, centerX - direction * 2, centerY - i, weaponMid);
        }
      }
      drawEllipse(
        pixels,
        centerX - direction,
        centerY - length - 2,
        2,
        2,
        weaponCore,
      );
      setPixel(pixels, centerX - direction, centerY - length - 2, weaponGlow);
      setPixel(pixels, centerX - direction * 2, centerY - length - 2, weaponGlow);
      drawLine(
        pixels,
        centerX,
        centerY + 1,
        centerX - direction * 3,
        centerY + 2,
        weaponMid,
      );
      break;
    }
    case 2: {
      // Cannon-like weapon
      const barrel = Math.max(5, Math.floor(length * 0.9));
      for (let i = 0; i < barrel; i++) {
        const x = centerX + i * direction;
        drawRect(
          pixels,
          x,
          centerY - 2,
          direction === 1 ? 1 : -1,
          4 + thickness,
          weaponDark,
        );
        setPixel(pixels, x, centerY - 1, weaponMid);
      }
      const muzzleX = centerX + (barrel - 1) * direction;
      drawEllipse(pixels, muzzleX, centerY, 1, 1, weaponCore);
      setPixel(pixels, muzzleX, centerY, weaponGlow);
      for (let i = 0; i < 4; i++) {
        setPixel(pixels, centerX - direction * i, centerY + 3, weaponMid);
      }
      break;
    }
    case 3: {
      // Shield-like weapon
      const shieldX = centerX + direction * 2;
      drawEllipse(pixels, shieldX, centerY, 3, 4, weaponDark);
      drawEllipse(pixels, shieldX, centerY, 2, 3, weaponMid);
      drawLine(
        pixels,
        shieldX - 1,
        centerY,
        shieldX + 1,
        centerY,
        weaponCore,
      );
      setPixel(pixels, shieldX, centerY, weaponGlow);
      setPixel(pixels, centerX, centerY + 1, weaponMid);
      break;
    }
  }

  return {
    name: "weapon",
    pixels: applyOutline(pixels, PIXEL_INDEX.outline),
    offsetX: 0,
    offsetY: 0,
  };
}

function generateAuraLayer(
  size: number,
  auraColor: number,
  sparkleColor: number,
  genome: VisualGenome,
  synergy: number,
): SpriteLayer {
  const pixels = createGrid(size);
  const center = Math.floor(size / 2);
  const radius = Math.floor(size * 0.44);
  const count = clamp(8 + Math.floor(synergy / 12), 8, 16);

  switch (genome.auraStyle) {
    case 0: {
      for (let i = 0; i < count; i++) {
        const angle = (i * Math.PI * 2) / count;
        const x = Math.round(center + radius * Math.cos(angle));
        const y = Math.round(center + radius * Math.sin(angle));
        setPixel(pixels, x, y, auraColor);
      }
      break;
    }
    case 1: {
      const points = [
        [2, 2],
        [size - 3, 2],
        [2, size - 3],
        [size - 3, size - 3],
        [center, 1],
        [center, size - 2],
        [1, center],
        [size - 2, center],
      ];
      for (const [x, y] of points) {
        setPixel(pixels, x, y, sparkleColor);
      }
      break;
    }
    case 2: {
      for (let i = 0; i < count; i++) {
        const angle = (i * Math.PI * 2) / count;
        const x = Math.round(center + radius * Math.cos(angle));
        const y = Math.round(center + radius * Math.sin(angle));
        setPixel(pixels, x, y, auraColor);
        setPixel(pixels, x + 1, y, sparkleColor);
      }
      drawLine(pixels, center, center - radius, center, center + radius, auraColor);
      drawLine(pixels, center - radius, center, center + radius, center, auraColor);
      break;
    }
    case 3: {
      const innerRadius = Math.max(2, radius - 3);
      for (let i = 0; i < count; i++) {
        const angle = (i * Math.PI * 2) / count;
        const x = Math.round(center + radius * Math.cos(angle));
        const y = Math.round(center + radius * Math.sin(angle));
        const x2 = Math.round(center + innerRadius * Math.cos(angle + 0.4));
        const y2 = Math.round(center + innerRadius * Math.sin(angle + 0.4));
        setPixel(pixels, x, y, auraColor);
        setPixel(pixels, x2, y2, sparkleColor);
      }
      break;
    }
  }

  return {
    name: "aura",
    pixels,
    offsetX: 0,
    offsetY: 0,
  };
}

function drawShadowHalf(
  pixels: number[][],
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  shadowColor: number,
  handedness: -1 | 1,
): void {
  const shadowSide = handedness === 1 ? 1 : -1;

  for (let y = cy - ry - 1; y <= cy + ry + 1; y++) {
    for (let x = cx - rx - 1; x <= cx + rx + 1; x++) {
      const nx = (x - cx) / Math.max(1, rx);
      const ny = (y - cy) / Math.max(1, ry);
      if (nx * nx + ny * ny <= 1 && (x - cx) * shadowSide > 0) {
        if ((x + y) % 2 === 0) {
          setPixel(pixels, x, y, shadowColor);
        }
      }
    }
  }
}

function createGrid(size: number): number[][] {
  return Array.from({ length: size }, () => Array(size).fill(0));
}

function hasVisiblePixels(pixels: number[][]): boolean {
  for (const row of pixels) {
    for (const px of row) {
      if (px !== 0) {
        return true;
      }
    }
  }
  return false;
}

function setPixel(pixels: number[][], x: number, y: number, color: number): void {
  if (y < 0 || y >= pixels.length) return;
  const row = pixels[y];
  if (!row || x < 0 || x >= row.length) return;
  if (color === 0) {
    row[x] = 0;
    return;
  }
  row[x] = color;
}

function drawEllipse(
  pixels: number[][],
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  color: number,
): void {
  for (let y = cy - ry - 1; y <= cy + ry + 1; y++) {
    for (let x = cx - rx - 1; x <= cx + rx + 1; x++) {
      const nx = (x - cx) / Math.max(1, rx);
      const ny = (y - cy) / Math.max(1, ry);
      if (nx * nx + ny * ny <= 1) {
        setPixel(pixels, x, y, color);
      }
    }
  }
}

function drawRect(
  pixels: number[][],
  x: number,
  y: number,
  width: number,
  height: number,
  color: number,
): void {
  const xStep = width >= 0 ? 1 : -1;
  const yStep = height >= 0 ? 1 : -1;

  for (let dy = 0; dy < Math.abs(height); dy++) {
    for (let dx = 0; dx < Math.abs(width); dx++) {
      setPixel(
        pixels,
        x + dx * xStep,
        y + dy * yStep,
        color,
      );
    }
  }
}

function drawLine(
  pixels: number[][],
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  color: number,
): void {
  let currentX = x0;
  let currentY = y0;

  const deltaX = Math.abs(x1 - currentX);
  const deltaY = Math.abs(y1 - currentY);
  const stepX = currentX < x1 ? 1 : -1;
  const stepY = currentY < y1 ? 1 : -1;

  let error = deltaX - deltaY;

  while (true) {
    setPixel(pixels, currentX, currentY, color);
    if (currentX === x1 && currentY === y1) break;
    const twiceError = error * 2;
    if (twiceError > -deltaY) {
      error -= deltaY;
      currentX += stepX;
    }
    if (twiceError < deltaX) {
      error += deltaX;
      currentY += stepY;
    }
  }
}

function applyOutline(pixels: number[][], outlineColor: number): number[][] {
  const height = pixels.length;
  const width = pixels[0]?.length ?? 0;
  const result = pixels.map((row) => [...row]);
  const directions = [
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1],
  ];

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (pixels[y][x] === 0) continue;

      for (const [dx, dy] of directions) {
        const nx = x + dx;
        const ny = y + dy;
        if (ny < 0 || ny >= height || nx < 0 || nx >= width) continue;
        if (pixels[ny][nx] === 0 && result[ny][nx] === 0) {
          result[ny][nx] = outlineColor;
        }
      }
    }
  }

  return result;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export { STAGE_SIZES };
