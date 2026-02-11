/**
 * Deterministic 32-bit FNV-1a hash.
 */
export function hashStringToUint32(input: string): number {
  let hash = 0x811c9dc5;

  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }

  return hash >>> 0;
}

/**
 * Deterministic PRNG based on Mulberry32.
 * Returns numbers in [0, 1).
 */
export function createSeededRng(seed: number): () => number {
  let state = seed >>> 0;

  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function randomInt(rng: () => number, min: number, maxExclusive: number): number {
  return Math.floor(rng() * (maxExclusive - min)) + min;
}
