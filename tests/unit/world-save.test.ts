import { describe, expect, it } from "vitest";
import { createWorld } from "../../src/core/world-generation";
import { createStarterAgents } from "../../src/core/agents";
import type { WorldState } from "../../src/core/types";
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

    expect(restored.schemaVersion).toBe(2);
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
  it("round-trips each inhabitant's explored ground and current frontier", () => {
    const { world, start } = makeSavedWorld();
    world.agents = createStarterAgents(world, 1);
    const agent = world.agents[0];
    if (!agent) throw new Error("Test scout was not created");
    agent.exploredTiles = [start.y * world.width + start.x, agent.y * world.width + agent.x];
    agent.explorationTarget = { ...start };
    agent.explorationComplete = false;
    agent.explorationRecordIndex = agent.y * world.width + agent.x;
    agent.explorationPublishedCount = 1;
    agent.explorationPhase = "returning";

    const restored = parseWorldSave(serializeWorldSave(createWorldSave(world, start, 1000)));
    expect(restored.world.agents[0]?.exploredTiles).toEqual(agent.exploredTiles);
    expect(restored.world.agents[0]?.explorationTarget).toEqual(agent.explorationTarget);
    expect(restored.world.agents[0]?.explorationComplete).toBe(false);
    expect(restored.world.agents[0]?.explorationRecordIndex).toBe(agent.explorationRecordIndex);
    expect(restored.world.agents[0]?.explorationPublishedCount).toBe(1);
    expect(restored.world.agents[0]?.explorationPhase).toBe("returning");
    world.exploredTiles = [start.y * world.width + start.x];
    const withSharedMap = parseWorldSave(serializeWorldSave(createWorldSave(world, start, 1001)));
    expect(withSharedMap.world.exploredTiles).toEqual(world.exploredTiles);
  });

  it("does not persist temporary worksite reservations", () => {
    const { world, start } = makeSavedWorld();
    world.agents = createStarterAgents(world, 1);
    const agent = world.agents[0];
    if (!agent) throw new Error("Test worker was not created");
    world.workReservations = [{
      id: "resource:wood-node",
      agentId: agent.id,
      kind: "resource",
      targetId: "wood-node",
      x: 3,
      y: 4
    }];

    const save = createWorldSave(world, start, 1000);
    expect(save.world.workReservations).toBeUndefined();
    const restored = parseWorldSave(serializeWorldSave(save));
    expect(restored.world.workReservations).toBeUndefined();
  });

  it("round-trips prepared and growing fields plus the remaining seed reserve", () => {
    const { world, start } = makeSavedWorld();
    world.farmPlots = [{
      id: "farm-save-test",
      x: start.x,
      y: start.y,
      stage: "growing",
      growthProgress: 123,
      lastTendedTick: 456
    }];
    world.farmSeedBank = 5;

    const restored = parseWorldSave(serializeWorldSave(createWorldSave(world, start, 1000)));
    expect(restored.world.farmPlots).toEqual(world.farmPlots);
    expect(restored.world.farmSeedBank).toBe(5);
  });

  it("round-trips fisher roles and fish in resource nodes and agent inventories", () => {
    const { world, start } = makeSavedWorld();
    world.agents = createStarterAgents(world, 1);
    const fisher = world.agents[0];
    if (!fisher) throw new Error("Test fisher was not created");
    fisher.role = "fisher";
    fisher.inventory.fish = 2;
    world.resources.push({
      id: "save-fish",
      kind: "fish",
      x: start.x,
      y: start.y,
      quantity: 4,
      maxQuantity: 6,
      regrowEveryTicks: 720,
      nextRegrowTick: 900
    });

    const restored = parseWorldSave(serializeWorldSave(createWorldSave(world, start, 1000)));

    expect(restored.world.agents[0]?.role).toBe("fisher");
    expect(restored.world.agents[0]?.inventory.fish).toBe(2);
    expect(restored.world.resources.at(-1)).toMatchObject({
      kind: "fish",
      quantity: 4,
      nextRegrowTick: 900
    });
  });

  it("upgrades older version-one saves that predate fish inventory", () => {
    const { world, start } = makeSavedWorld();
    world.agents = createStarterAgents(world, 2);
    const legacy = JSON.parse(serializeWorldSave(createWorldSave(world, start, 1000))) as {
      schemaVersion: number;
      world: WorldState;
    };
    legacy.schemaVersion = 1;
    for (const agent of legacy.world.agents) {
      delete (agent.inventory as Partial<typeof agent.inventory>).fish;
    }
    delete (legacy.world.stockpile.inventory as Partial<typeof legacy.world.stockpile.inventory>).food;
    delete (legacy.world.stockpile.inventory as Partial<typeof legacy.world.stockpile.inventory>).fish;
    delete legacy.world.farmPlots;
    delete legacy.world.farmSeedBank;
    for (const agent of legacy.world.agents) {
      if (agent.skills) delete (agent.skills as Partial<typeof agent.skills>).farming;
      delete agent.exploredTiles;
      delete agent.explorationTarget;
      delete agent.explorationComplete;
      delete agent.explorationRecordIndex;
    }

    const restored = parseWorldSave(JSON.stringify(legacy));

    expect(restored.world.agents).toHaveLength(2);
    expect(restored.world.agents.every((agent) => agent.inventory.fish === 0)).toBe(true);
    expect(restored.world.stockpile.inventory.food).toBe(0);
    expect(restored.world.stockpile.inventory.fish).toBe(0);
    expect(restored.world.farmPlots).toEqual([]);
    expect(restored.world.farmSeedBank).toBe(6);
    expect(restored.world.agents.every((agent) => agent.skills?.farming === 0)).toBe(true);
    expect(restored.world.agents.every((agent) => agent.exploredTiles?.length === 0)).toBe(true);
    expect(restored.world.agents.every((agent) => agent.explorationTarget === null)).toBe(true);
    expect(restored.world.agents.every((agent) => agent.explorationComplete === false)).toBe(true);
    expect(restored.world.agents.every((agent) => agent.explorationRecordIndex === -1)).toBe(true);
    expect(restored.world.agents.every((agent) => agent.explorationPublishedCount === 0)).toBe(true);
    expect(restored.world.agents.every((agent) => agent.explorationPhase === "idle")).toBe(true);
    expect(restored.world.exploredTiles).toEqual([]);
  });

});
