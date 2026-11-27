import { describe, expect, it } from "vitest";

describe("procedural world generation", () => {
  it("creates the same terrain and resources for the same seed", async () => {
    const modulePath = "../../src/core/world-generation.ts";
    const worldModule = await import(/* @vite-ignore */ modulePath).catch(() => null);

    expect(typeof worldModule?.createWorld).toBe("function");
    if (typeof worldModule?.createWorld !== "function") return;

    const first = worldModule.createWorld(12345);
    const second = worldModule.createWorld(12345);

    expect(first.tiles).toEqual(second.tiles);
    expect(first.resources).toEqual(second.resources);
    expect(first.randomState).toBe(second.randomState);
  });

  it("creates a 128 by 96 world with land, ocean and freshwater", async () => {
    const modulePath = "../../src/core/world-generation.ts";
    const worldModule = await import(/* @vite-ignore */ modulePath).catch(() => null);

    expect(typeof worldModule?.createWorld).toBe("function");
    if (typeof worldModule?.createWorld !== "function") return;

    const world = worldModule.createWorld(2026);
    const tiles = world.tiles.flat();

    expect(world.width).toBe(128);
    expect(world.height).toBe(96);
    expect(tiles.some((tile: { terrain: string }) => tile.terrain === "grassland")).toBe(true);
    expect(tiles.some((tile: { waterKind: string }) => tile.waterKind === "ocean")).toBe(true);
    expect(tiles.some((tile: { waterKind: string }) => tile.waterKind === "freshwater")).toBe(true);
    expect(world.resources.length).toBeGreaterThan(0);
  });

  it("rejects dimensions that are too small or too large", async () => {
    const modulePath = "../../src/core/world-generation.ts";
    const worldModule = await import(/* @vite-ignore */ modulePath).catch(() => null);

    expect(typeof worldModule?.createWorld).toBe("function");
    if (typeof worldModule?.createWorld !== "function") return;

    expect(() => worldModule.createWorld(1, { width: 15, height: 96 })).toThrow();
    expect(() => worldModule.createWorld(1, { width: 513, height: 96 })).toThrow();
  });

  it("returns undefined for coordinates outside the world", async () => {
    const modulePath = "../../src/core/world-generation.ts";
    const worldModule = await import(/* @vite-ignore */ modulePath).catch(() => null);

    expect(typeof worldModule?.createWorld).toBe("function");
    expect(typeof worldModule?.getTile).toBe("function");
    if (typeof worldModule?.createWorld !== "function" || typeof worldModule?.getTile !== "function") return;

    const world = worldModule.createWorld(12345);
    expect(worldModule.getTile(world, -1, 0)).toBeUndefined();
    expect(worldModule.getTile(world, 128, 0)).toBeUndefined();
  });

  it("marks ocean and all freshwater tiles as impassable", async () => {
    const modulePath = "../../src/core/world-generation.ts";
    const worldModule = await import(/* @vite-ignore */ modulePath).catch(() => null);

    expect(typeof worldModule?.createWorld).toBe("function");
    expect(typeof worldModule?.isWalkable).toBe("function");
    if (typeof worldModule?.createWorld !== "function" || typeof worldModule?.isWalkable !== "function") return;

    const world = worldModule.createWorld(12345);
    for (let y = 0; y < world.height; y += 1) {
      for (let x = 0; x < world.width; x += 1) {
        const tile = world.tiles[y][x];
        if (tile.waterKind === "ocean" || tile.waterKind === "freshwater") {
          expect(worldModule.isWalkable(world, x, y)).toBe(false);
        }
      }
    }
  });
});
