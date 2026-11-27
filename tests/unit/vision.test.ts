import { describe, expect, it } from "vitest";
import { computeVisibleTiles } from "../../src/core/vision";
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
    seed: 1, randomState: 1, width: rows[0]?.length ?? 0, height: rows.length,
    tiles, resources: [],
    stockpile: { id: "store", x: -1, y: -1, inventory: { wood: 0, stone: 0 }, capacityPerResource: 120 },
    buildings: [], agents: [], tick: 0, events: []
  };
}

describe("local line of sight", () => {
  it("includes nearby cells within the sight radius", () => {
    const world = makeWorld([".....", ".....", ".....", ".....", "....."]);
    const visible = computeVisibleTiles(world, { x: 2, y: 2 }, 2);
    expect(visible).toContainEqual({ x: 2, y: 2 });
    expect(visible).toContainEqual({ x: 3, y: 2 });
    expect(visible).not.toContainEqual({ x: 4, y: 2 });
  });

  it("does not see through a mountain or water barrier", () => {
    const world = makeWorld([".....", "..#..", "....."]);
    const visible = computeVisibleTiles(world, { x: 1, y: 1 }, 4);
    expect(visible).toContainEqual({ x: 2, y: 1 });
    expect(visible).not.toContainEqual({ x: 3, y: 1 });
  });

  it("keeps every returned tile within the map bounds", () => {
    const world = makeWorld(["...", "...", "..."]);
    const visible = computeVisibleTiles(world, { x: 0, y: 0 }, 8);
    expect(visible.every((point) => point.x >= 0 && point.y >= 0 && point.x < 3 && point.y < 3)).toBe(true);
  });
});
