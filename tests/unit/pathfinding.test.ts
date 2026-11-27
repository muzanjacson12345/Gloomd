import { describe, expect, it } from "vitest";
import { findPath } from "../../src/core/pathfinding";
import type { Tile, WorldState } from "../../src/core/types";

function makeWorld(rows: string[]): WorldState {
  const tiles: Tile[][] = rows.map((row) =>
    Array.from(row, (cell) => ({
      terrain: cell === "#" ? "mountain" : cell === "~" ? "water" : "grassland",
      elevation: cell === "#" ? 0.9 : 0.4,
      moisture: 0.4,
      waterKind: cell === "~" ? "freshwater" : "none",
      walkable: cell === "."
    }))
  );

  return {
    seed: 1,
    randomState: 1,
    width: rows[0]?.length ?? 0,
    height: rows.length,
    tiles,
    resources: [],
    agents: [],
    tick: 0,
    events: []
  };
}

describe("grid pathfinding", () => {
  it("finds a walkable four-way route around an obstacle wall", () => {
    const world = makeWorld([".....", ".###.", "....."]);
    const path = findPath(world, { x: 0, y: 1 }, { x: 4, y: 1 });

    expect(path).not.toBeNull();
    expect(path?.[0]).not.toEqual({ x: 0, y: 1 });
    expect(path?.at(-1)).toEqual({ x: 4, y: 1 });

    let previous = { x: 0, y: 1 };
    for (const point of path ?? []) {
      expect(world.tiles[point.y]?.[point.x]?.walkable).toBe(true);
      expect(Math.abs(point.x - previous.x) + Math.abs(point.y - previous.y)).toBe(1);
      previous = point;
    }
  });

  it("returns null when the destination is blocked, outside the map or unreachable", () => {
    const world = makeWorld(["...", "###", "..."]);

    expect(findPath(world, { x: 0, y: 0 }, { x: 2, y: 2 })).toBeNull();
    expect(findPath(world, { x: 0, y: 0 }, { x: 1, y: 1 })).toBeNull();
    expect(findPath(world, { x: 0, y: 0 }, { x: 3, y: 0 })).toBeNull();
  });

  it("returns an empty path when already at the destination", () => {
    const world = makeWorld(["..."]);

    expect(findPath(world, { x: 1, y: 0 }, { x: 1, y: 0 })).toEqual([]);
  });
});
