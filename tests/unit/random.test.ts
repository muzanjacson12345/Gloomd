import { describe, expect, it } from "vitest";

describe("seeded random source", () => {
  it("returns the same sequence for the same seed", async () => {
    const modulePath = "../../src/core/random.ts";
    const randomModule = await import(/* @vite-ignore */ modulePath).catch(() => null);

    expect(typeof randomModule?.createRandom).toBe("function");
    if (typeof randomModule?.createRandom !== "function") return;

    const first = randomModule.createRandom(12345);
    const second = randomModule.createRandom(12345);
    const firstValues = Array.from({ length: 10 }, () => first.next());
    const secondValues = Array.from({ length: 10 }, () => second.next());

    expect(firstValues).toEqual(secondValues);
    expect(firstValues.every((value: number) => value >= 0 && value < 1)).toBe(true);
  });

  it("returns inclusive integer values inside the requested bounds", async () => {
    const modulePath = "../../src/core/random.ts";
    const randomModule = await import(/* @vite-ignore */ modulePath).catch(() => null);

    expect(typeof randomModule?.createRandom).toBe("function");
    if (typeof randomModule?.createRandom !== "function") return;

    const random = randomModule.createRandom(9);
    const values = Array.from({ length: 100 }, () => random.int(3, 7));

    expect(values.every((value: number) => Number.isInteger(value) && value >= 3 && value <= 7)).toBe(true);
  });
});
