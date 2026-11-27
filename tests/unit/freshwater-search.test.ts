import { describe, expect, it } from "vitest";
import { createWorld } from "../../src/core/world-generation";
import { findNearestFreshwaterBank } from "../../src/core/simulation";

function openWorld() {
  const world = createWorld(5, { width: 16, height: 16 });
  for (const row of world.tiles) {
    for (const tile of row) {
      tile.terrain = "grassland";
      tile.waterKind = "none";
      tile.walkable = true;
    }
  }
  return world;
}

function addFreshwater(world: ReturnType<typeof openWorld>, x: number, y: number): void {
  const tile = world.tiles[y]?.[x];
  if (!tile) throw new Error("Test water tile is outside the world");
  tile.terrain = "river";
  tile.waterKind = "freshwater";
  tile.walkable = false;
}

describe("bounded freshwater search", () => {
  it("returns the shortest reachable path to a freshwater bank", () => {
    const world = openWorld();
    addFreshwater(world, 3, 1);
    addFreshwater(world, 1, 6);

    expect(findNearestFreshwaterBank(world, { x: 1, y: 1 }, 8)).toEqual([
      { x: 2, y: 1 }
    ]);
  });

  it("does not cross a blocked barrier to reach freshwater", () => {
    const world = openWorld();
    addFreshwater(world, 3, 3);

    for (let x = 0; x < world.width; x += 1) {
      const barrier = world.tiles[2]?.[x];
      if (barrier) {
        barrier.terrain = "mountain";
        barrier.walkable = false;
      }
    }

    expect(findNearestFreshwaterBank(world, { x: 1, y: 1 }, 8)).toBeNull();
  });

  it("does not choose freshwater outside the agent's perception radius", () => {
    const world = openWorld();
    addFreshwater(world, 10, 1);

    expect(findNearestFreshwaterBank(world, { x: 1, y: 1 }, 4)).toBeNull();
  });
});
