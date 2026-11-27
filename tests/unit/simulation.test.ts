import { describe, expect, it } from "vitest";
import { createStarterAgents } from "../../src/core/agents";
import { stepWorld } from "../../src/core/simulation";
import { createWorld } from "../../src/core/world-generation";
import type { Agent, Tile, WorldState } from "../../src/core/types";

function makeWorld(): WorldState {
  const width = 16;
  const height = 16;
  const tiles: Tile[][] = Array.from({ length: height }, () =>
    Array.from({ length: width }, () => ({
      terrain: "grassland",
      elevation: 0.4,
      moisture: 0.4,
      waterKind: "none",
      walkable: true
    }))
  );

  return {
    seed: 12,
    randomState: 12345,
    width,
    height,
    tiles,
    resources: [],
    agents: [],
    tick: 0,
    events: []
  };
}

function makeAgent(overrides: Partial<Agent> = {}): Agent {
  return {
    id: "agent-test",
    name: "Ari",
    ageYears: 24,
    x: 1,
    y: 1,
    traits: { curiosity: 0.5, diligence: 0.5, sociability: 0.5 },
    needs: { hunger: 90, thirst: 0, energy: 100, health: 100 },
    inventory: { food: 0, wood: 0, stone: 0 },
    role: "forager",
    currentGoal: "seek_food",
    perceptionRadius: 12,
    alive: true,
    ...overrides
  };
}

describe("autonomous agents and consequential actions", () => {
  it("spawns the requested population on unique walkable tiles", () => {
    const world = createWorld(77, { width: 32, height: 24 });
    const agents = createStarterAgents(world, 30);

    expect(agents).toHaveLength(30);
    expect(new Set(agents.map((agent) => agent.id)).size).toBe(30);
    expect(new Set(agents.map((agent) => `${agent.x},${agent.y}`)).size).toBe(30);
    for (const agent of agents) {
      expect(world.tiles[agent.y]?.[agent.x]?.walkable).toBe(true);
    }
  });

  it("gathers only reachable food and transfers the exact quantity to inventory", () => {
    const world = makeWorld();
    world.resources.push({
      id: "food-nearby",
      kind: "wild_food",
      x: 4,
      y: 1,
      quantity: 3,
      maxQuantity: 3,
      regrowEveryTicks: null
    });
    const agent = makeAgent();
    world.agents.push(agent);

    for (let count = 0; count < 12 && agent.inventory.food === 0; count += 1) {
      stepWorld(world);
    }

    const node = world.resources[0];
    expect(node).toBeDefined();
    expect(agent.inventory.food).toBeGreaterThan(0);
    expect(node?.quantity).toBe(3 - agent.inventory.food);
    expect(world.events.some((event) => event.kind === "gather_food")).toBe(true);
  });

  it("eats carried food and reduces hunger by the configured amount", () => {
    const world = makeWorld();
    const agent = makeAgent({
      currentGoal: "eat",
      inventory: { food: 1, wood: 0, stone: 0 }
    });
    world.agents.push(agent);

    stepWorld(world);

    expect(agent.inventory.food).toBe(0);
    expect(agent.needs.hunger).toBe(56);
    expect(world.events.some((event) => event.kind === "eat")).toBe(true);
  });

  it("drinks only at a reachable freshwater bank without entering water", () => {
    const world = makeWorld();
    const water = world.tiles[1]?.[2];
    if (!water) throw new Error("Test water tile was not created");
    water.terrain = "river";
    water.waterKind = "freshwater";
    water.walkable = false;

    const agent = makeAgent({
      x: 1,
      y: 1,
      needs: { hunger: 0, thirst: 90, energy: 100, health: 100 },
      currentGoal: "seek_water"
    });
    world.agents.push(agent);

    stepWorld(world);

    expect(agent.needs.thirst).toBe(46);
    expect(agent.x).toBe(1);
    expect(agent.y).toBe(1);
    expect(world.events.some((event) => event.kind === "drink")).toBe(true);
  });

  it("does not report drinking when every freshwater bank tile is unreachable", () => {
    const world = makeWorld();
    const water = world.tiles[5]?.[5];
    if (!water) throw new Error("Test water tile was not created");
    water.terrain = "river";
    water.waterKind = "freshwater";
    water.walkable = false;

    for (const [x, y] of [[4, 5], [6, 5], [5, 4], [5, 6]] as const) {
      const tile = world.tiles[y]?.[x];
      if (tile) {
        tile.terrain = "mountain";
        tile.walkable = false;
      }
    }

    const agent = makeAgent({
      needs: { hunger: 0, thirst: 90, energy: 100, health: 100 },
      currentGoal: "seek_water"
    });
    world.agents.push(agent);

    for (let count = 0; count < 4; count += 1) stepWorld(world);

    expect(agent.needs.thirst).toBeGreaterThan(45);
    expect(world.events.some((event) => event.kind === "drink")).toBe(false);
  });

  it("prevents two agents from gathering more food than a node contains", () => {
    const world = makeWorld();
    world.resources.push({
      id: "last-berry",
      kind: "wild_food",
      x: 2,
      y: 1,
      quantity: 1,
      maxQuantity: 1,
      regrowEveryTicks: null
    });
    const first = makeAgent({ id: "agent-a", name: "Ari" });
    const second = makeAgent({ id: "agent-b", name: "Bo", x: 1, y: 2 });
    world.agents.push(first, second);

    for (let count = 0; count < 2; count += 1) stepWorld(world);

    const totalCarried = first.inventory.food + second.inventory.food;
    expect(totalCarried).toBe(1);
    expect(world.events.filter((event) => event.kind === "gather_food")).toHaveLength(1);
    expect(world.resources[0]?.quantity).toBe(1 - totalCarried);
    expect(world.resources[0]?.quantity).toBeGreaterThanOrEqual(0);
  });
  it("does not cross an impassable river to collect unreachable food", () => {
    const world = makeWorld();
    for (let y = 0; y < world.height; y += 1) {
      const barrier = world.tiles[y]?.[2];
      if (barrier) {
        barrier.terrain = "river";
        barrier.waterKind = "freshwater";
        barrier.walkable = false;
      }
    }
    world.resources.push({
      id: "food-across-river",
      kind: "wild_food",
      x: 4,
      y: 1,
      quantity: 3,
      maxQuantity: 3,
      regrowEveryTicks: null
    });
    const agent = makeAgent();
    world.agents.push(agent);

    for (let count = 0; count < 6; count += 1) stepWorld(world);

    expect(agent.x).toBeLessThan(2);
    expect(world.resources[0]?.quantity).toBe(3);
    expect(world.events.some((event) => event.kind === "gather_food")).toBe(false);
  });

  it("produces the same agent outcomes from the same world seed", () => {
    const firstWorld = createWorld(20261127, { width: 32, height: 24 });
    const secondWorld = createWorld(20261127, { width: 32, height: 24 });
    firstWorld.agents = createStarterAgents(firstWorld, 5);
    secondWorld.agents = createStarterAgents(secondWorld, 5);

    stepWorld(firstWorld, 25);
    stepWorld(secondWorld, 25);

    expect(firstWorld.agents).toEqual(secondWorld.agents);
    expect(firstWorld.resources).toEqual(secondWorld.resources);
    expect(firstWorld.events).toEqual(secondWorld.events);
    expect(firstWorld.randomState).toBe(secondWorld.randomState);
  });

});
