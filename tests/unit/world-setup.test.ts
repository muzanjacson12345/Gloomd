import { describe, expect, it } from "vitest";
import { clampStartingPopulation, clampWaterCoverage, WORLD_SIZE_PRESETS } from "../../src/ui/world-setup";

describe("world setup population selection", () => {
  it("clamps low and high values to the supported population range", () => {
    expect(clampStartingPopulation(0)).toBe(5);
    expect(clampStartingPopulation(5)).toBe(5);
    expect(clampStartingPopulation(30)).toBe(30);
    expect(clampStartingPopulation(100)).toBe(30);
  });

  it("rounds fractional values to a whole person", () => {
    expect(clampStartingPopulation(12.2)).toBe(12);
    expect(clampStartingPopulation(12.8)).toBe(13);
  });

  it("uses the default population for non-finite values", () => {
    expect(clampStartingPopulation(Number.NaN)).toBe(12);
    expect(clampStartingPopulation(Number.POSITIVE_INFINITY)).toBe(12);
  });
  it("offers tested map sizes from Small through Huge", () => {
    expect(WORLD_SIZE_PRESETS).toEqual([
      { id: "small", label: "SMALL · 64 × 48", width: 64, height: 48 },
      { id: "standard", label: "STANDARD · 128 × 96", width: 128, height: 96 },
      { id: "large", label: "LARGE · 192 × 144", width: 192, height: 144 },
      { id: "huge", label: "HUGE · 256 × 192", width: 256, height: 192 }
    ]);
  });

  it("clamps water coverage to the supported range and defaults invalid values", () => {
    expect(clampWaterCoverage(0)).toBe(0.25);
    expect(clampWaterCoverage(0.25)).toBe(0.25);
    expect(clampWaterCoverage(0.55)).toBe(0.55);
    expect(clampWaterCoverage(0.9)).toBe(0.55);
    expect(clampWaterCoverage(Number.NaN)).toBe(0.38);
  });
});
