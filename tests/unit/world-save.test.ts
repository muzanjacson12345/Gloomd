import { describe, expect, it } from "vitest";
import { createWorld } from "../../src/core/world-generation";
import {
  createWorldSave,
  parseWorldSave,
  serializeWorldSave
} from "../../src/persistence/world-save";

function makeSavedWorld() {
  const world = createWorld(20261127, { width: 16, height: 16 });
  let start = { x: 0, y: 0 };
  for (let y = 0; y < world.height; y += 1) {
    for (let x = 0; x < world.width; x += 1) {
      if (world.tiles[y]?.[x]?.walkable) {
        start = { x, y };
        break;
      }
    }
    if (world.tiles[start.y]?.[start.x]?.walkable) break;
  }
  return { world, start };
}

describe("versioned world saves", () => {
  it("round-trips the complete world and starting point through portable JSON", () => {
    const { world, start } = makeSavedWorld();
    world.tick = 1234;
    const save = createWorldSave(world, start, 1000);
    const restored = parseWorldSave(serializeWorldSave(save));

    expect(restored.schemaVersion).toBe(1);
    expect(restored.savedAt).toBe(1000);
    expect(restored.startingPoint).toEqual(start);
    expect(restored.world).toEqual(world);
  });

  it("creates an independent snapshot rather than retaining mutable world references", () => {
    const { world, start } = makeSavedWorld();
    const save = createWorldSave(world, start, 1000);
    const originalSeed = save.world.seed;

    world.tick += 10;
    world.resources[0]!.quantity += 1;

    expect(save.world.tick).toBe(0);
    expect(save.world.seed).toBe(originalSeed);
    expect(save.world.resources[0]!.quantity).not.toBe(world.resources[0]!.quantity);
  });

  it("rejects unsupported save versions", () => {
    const { world, start } = makeSavedWorld();
    const save = createWorldSave(world, start, 1000);
    const unsupported = { ...save, schemaVersion: 99 };

    expect(() => parseWorldSave(JSON.stringify(unsupported))).toThrow(/version/i);
  });

  it("rejects corrupted or out-of-bounds world data", () => {
    const { world, start } = makeSavedWorld();
    const save = createWorldSave(world, start, 1000);
    const corrupted = {
      ...save,
      startingPoint: { x: world.width + 10, y: 0 }
    };

    expect(() => parseWorldSave(JSON.stringify(corrupted))).toThrow(/starting point/i);
    expect(() => parseWorldSave("{not json")).toThrow();
  });
});
