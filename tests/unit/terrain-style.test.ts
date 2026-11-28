import { describe, expect, it } from "vitest";
import { getTerrainBaseColour, terrainVariation, TERRAIN_LEGEND_ITEMS } from "../../src/render/terrain-style";
import type { Tile } from "../../src/core/types";

function tile(overrides: Partial<Tile> = {}): Tile {
  return {
    terrain: "grassland",
    elevation: 0.45,
    moisture: 0.5,
    waterKind: "none",
    walkable: true,
    ...overrides
  };
}

describe("map terrain appearance", () => {
  it("uses stable coordinate noise rather than simulation randomness", () => {
    expect(terrainVariation(12, 34, 5)).toBe(terrainVariation(12, 34, 5));
    expect(getTerrainBaseColour(tile(), 12, 34)).toBe(getTerrainBaseColour(tile(), 12, 34));
  });

  it("gives dry and wet grassland visibly different surfaces", () => {
    const dry = getTerrainBaseColour(tile({ moisture: 0.12 }), 8, 8);
    const wet = getTerrainBaseColour(tile({ moisture: 0.92 }), 8, 8);
    expect(dry).not.toBe(wet);
  });

  it("refreshes a cached colour when the underlying tile data changes", () => {
    const grass = tile();
    const original = getTerrainBaseColour(grass, 8, 8);
    grass.moisture = 0.98;
    const changed = getTerrainBaseColour(grass, 8, 8);
    expect(changed).not.toBe(original);
  });

  it("distinguishes ocean, freshwater and river colours", () => {
    const ocean = getTerrainBaseColour(tile({ terrain: "water", waterKind: "ocean", walkable: false }), 2, 3);
    const lake = getTerrainBaseColour(tile({ terrain: "water", waterKind: "freshwater", walkable: false }), 2, 3);
    const river = getTerrainBaseColour(tile({ terrain: "river", waterKind: "freshwater", walkable: false }), 2, 3);
    expect(new Set([ocean, lake, river]).size).toBe(3);
  });

  it("provides a visible key for every generated terrain type", () => {
    expect(TERRAIN_LEGEND_ITEMS.map((item) => item.label)).toEqual([
      "OCEAN", "FRESHWATER", "RIVER", "COAST / BEACH", "GRASSLAND", "FOREST", "HILLS", "MOUNTAINS"
    ]);
    expect(TERRAIN_LEGEND_ITEMS.every((item) => /^#[0-9a-f]{6}$/i.test(item.color))).toBe(true);
  });
});
