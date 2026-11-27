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

  it("reports only newly accepted time before executing ticks when frame catch-up is capped", () => {
    const clock = new FixedStepClock(100, 3);
    const accepted: number[] = [];
    let ticks = 0;

    clock.advance(60, true, () => ticks += 1, (elapsed) => accepted.push(elapsed));
    clock.advance(10_000, true, () => ticks += 1, (elapsed) => accepted.push(elapsed));

    expect(accepted).toEqual([60, 240]);
    expect(ticks).toBe(3);
  });

  it("does not advance animation time while paused or hidden", () => {
    const clock = new FixedStepClock(100, 3);
    const accepted: number[] = [];
    clock.advance(60, false, () => undefined, (elapsed) => accepted.push(elapsed));
    expect(accepted).toEqual([]);
  });

});
