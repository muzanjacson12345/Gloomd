import { describe, expect, it } from "vitest";
import { FixedStepClock } from "../../src/app/fixed-step-clock";

describe("fixed-step simulation clock", () => {
  it("runs one simulation tick for each complete time step", () => {
    const clock = new FixedStepClock(100, 4);
    let ticks = 0;

    expect(clock.advance(40, true, () => ticks += 1)).toBe(0);
    expect(clock.advance(60, true, () => ticks += 1)).toBe(1);
    expect(clock.advance(200, true, () => ticks += 1)).toBe(2);
    expect(ticks).toBe(3);
  });

  it("clears accumulated time while paused or hidden and resumes without catch-up", () => {
    const clock = new FixedStepClock(100, 4);
    let ticks = 0;

    expect(clock.advance(90, true, () => ticks += 1)).toBe(0);
    expect(clock.advance(60_000, false, () => ticks += 1)).toBe(0);
    expect(clock.advance(10, true, () => ticks += 1)).toBe(0);
    expect(clock.advance(90, true, () => ticks += 1)).toBe(1);
    expect(ticks).toBe(1);
  });

  it("caps the number of ticks processed in a single frame", () => {
    const clock = new FixedStepClock(100, 3);
    let ticks = 0;

    expect(clock.advance(10_000, true, () => ticks += 1)).toBe(3);
    expect(clock.advance(0, true, () => ticks += 1)).toBe(0);
    expect(ticks).toBe(3);
  });

  it("rejects invalid elapsed time while active", () => {
    const clock = new FixedStepClock();
    expect(() => clock.advance(-1, true, () => undefined)).toThrow(RangeError);
    expect(() => clock.advance(Number.NaN, true, () => undefined)).toThrow(RangeError);
  });
});
