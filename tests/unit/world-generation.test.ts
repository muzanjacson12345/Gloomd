import { describe, expect, it } from "vitest";
import { createWorld, relocateStockpileNear } from "../../src/core/world-generation";
import type { WorldState } from "../../src/core/types";

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
    expect(world.stockpile.inventory).toEqual({ wood: 0, stone: 0, food: 0, fish: 0 });
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


function countFreshwaterComponents(world: WorldState): number {
  const seen = new Set<number>();
  let components = 0;
  for (let y = 0; y < world.height; y += 1) {
    for (let x = 0; x < world.width; x += 1) {
      const index = y * world.width + x;
      if (seen.has(index) || world.tiles[y]?.[x]?.waterKind !== "freshwater") continue;
      components += 1;
      const queue = [index];
      seen.add(index);
      for (let cursor = 0; cursor < queue.length; cursor += 1) {
        const current = queue[cursor]!;
        const currentX = current % world.width;
        const currentY = Math.floor(current / world.width);
        for (const [dx, dy] of [[1,0],[0,1],[-1,0],[0,-1]] as const) {
          const nextX = currentX + dx;
          const nextY = currentY + dy;
          const nextIndex = nextY * world.width + nextX;
          if (nextX < 0 || nextY < 0 || nextX >= world.width || nextY >= world.height) continue;
          if (seen.has(nextIndex) || world.tiles[nextY]?.[nextX]?.waterKind !== "freshwater") continue;
          seen.add(nextIndex);
          queue.push(nextIndex);
        }
      }
    }
  }
  return components;
}

describe("advanced random terrain", () => {
  it("changes coastline and terrain between different seeds", () => {
    const first = createWorld(1001, { width: 128, height: 96 });
    const second = createWorld(2002, { width: 128, height: 96 });
    expect(first.tiles).not.toEqual(second.tiles);
  });

  it("creates multiple separated inland freshwater bodies in a standard world", () => {
    const world = createWorld(20261127, { width: 128, height: 96 });
    expect(countFreshwaterComponents(world)).toBeGreaterThanOrEqual(2);
    expect(world.tiles.flat().filter(tile => tile.waterKind === "freshwater").length).toBeGreaterThan(50);
  });

  it("raises water coverage when the requested water setting is increased", () => {
    const low = createWorld(4242, { width: 128, height: 96, waterCoverage: 0.25 });
    const high = createWorld(4242, { width: 128, height: 96, waterCoverage: 0.55 });
    const lowRatio = low.tiles.flat().filter(tile => tile.waterKind !== "none").length / (low.width * low.height);
    const highRatio = high.tiles.flat().filter(tile => tile.waterKind !== "none").length / (high.width * high.height);
    expect(highRatio - lowRatio).toBeGreaterThan(0.15);
  });

  it("keeps the total generated tile budget at or below 65,536", () => {
    expect(() => createWorld(7, { width: 257, height: 256 })).toThrow(/65,536|tile budget/i);
  });

  it("moves the communal stockpile beside the chosen start and away from resources", () => {
    const world = createWorld(88, { width: 32, height: 24 });
    const target = { x: 8, y: 8 };
    world.resources.push({
      id: "reserved-start-resource",
      kind: "wood",
      x: target.x,
      y: target.y,
      quantity: 4,
      maxQuantity: 4,
      regrowEveryTicks: null
    });
    const relocated = relocateStockpileNear(world, target);
    expect(relocated).toEqual({ x: world.stockpile.x, y: world.stockpile.y });
    expect(Math.abs(relocated.x - target.x) + Math.abs(relocated.y - target.y)).toBeLessThanOrEqual(2);
    expect(relocated.x === target.x && relocated.y === target.y).toBe(false);
    expect(world.resources.some(node => node.quantity > 0 && node.x === relocated.x && node.y === relocated.y)).toBe(false);
  });
  it("generates fish resource patches on walkable freshwater banks", () => {
    const world = createWorld(20261127);
    const fishNodes = world.resources.filter((resource) => resource.kind === "fish");

    expect(fishNodes.length).toBeGreaterThan(0);
    for (const fish of fishNodes) {
      expect(world.tiles[fish.y]?.[fish.x]?.walkable).toBe(true);
      const adjacent = [
        world.tiles[fish.y - 1]?.[fish.x],
        world.tiles[fish.y + 1]?.[fish.x],
        world.tiles[fish.y]?.[fish.x - 1],
        world.tiles[fish.y]?.[fish.x + 1]
      ];
      expect(adjacent.some((tile) => tile?.waterKind === "freshwater")).toBe(true);
    }
  });

});

