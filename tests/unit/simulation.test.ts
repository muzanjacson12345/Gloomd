import { describe, expect, it } from "vitest";
import { createStarterAgents } from "../../src/core/agents";
import { stepWorld } from "../../src/core/simulation";
import { takeResource } from "../../src/core/resources";
import { createWorld, relocateStockpileNear } from "../../src/core/world-generation";
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
    stockpile: { id: "settlement-stockpile", x: 14, y: 14, inventory: { wood: 0, stone: 0, food: 0, fish: 0 }, capacityPerResource: 120 },
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
    inventory: { food: 0, fish: 0, wood: 0, stone: 0 },
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
    inventory: { food: 0, fish: 0, wood: 0, stone: 0 },
    ...overrides
  });
  return Object.assign(agent, { role: "builder" as const, homeId: null, buildingId: null });
}

function makeHauler(overrides: Partial<Agent> = {}): Agent & {
  role: "hauler";
  homeId: string | null;
  buildingId: string | null;
} {
  const agent = makeAgent({
    needs: { hunger: 0, thirst: 0, energy: 100, health: 100 },
    inventory: { food: 0, fish: 0, wood: 0, stone: 0 },
    ...overrides
  });
  return Object.assign(agent, { role: "hauler" as const, homeId: null, buildingId: null });
}

describe("autonomous agents and consequential actions", () => {
  it("spawns the requested population on unique walkable tiles", () => {
    const world = createWorld(77, { width: 32, height: 24 });
    const agents = createStarterAgents(world, 30);

    expect(agents).toHaveLength(30);
    expect(agents.filter((agent) => agent.role === "builder")).toHaveLength(6);
    expect(agents.filter((agent) => agent.role === "hauler")).toHaveLength(6);
    expect(agents.filter((agent) => agent.role === "fisher")).toHaveLength(3);
    expect(agents.filter((agent) => agent.role === "forager")).toHaveLength(15);
    expect(agents.some((agent) => agent.x === world.stockpile.x && agent.y === world.stockpile.y)).toBe(false);
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
      inventory: { food: 1, fish: 0, wood: 0, stone: 0 }
    });
    world.agents.push(agent);

    stepWorld(world);

    expect(agent.inventory.food).toBe(0);
    expect(agent.needs.hunger).toBeCloseTo(55.08, 5);
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

    expect(agent.needs.thirst).toBeCloseTo(45.12, 5);
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
    expect(world.events.filter((event) => event.kind === "resource_depleted")).toHaveLength(1);
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


  it("lets haulers gather wood and stone and physically return exact amounts to the stockpile", () => {
    const world = makeWorld();
    world.stockpile.x = 4;
    world.stockpile.y = 1;
    world.resources.push(
      {
        id: "wood-nearby",
        kind: "wood",
        x: 2,
        y: 1,
        quantity: 3,
        maxQuantity: 3,
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
    const hauler = makeHauler();
    world.agents.push(hauler);

    stepWorld(world, 20);

    expect(hauler.inventory.wood).toBe(0);
    expect(hauler.inventory.stone).toBe(0);
    expect(world.stockpile.inventory).toEqual({ wood: 3, stone: 2, food: 0, fish: 0 });
    expect(world.resources.map((node) => node.quantity)).toEqual([0, 0]);
    expect(world.events.filter((event) => event.kind === "gather_wood")).toHaveLength(1);
    expect(world.events.filter((event) => event.kind === "gather_stone")).toHaveLength(1);
    expect(world.events.filter((event) => event.kind === "deliver_resources")).toHaveLength(2);
    expect(world.events.every((event) => event.kind !== "deliver_resources" || event.message.includes("stockpile"))).toBe(true);
  });

  it("does not let two haulers gather more units than a resource node contains", () => {
    const world = makeWorld();
    world.stockpile.x = 4;
    world.stockpile.y = 1;
    world.resources.push({
      id: "single-log",
      kind: "wood",
      x: 2,
      y: 1,
      quantity: 1,
      maxQuantity: 1,
      regrowEveryTicks: null
    });
    const first = makeHauler({ id: "hauler-a", name: "Ari" });
    const second = makeHauler({ id: "hauler-b", name: "Bo", x: 1, y: 2 });
    world.agents.push(first, second);

    stepWorld(world, 20);

    expect(first.inventory.wood + second.inventory.wood + world.stockpile.inventory.wood).toBe(1);
    expect(world.resources[0]?.quantity).toBe(0);
    expect(world.events.filter((event) => event.kind === "gather_wood")).toHaveLength(1);
  });

  it("keeps materials on the hauler when the stockpile cannot be reached", () => {
    const world = makeWorld();
    world.stockpile.x = 4;
    world.stockpile.y = 1;
    for (let y = 0; y < world.height; y += 1) {
      const barrier = world.tiles[y]?.[2];
      if (barrier) {
        barrier.terrain = "mountain";
        barrier.walkable = false;
      }
    }
    const hauler = makeHauler({
      inventory: { food: 0, fish: 0, wood: 2, stone: 1 }
    });
    world.agents.push(hauler);

    stepWorld(world, 4);

    expect(hauler.inventory).toMatchObject({ wood: 2, stone: 1 });
    expect(world.stockpile.inventory).toMatchObject({ wood: 0, stone: 0 });
    expect(world.events.some((event) => event.kind === "deliver_resources")).toBe(false);
  });

  it("lets urgent thirst interrupt a hauler carrying materials without losing the load", () => {
    const world = makeWorld();
    world.stockpile.x = 4;
    world.stockpile.y = 1;
    const water = world.tiles[1]?.[2];
    if (!water) throw new Error("Test freshwater tile was not created");
    water.terrain = "river";
    water.waterKind = "freshwater";
    water.walkable = false;

    const hauler = makeHauler({
      inventory: { food: 0, fish: 0, wood: 2, stone: 1 },
      needs: { hunger: 0, thirst: 64.95, energy: 100, health: 100 }
    });
    world.agents.push(hauler);

    const events = stepWorld(world);

    expect(hauler.needs.thirst).toBeCloseTo(20.07, 5);
    expect(hauler.inventory).toMatchObject({ wood: 2, stone: 1 });
    expect(world.stockpile.inventory).toMatchObject({ wood: 0, stone: 0 });
    expect(events.some((event) => event.kind === "drink")).toBe(true);
    expect(events.some((event) => event.kind === "deliver_resources")).toBe(false);
  });

  it("deposits only remaining stockpile capacity and keeps the undelivered load", () => {
    const world = makeWorld();
    world.stockpile.x = 4;
    world.stockpile.y = 1;
    world.stockpile.inventory.wood = 119;
    const hauler = makeHauler({
      x: 3,
      y: 1,
      inventory: { food: 0, fish: 0, wood: 5, stone: 0 }
    });
    world.agents.push(hauler);

    stepWorld(world);

    expect(world.stockpile.inventory.wood).toBe(120);
    expect(hauler.inventory.wood).toBe(4);
    expect(world.events.filter((event) => event.kind === "deliver_resources")).toHaveLength(1);
  });


  it("spends shelter materials once and gives the builder a home after twelve work ticks", () => {
    const world = makeWorld();
    world.stockpile.inventory = { wood: 5, stone: 2, food: 0, fish: 0 };
    const builder = makeBuilder({ currentGoal: "build_shelter" });
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
    expect(world.stockpile.inventory).toEqual({ wood: 0, stone: 0, food: 0, fish: 0 });
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
    world.stockpile.inventory = { wood: 5, stone: 2, food: 0, fish: 0 };
    const builder = makeBuilder({ currentGoal: "build_shelter" });
    world.agents.push(builder);

    stepWorld(world);

    expect(world.buildings).toHaveLength(0);
    expect(builder.inventory.wood).toBe(0);
    expect(builder.inventory.stone).toBe(0);
    expect(world.stockpile.inventory).toEqual({ wood: 5, stone: 2, food: 0, fish: 0 });
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
    world.stockpile.inventory = { wood: 5, stone: 2, food: 0, fish: 0 };
    const builder = makeBuilder({ currentGoal: "build_shelter" });
    const neighbour = makeAgent({ id: "neighbour", name: "Bo", x: 1, y: 2 });
    world.agents.push(builder, neighbour);

    stepWorld(world);

    expect(world.buildings).toHaveLength(1);
    expect(world.buildings[0]).toMatchObject({ x: 0, y: 1, status: "under_construction" });
    expect(world.buildings[0]?.x).not.toBe(2);
    expect(world.buildings[0]?.y).not.toBe(2);
    expect(builder.inventory.wood).toBe(0);
    expect(builder.inventory.stone).toBe(0);
    expect(world.stockpile.inventory).toEqual({ wood: 0, stone: 0, food: 0, fish: 0 });
  });

  it("does not let competing builders spend the same shared shelter recipe twice", () => {
    const world = makeWorld();
    world.stockpile.inventory = { wood: 5, stone: 2, food: 0, fish: 0 };
    const first = makeBuilder({ id: "builder-a", name: "Ari" });
    const second = makeBuilder({ id: "builder-b", name: "Bo", x: 1, y: 2 });
    world.agents.push(first, second);

    stepWorld(world);

    expect(world.buildings).toHaveLength(1);
    expect(world.stockpile.inventory).toEqual({ wood: 0, stone: 0, food: 0, fish: 0 });
    expect(world.events.filter((event) => event.kind === "shelter_started")).toHaveLength(1);
    expect([first.buildingId, second.buildingId].filter((id) => id !== null)).toHaveLength(1);
  });

  it("does not start a shelter when the shared stockpile is missing part of the recipe", () => {
    const world = makeWorld();
    world.stockpile.inventory = { wood: 4, stone: 2, food: 0, fish: 0 };
    world.agents.push(makeBuilder());

    stepWorld(world);

    expect(world.buildings).toHaveLength(0);
    expect(world.stockpile.inventory).toEqual({ wood: 4, stone: 2, food: 0, fish: 0 });
  });

  it("pauses shelter work while urgent thirst is handled, then resumes the same site", () => {
    const world = makeWorld();
    const water = world.tiles[2]?.[1];
    if (!water) throw new Error("Test freshwater tile was not created");
    water.terrain = "river";
    water.waterKind = "freshwater";
    water.walkable = false;
    world.stockpile.inventory = { wood: 5, stone: 2, food: 0, fish: 0 };
    const builder = makeBuilder({ currentGoal: "build_shelter" });
    world.agents.push(builder);

    stepWorld(world);
    const site = world.buildings[0];
    expect(site).toBeDefined();

    builder.needs.thirst = 64.95;
    const survivalEvents = stepWorld(world);
    expect(builder.needs.thirst).toBeCloseTo(20.07, 5);
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


  it("gathers a useful three-unit load from one nearby material node", () => {
    const world = makeWorld();
    world.resources.push({
      id: "wood-bundle",
      kind: "wood",
      x: 4,
      y: 1,
      quantity: 7,
      maxQuantity: 7,
      regrowEveryTicks: null
    });
    const hauler = makeHauler({ x: 1, y: 1 });
    world.agents.push(hauler);
    stepWorld(world, 4);
    expect(hauler.inventory.wood).toBe(3);
    expect(world.resources[0]?.quantity).toBe(4);
  });

  it("clearly reports when builders are waiting for the shared material recipe", () => {
    const world = makeWorld();
    const builder = makeBuilder();
    world.agents.push(builder);
    stepWorld(world);
    expect(builder.currentGoal).toBe("wait_for_materials");
    expect(world.buildings).toHaveLength(0);
  });

  it("clearly reports when a builder needs to find an open construction site", () => {
    const world = makeWorld();
    for (const [x, y] of [[2, 1], [1, 2], [0, 1], [1, 0]] as const) {
      const tile = world.tiles[y]?.[x];
      if (tile) tile.walkable = false;
    }
    world.stockpile.inventory = { wood: 5, stone: 2, food: 0, fish: 0 };
    const builder = makeBuilder();
    world.agents.push(builder);
    stepWorld(world);
    expect(builder.currentGoal).toBe("find_build_site");
    expect(world.stockpile.inventory).toEqual({ wood: 5, stone: 2, food: 0, fish: 0 });
  });

  it("completes a first shelter from a normal builder and hauler after relocating the stockpile to the chosen start", () => {
    const world = makeWorld();
    relocateStockpileNear(world, { x: 1, y: 1 });
    world.resources.push(
      { id: "wood-near", kind: "wood", x: 5, y: 2, quantity: 5, maxQuantity: 5, regrowEveryTicks: null },
      { id: "stone-near", kind: "stone", x: 6, y: 2, quantity: 4, maxQuantity: 4, regrowEveryTicks: null },
      { id: "food-near", kind: "wild_food", x: 1, y: 4, quantity: 20, maxQuantity: 20, regrowEveryTicks: 20 }
    );
    const water = world.tiles[4]?.[2];
    if (!water) throw new Error("Freshwater test tile missing");
    water.terrain = "river";
    water.waterKind = "freshwater";
    water.walkable = false;
    const builder = makeBuilder({ x: 2, y: 2 });
    const hauler = makeHauler({ id: "hauler-live", name: "Bo", x: 3, y: 2, perceptionRadius: 24 });
    world.agents.push(builder, hauler);

    stepWorld(world, 180);

    expect(world.stockpile.inventory).toEqual({ wood: 0, stone: 0, food: 0, fish: 0 });
    expect(world.buildings.some(building => building.kind === "shelter" && building.status === "complete")).toBe(true);
    expect(builder.homeId).not.toBeNull();
    expect(world.events.some(event => event.kind === "shelter_complete")).toBe(true);
  });


  it("causes starvation only after a grace period and records death", () => {
    const world = makeWorld();
    const water = world.tiles[1]?.[2];
    if (!water) throw new Error("Test freshwater tile was not created");
    water.terrain = "river";
    water.waterKind = "freshwater";
    water.walkable = false;

    const agent = makeAgent({
      needs: { hunger: 100, thirst: 0, energy: 100, health: 100 },
      inventory: { food: 0, fish: 0, wood: 2, stone: 1 }
    });
    world.agents.push(agent);

    stepWorld(world, 130);

    expect(agent.alive).toBe(false);
    expect(agent.needs.health).toBe(0);
    expect(world.events.some((event) =>
      event.agentId === agent.id && event.kind === "death_starvation"
    )).toBe(true);
    expect(world.resources).toEqual(expect.arrayContaining([
      expect.objectContaining({ kind: "wood", x: agent.x, y: agent.y, quantity: 2 }),
      expect.objectContaining({ kind: "stone", x: agent.x, y: agent.y, quantity: 1 })
    ]));
  });

  it("causes dehydration to become fatal when no freshwater can be reached", () => {
    const world = makeWorld();
    const agent = makeAgent({
      needs: { hunger: 0, thirst: 100, energy: 100, health: 100 }
    });
    world.agents.push(agent);

    stepWorld(world, 90);

    expect(agent.alive).toBe(false);
    expect(agent.needs.health).toBe(0);
    expect(world.events.some((event) =>
      event.agentId === agent.id && event.kind === "death_dehydration"
    )).toBe(true);
  });

  it("lets an agent with carried food avoid starvation damage by eating", () => {
    const world = makeWorld();
    const water = world.tiles[1]?.[2];
    if (!water) throw new Error("Test freshwater tile was not created");
    water.terrain = "river";
    water.waterKind = "freshwater";
    water.walkable = false;

    const agent = makeAgent({
      needs: { hunger: 100, thirst: 0, energy: 100, health: 100 },
      inventory: { food: 1, fish: 0, wood: 0, stone: 0 },
      starvationTicks: 40
    });
    world.agents.push(agent);

    stepWorld(world);

    expect(agent.alive).toBe(true);
    expect(agent.needs.hunger).toBeCloseTo(65, 5);
    expect(agent.needs.health).toBe(100);
    expect(agent.starvationTicks).toBe(0);
    expect(world.events.some((event) => event.kind === "eat")).toBe(true);
  });


  it("regrows wild food only after its own four-hour recovery timer", () => {
    const world = makeWorld();
    world.resources.push({
      id: "berry-patch",
      kind: "wild_food",
      x: 3,
      y: 3,
      quantity: 2,
      maxQuantity: 2,
      regrowEveryTicks: 240
    });
    takeResource(world, "berry-patch", 2);

    stepWorld(world, 239);
    expect(world.resources[0]?.quantity).toBe(0);
    stepWorld(world);
    expect(world.resources[0]?.quantity).toBe(1);
    expect(world.events.filter((event) => event.kind === "resource_regrown")).toHaveLength(1);
    stepWorld(world, 240);
    expect(world.resources[0]?.quantity).toBe(2);
    expect(world.resources[0]?.nextRegrowTick).toBeNull();
    stepWorld(world, 240);
    expect(world.resources[0]?.quantity).toBe(2);
  });

  it("allows forest timber to recover slowly while stone deposits remain finite", () => {
    const world = makeWorld();
    world.resources.push(
      {
        id: "forest-timber",
        kind: "wood",
        x: 3,
        y: 3,
        quantity: 2,
        maxQuantity: 2,
        regrowEveryTicks: 7200
      },
      {
        id: "stone-vein",
        kind: "stone",
        x: 4,
        y: 3,
        quantity: 3,
        maxQuantity: 3,
        regrowEveryTicks: null
      }
    );
    takeResource(world, "forest-timber", 2);
    takeResource(world, "stone-vein", 3);

    stepWorld(world, 7199);
    expect(world.resources[0]?.quantity).toBe(0);
    stepWorld(world);
    expect(world.resources[0]?.quantity).toBe(1);
    expect(world.events.filter((event) => event.kind === "resource_regrown")).toHaveLength(1);
    stepWorld(world, 7200);
    expect(world.resources[0]?.quantity).toBe(2);
    expect(world.resources[0]?.nextRegrowTick).toBeNull();
    expect(world.resources[1]?.quantity).toBe(0);
  });

  it("lets a fisher travel to a freshwater bank, catch fish and eat the catch", () => {
    const world = makeWorld();
    const water = world.tiles[1]?.[3];
    if (!water) throw new Error("Freshwater test tile missing");
    water.terrain = "river";
    water.waterKind = "freshwater";
    water.walkable = false;

    world.resources.push({
      id: "bank-fish",
      kind: "fish",
      x: 2,
      y: 1,
      quantity: 2,
      maxQuantity: 2,
      regrowEveryTicks: 720
    });
    const fisher = makeAgent({
      role: "fisher",
      currentGoal: "seek_fish",
      x: 1,
      y: 1,
      needs: { hunger: 64.95, thirst: 0, energy: 100, health: 100 }
    });
    world.agents.push(fisher);

    stepWorld(world, 2);

    expect(fisher.x).toBe(2);
    expect(fisher.inventory.fish).toBe(1);
    expect(world.resources[0]?.quantity).toBe(1);
    expect(world.events.some((event) => event.kind === "fish")).toBe(true);

    stepWorld(world);

    expect(fisher.inventory.fish).toBe(0);
    expect(fisher.needs.hunger).toBeLessThan(70);
    expect(world.events.some((event) => event.kind === "eat_fish")).toBe(true);
  });

  it("does not allow two fishers to catch more fish than a bank contains", () => {
    const world = makeWorld();
    const fish = {
      id: "small-school",
      kind: "fish" as const,
      x: 2,
      y: 1,
      quantity: 1,
      maxQuantity: 1,
      regrowEveryTicks: 720
    };
    world.resources.push(fish);
    const first = makeAgent({ id: "fisher-a", role: "fisher", x: 1, y: 1 });
    const second = makeAgent({ id: "fisher-b", role: "fisher", x: 1, y: 2 });
    world.agents.push(first, second);

    // Two ticks let the first fisher reach and catch the fish; a third tick
    // would let the hungry fisher eat it before the inventory assertion.
    stepWorld(world, 2);

    expect(first.inventory.fish + second.inventory.fish).toBe(1);
    expect(fish.quantity).toBe(0);
    expect(world.events.filter((event) => event.kind === "fish")).toHaveLength(1);
    expect(world.events.filter((event) => event.kind === "resource_depleted")).toHaveLength(1);
  });

  it("lets a depleted fish patch recover only after twelve simulated hours", () => {
    const world = makeWorld();
    world.resources.push({
      id: "lake-school",
      kind: "fish",
      x: 3,
      y: 3,
      quantity: 1,
      maxQuantity: 2,
      regrowEveryTicks: 720
    });
    takeResource(world, "lake-school", 1);

    stepWorld(world, 719);
    expect(world.resources[0]?.quantity).toBe(0);
    stepWorld(world);
    expect(world.resources[0]?.quantity).toBe(1);
    expect(world.events.filter((event) => event.kind === "resource_regrown")).toHaveLength(1);
  });

  it("slowly restores health when hunger thirst and energy are under control", () => {
    const world = makeWorld();
    const agent = makeAgent({
      needs: { hunger: 20, thirst: 20, energy: 60, health: 50 },
      inventory: { food: 0, fish: 0, wood: 0, stone: 0 }
    });
    world.agents.push(agent);

    stepWorld(world, 20);

    expect(agent.alive).toBe(true);
    expect(agent.needs.health).toBeCloseTo(55, 5);
    expect(agent.needs.hunger).toBeCloseTo(21.6, 5);
    expect(agent.needs.thirst).toBeCloseTo(22.4, 5);
  });


  it("lets foragers physically deliver gathered food to the communal reserve", () => {
    const world = makeWorld();
    world.stockpile.x = 3;
    world.stockpile.y = 1;
    world.tiles[1]![3]!.walkable = false;
    world.resources.push({
      id: "communal-food",
      kind: "wild_food",
      x: 2,
      y: 1,
      quantity: 2,
      maxQuantity: 2,
      regrowEveryTicks: 240
    });
    const forager = makeAgent({
      x: 1,
      y: 1,
      role: "forager",
      needs: { hunger: 20, thirst: 0, energy: 100, health: 100 }
    });
    world.agents.push(forager);

    stepWorld(world, 3);

    expect(world.stockpile.inventory.food).toBe(1);
    expect(forager.inventory.food).toBe(0);
    expect(world.resources[0]?.quantity).toBe(1);
    expect(world.events.some((event) => event.kind === "gather_food")).toBe(true);
    expect(world.events.some((event) => event.kind === "deliver_food")).toBe(true);
  });

  it("lets a hungry inhabitant collect and eat a ration from the communal stockpile", () => {
    const world = makeWorld();
    world.stockpile.x = 3;
    world.stockpile.y = 1;
    world.tiles[1]![3]!.walkable = false;
    world.stockpile.inventory.food = 1;
    const agent = makeAgent({
      x: 1,
      y: 1,
      needs: { hunger: 64.95, thirst: 0, energy: 100, health: 100 }
    });
    world.agents.push(agent);

    stepWorld(world, 2);

    expect(agent.x).toBe(2);
    expect(agent.inventory.food).toBe(1);
    expect(world.stockpile.inventory.food).toBe(0);
    expect(world.events.some((event) => event.kind === "collect_ration")).toBe(true);

    stepWorld(world);

    expect(agent.inventory.food).toBe(0);
    expect(agent.needs.hunger).toBeLessThan(35);
    expect(world.events.some((event) => event.kind === "eat")).toBe(true);
  });

  it("keeps freshwater drinking ahead of collecting a communal food ration", () => {
    const world = makeWorld();
    world.stockpile.inventory.food = 1;
    const water = world.tiles[1]?.[2];
    if (!water) throw new Error("Test freshwater tile was not created");
    water.terrain = "river";
    water.waterKind = "freshwater";
    water.walkable = false;
    const agent = makeAgent({
      needs: { hunger: 64.95, thirst: 64.95, energy: 100, health: 100 }
    });
    world.agents.push(agent);

    stepWorld(world);

    expect(agent.needs.thirst).toBeLessThan(25);
    expect(world.stockpile.inventory.food).toBe(1);
    expect(agent.inventory.food).toBe(0);
    expect(world.events.some((event) => event.kind === "drink")).toBe(true);
    expect(world.events.some((event) => event.kind === "collect_ration")).toBe(false);
  });

  it("does not distribute one stored ration to more than one hungry inhabitant", () => {
    const world = makeWorld();
    world.stockpile.x = 3;
    world.stockpile.y = 1;
    world.tiles[1]![3]!.walkable = false;
    world.stockpile.inventory.food = 1;
    const first = makeAgent({
      id: "hungry-a",
      x: 1,
      y: 1,
      needs: { hunger: 64.95, thirst: 0, energy: 100, health: 100 }
    });
    const second = makeAgent({
      id: "hungry-b",
      x: 1,
      y: 2,
      needs: { hunger: 64.95, thirst: 0, energy: 100, health: 100 }
    });
    world.agents.push(first, second);

    stepWorld(world, 2);

    expect(first.inventory.food + second.inventory.food).toBe(1);
    expect(world.stockpile.inventory.food).toBe(0);
    expect(world.events.filter((event) => event.kind === "collect_ration")).toHaveLength(1);
  });
});
