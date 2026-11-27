import type { StatefulRandomSource } from "./types";

const ZERO_SEED_FALLBACK = 0x6d2b79f5;

export function createRandom(seed: number): StatefulRandomSource {
  if (!Number.isSafeInteger(seed)) {
    throw new RangeError("Random seed must be a safe integer.");
  }

  let state = seed >>> 0;
  if (state === 0) state = ZERO_SEED_FALLBACK;

  return {
    next(): number {
      state ^= state << 13;
      state ^= state >>> 17;
      state ^= state << 5;
      return (state >>> 0) / 0x1_0000_0000;
    },

    int(min: number, max: number): number {
      if (!Number.isInteger(min) || !Number.isInteger(max) || max < min) {
        throw new RangeError("Random integer bounds must be whole numbers with max >= min.");
      }

      return min + Math.floor(this.next() * (max - min + 1));
    },

    getState(): number {
      return state >>> 0;
    }
  };
}
