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
    expect(first.stockpile).toEqual(second.stockpile);
  });

  it("creates a 128 by 96 world with land, ocean and freshwater", async () => {
    const modulePath = "../../src/core/world-generation.ts";
    const worldModule = await import(/* @vite-ignore */ modulePath).catch(() => null);

    expect(typeof worldModule?.createWorld).toBe("function");
    expect(typeof worldModule?.isWalkable).toBe("function");
    if (typeof worldModule?.createWorld !== "function" || typeof worldModule?.isWalkable !== "function") return;

    const world = worldModule.createWorld(2026);
    const tiles = world.tiles.flat();

    expect(world.width).toBe(128);
    expect(world.height).toBe(96);
    expect(tiles.some((tile: { terrain: string }) => tile.terrain === "grassland")).toBe(true);
    expect(tiles.some((tile: { waterKind: string }) => tile.waterKind === "ocean")).toBe(true);
    expect(tiles.some((tile: { waterKind: string }) => tile.waterKind === "freshwater")).toBe(true);
    expect(world.resources.length).toBeGreaterThan(0);
    expect(world.buildings).toEqual([]);
    expect(world.stockpile.inventory).toEqual({ wood: 0, stone: 0 });
    expect(world.stockpile.capacityPerResource).toBe(120);
    expect(world.tiles[world.stockpile.y]?.[world.stockpile.x]?.walkable).toBe(true);
    expect(worldModule.isWalkable(world, world.stockpile.x, world.stockpile.y)).toBe(false);
    expect(world.resources.some((node: { x: number; y: number; quantity: number }) => node.x === world.stockpile.x && node.y === world.stockpile.y && node.quantity > 0)).toBe(false);
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

  it("treats a building tile as blocked in the world walkability helper", async () => {
    const modulePath = "../../src/core/world-generation.ts";
    const worldModule = await import(/* @vite-ignore */ modulePath).catch(() => null);

    expect(typeof worldModule?.createWorld).toBe("function");
    expect(typeof worldModule?.isWalkable).toBe("function");
    if (typeof worldModule?.createWorld !== "function" || typeof worldModule?.isWalkable !== "function") return;

    const world = worldModule.createWorld(12345);
    let location: { x: number; y: number } | null = null;
    for (let y = 0; y < world.height && location === null; y += 1) {
      for (let x = 0; x < world.width; x += 1) {
        if (world.tiles[y]?.[x]?.walkable && (x !== world.stockpile.x || y !== world.stockpile.y)) {
          location = { x, y };
          break;
        }
      }
    }
    if (!location) throw new Error("No walkable tile was generated");

    world.buildings.push({
      id: "test-shelter",
      kind: "shelter",
      x: location.x,
      y: location.y,
      status: "under_construction",
      workDone: 0,
      workRequired: 12,
      builderId: "builder-1"
    });

    expect(worldModule.isWalkable(world, location.x, location.y)).toBe(false);
  });


  it("prefers the exact requested walkable starting tile", async () => {
    const modulePath = "../../src/core/world-generation.ts";
    const worldModule = await import(/* @vite-ignore */ modulePath).catch(() => null);

    expect(typeof worldModule?.findNearestWalkablePoint).toBe("function");
    if (typeof worldModule?.findNearestWalkablePoint !== "function") return;

    const world = worldModule.createWorld(17, { width: 16, height: 16 });
    const target = { x: 4, y: 4 };
    world.tiles[target.y]![target.x]!.walkable = true;
    expect(worldModule.findNearestWalkablePoint(world, target)).toEqual(target);
  });

  it("snaps a blocked start point to the nearest walkable tile with stable row-major ties", async () => {
    const modulePath = "../../src/core/world-generation.ts";
    const worldModule = await import(/* @vite-ignore */ modulePath).catch(() => null);

    expect(typeof worldModule?.findNearestWalkablePoint).toBe("function");
    if (typeof worldModule?.findNearestWalkablePoint !== "function") return;

    const world = worldModule.createWorld(18, { width: 16, height: 16 });
    for (const row of world.tiles) {
      for (const tile of row) tile.walkable = false;
    }
    world.stockpile.x = 15;
    world.stockpile.y = 15;
    world.tiles[5]![4]!.walkable = true;
    world.tiles[4]![5]!.walkable = true;

    expect(worldModule.findNearestWalkablePoint(world, { x: 5, y: 5 })).toEqual({ x: 5, y: 4 });
  });

  it("returns null when a generated world has no walkable starting tile", async () => {
    const modulePath = "../../src/core/world-generation.ts";
    const worldModule = await import(/* @vite-ignore */ modulePath).catch(() => null);

    expect(typeof worldModule?.findNearestWalkablePoint).toBe("function");
    if (typeof worldModule?.findNearestWalkablePoint !== "function") return;

    const world = worldModule.createWorld(19, { width: 16, height: 16 });
    for (const row of world.tiles) {
      for (const tile of row) tile.walkable = false;
    }
    world.stockpile.x = 15;
    world.stockpile.y = 15;

    expect(worldModule.findNearestWalkablePoint(world, { x: 5, y: 5 })).toBeNull();
  });

});
