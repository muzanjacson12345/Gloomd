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
    buildings: [],
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
    homeId: null,
    buildingId: null,
    role: "forager",
    currentGoal: "seek_food",
    perceptionRadius: 12,
    alive: true,
    ...overrides
  };
}

function makeBuilder(overrides: Partial<Agent> = {}): Agent & {
  role: "builder";
  homeId: string | null;
  buildingId: string | null;
} {
  const agent = makeAgent({
    needs: { hunger: 0, thirst: 0, energy: 100, health: 100 },
    inventory: { food: 0, wood: 0, stone: 0 },
    ...overrides
  });
  return Object.assign(agent, { role: "builder" as const, homeId: null, buildingId: null });
}

describe("autonomous agents and consequential actions", () => {
  it("spawns the requested population on unique walkable tiles", () => {
    const world = createWorld(77, { width: 32, height: 24 });
    const agents = createStarterAgents(world, 30);

    expect(agents).toHaveLength(30);
    expect(agents.filter((agent) => agent.role === "builder")).toHaveLength(6);
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

  it("lets builders gather wood and stone with exact source-to-inventory accounting", () => {
    const world = makeWorld();
    world.resources.push(
      {
        id: "wood-nearby",
        kind: "wood",
        x: 2,
        y: 1,
        quantity: 5,
        maxQuantity: 5,
        regrowEveryTicks: null
      },
      {
        id: "stone-nearby",
        kind: "stone",
        x: 2,
        y: 1,
        quantity: 2,
        maxQuantity: 2,
        regrowEveryTicks: null
      }
    );
    const builder = makeBuilder();
    world.agents.push(builder);

    stepWorld(world, 8);

    expect(builder.inventory.wood).toBe(5);
    expect(builder.inventory.stone).toBe(2);
    expect(world.resources.map((node) => node.quantity)).toEqual([0, 0]);
    expect(world.events.filter((event) => event.kind === "gather_wood")).toHaveLength(5);
    expect(world.events.filter((event) => event.kind === "gather_stone")).toHaveLength(2);
  });

  it("prevents builders from collectively gathering more than a resource node contains", () => {
    const world = makeWorld();
    world.resources.push({
      id: "single-log",
      kind: "wood",
      x: 2,
      y: 1,
      quantity: 1,
      maxQuantity: 1,
      regrowEveryTicks: null
    });
    const first = makeBuilder({ id: "builder-a", name: "Ari" });
    const second = makeBuilder({ id: "builder-b", name: "Bo", x: 1, y: 2 });
    world.agents.push(first, second);

    stepWorld(world, 6);

    expect(first.inventory.wood + second.inventory.wood).toBe(1);
    expect(world.resources[0]?.quantity).toBe(0);
    expect(world.events.filter((event) => event.kind === "gather_wood")).toHaveLength(1);
  });

  it("spends shelter materials once and gives the builder a home after twelve work ticks", () => {
    const world = makeWorld();
    const builder = makeBuilder({
      inventory: { food: 0, wood: 5, stone: 2 },
      currentGoal: "build_shelter"
    });
    world.agents.push(builder);

    stepWorld(world);

    const site = world.buildings[0];
    expect(site).toMatchObject({
      kind: "shelter",
      x: 2,
      y: 1,
      status: "under_construction",
      workDone: 0,
      workRequired: 12,
      builderId: builder.id
    });
    expect(builder.inventory.wood).toBe(0);
    expect(builder.inventory.stone).toBe(0);
    expect(builder.buildingId).toBe(site?.id);
    expect(builder.homeId).toBeNull();

    stepWorld(world, 11);
    expect(world.buildings[0]?.status).toBe("under_construction");
    expect(world.buildings[0]?.workDone).toBe(11);

    const completedEvents = stepWorld(world);
    expect(world.buildings[0]?.status).toBe("complete");
    expect(builder.homeId).toBe(site?.id);
    expect(builder.buildingId).toBeNull();
    expect(completedEvents.filter((event) => event.kind === "shelter_complete")).toHaveLength(1);
  });

  it("does not spend shelter materials when no valid adjacent building tile exists", () => {
    const world = makeWorld();
    for (const [x, y] of [[2, 1], [1, 2], [0, 1], [1, 0]] as const) {
      const tile = world.tiles[y]?.[x];
      if (tile) {
        tile.terrain = "mountain";
        tile.walkable = false;
      }
    }
    const builder = makeBuilder({
      inventory: { food: 0, wood: 5, stone: 2 },
      currentGoal: "build_shelter"
    });
    world.agents.push(builder);

    stepWorld(world);

    expect(world.buildings).toHaveLength(0);
    expect(builder.inventory.wood).toBe(5);
    expect(builder.inventory.stone).toBe(2);
    expect(builder.buildingId).toBeNull();
  });

  it("never places a shelter on a live resource or another inhabitant", () => {
    const world = makeWorld();
    world.resources.push({
      id: "resource-east",
      kind: "wood",
      x: 2,
      y: 1,
      quantity: 1,
      maxQuantity: 1,
      regrowEveryTicks: null
    });
    const builder = makeBuilder({
      inventory: { food: 0, wood: 5, stone: 2 },
      currentGoal: "build_shelter"
    });
    const neighbour = makeAgent({ id: "neighbour", name: "Bo", x: 1, y: 2 });
    world.agents.push(builder, neighbour);

    stepWorld(world);

    expect(world.buildings).toHaveLength(1);
    expect(world.buildings[0]).toMatchObject({ x: 0, y: 1, status: "under_construction" });
    expect(world.buildings[0]?.x).not.toBe(2);
    expect(world.buildings[0]?.y).not.toBe(2);
    expect(builder.inventory.wood).toBe(0);
    expect(builder.inventory.stone).toBe(0);
  });

  it("pauses shelter work while urgent thirst is handled, then resumes the same site", () => {
    const world = makeWorld();
    const water = world.tiles[2]?.[1];
    if (!water) throw new Error("Test freshwater tile was not created");
    water.terrain = "river";
    water.waterKind = "freshwater";
    water.walkable = false;
    const builder = makeBuilder({
      inventory: { food: 0, wood: 5, stone: 2 },
      currentGoal: "build_shelter"
    });
    world.agents.push(builder);

    stepWorld(world);
    const site = world.buildings[0];
    expect(site).toBeDefined();

    builder.needs.thirst = 64;
    const survivalEvents = stepWorld(world);
    expect(builder.needs.thirst).toBe(20);
    expect(site?.workDone).toBe(0);
    expect(survivalEvents.some((event) => event.kind === "drink")).toBe(true);

    stepWorld(world);
    expect(site?.workDone).toBe(1);
    expect(world.buildings).toHaveLength(1);
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
