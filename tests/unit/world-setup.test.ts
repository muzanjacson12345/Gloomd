import { describe, expect, it } from "vitest";
import { clampStartingPopulation } from "../../src/ui/world-setup";

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
});
