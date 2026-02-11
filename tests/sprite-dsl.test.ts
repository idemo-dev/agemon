import { describe, expect, it } from "vitest";
import { compileSpriteDsl } from "../src/pixel/sprite-dsl.js";
import { PALETTE } from "../src/pixel/palette.js";

describe("sprite-dsl", () => {
  it("compiles rows + symbols + overlays into sprite asset", () => {
    const result = compileSpriteDsl(makeDslRows(24), {
      expectedSize: 24,
      fallbackPalette: [...PALETTE],
    });

    expect(result.ok).toBe(true);
    expect(result.errors).toEqual([]);
    expect(result.asset?.layers).toHaveLength(1);
    expect(result.asset?.layers[0]?.pixels[12][17]).toBe(6);
  });

  it("compiles multi-layer dsl", () => {
    const result = compileSpriteDsl(makeDslLayers(24), {
      expectedSize: 24,
      fallbackPalette: [...PALETTE],
    });

    expect(result.ok).toBe(true);
    expect(result.asset?.layers).toHaveLength(2);
    expect(result.asset?.layers[1]?.name).toBe("fx");
    expect(result.asset?.layers[1]?.pixels[4][9]).toBe(9);
  });

  it("fails when symbols are missing or invalid", () => {
    const result = compileSpriteDsl(
      {
        width: 24,
        height: 24,
        rows: Array.from({ length: 24 }, () => ".".repeat(24)),
      },
      {
        expectedSize: 24,
        fallbackPalette: [...PALETTE],
      },
    );

    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.includes("symbols"))).toBe(true);
  });

  it("coerces uneven row widths and row counts", () => {
    const result = compileSpriteDsl(
      {
        width: 24,
        height: 24,
        palette: [...PALETTE],
        symbols: { ".": 0, B: 3, A: 6 },
        rows: [
          "\"....BBBB....\",",
          ".....BBBB.....",
          "....BBBB....",
        ],
      },
      {
        expectedSize: 24,
        fallbackPalette: [...PALETTE],
      },
    );

    expect(result.ok).toBe(true);
    expect(result.asset?.layers[0]?.pixels.length).toBe(24);
    expect(result.asset?.layers[0]?.pixels[0]?.length).toBe(24);
  });
});

function makeDslRows(size: number) {
  const rows = Array.from({ length: size }, (_, y) => {
    const chars: string[] = [];
    for (let x = 0; x < size; x++) {
      if (x >= 8 && x <= 14 && y >= 5 && y <= 17) {
        chars.push("B");
      } else if (x >= 10 && x <= 12 && y >= 2 && y <= 5) {
        chars.push("H");
      } else if (x >= 14 && x <= 16 && y >= 10 && y <= 13) {
        chars.push("A");
      } else {
        chars.push(".");
      }
    }
    return chars.join("");
  });

  return {
    width: size,
    height: size,
    palette: [...PALETTE],
    symbols: {
      ".": 0,
      B: 3,
      H: 4,
      A: 6,
      S: 9,
    },
    rows,
    overlays: [
      { x: 17, y: 12, ch: "A" },
      { x: 9, y: 4, ch: "S" },
    ],
  };
}

function makeDslLayers(size: number) {
  const emptyRows = Array.from({ length: size }, () => ".".repeat(size));

  const bodyRows = emptyRows.map((row, y) => {
    if (y < 6 || y > 18) return row;
    return row
      .split("")
      .map((ch, x) => (x >= 8 && x <= 14 ? "B" : ch))
      .join("");
  });

  const fxRows = emptyRows.map((row, y) => {
    if (y === 4) {
      return row
        .split("")
        .map((ch, x) => (x === 9 || x === 10 ? "S" : ch))
        .join("");
    }
    return row;
  });

  return {
    width: size,
    height: size,
    palette: [...PALETTE],
    symbols: {
      ".": 0,
      B: 3,
      S: 9,
    },
    layers: [
      {
        name: "body",
        offsetX: 0,
        offsetY: 0,
        rows: bodyRows,
      },
      {
        name: "fx",
        offsetX: 0,
        offsetY: 0,
        rows: fxRows,
      },
    ],
  };
}
