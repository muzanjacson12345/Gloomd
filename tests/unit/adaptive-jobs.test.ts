import { describe, expect, it } from "vitest";
import { stepWorld } from "../../src/core/simulation";
import { createWorld } from "../../src/core/world-generation";
import type { Agent, AgentRole, WorldState } from "../../src/core/types";

function makeWorld(): WorldState {
  const world = createWorld(31, { width: 32, height: 32 });
  for (const row of world.tiles) {
    for (const tile of row) {
      tile.terrain = "grassland";
      tile.waterKind = "none";
      tile.walkable = true;
    }
  }
  world.resources = [];
  world.agents = [];
  world.stockpile.inventory = { wood: 0, stone: 0, food: 0, fish: 0 };
  return world;
}

function makeWorker(id: string, role: AgentRole, homeId: string | null): Agent {
  return {
    id,
    name: id,
    ageYears: 28,
    x: 2,
    y: 2,
    traits: { curiosity: 0.5, diligence: 0.7, sociability: 0.5 },
    needs: { hunger: 20, thirst: 20, energy: 100, health: 100 },
    inventory: { food: 0, fish: 0, wood: 0, stone: 0 },
    skills: { foraging: 0, fishing: 0, hauling: 0, building: 0 },
    roleChangedTick: 0,
    role,
    currentGoal: "explore",
    perceptionRadius: 12,
    sightRadius: 7,
    destination: null,
    plannedPath: [],
    starvationTicks: 0,
    dehydrationTicks: 0,
    alive: true,
    homeId,
    buildingId: null
  };
}

describe("adaptive work allocation", () => {
  it("waits for the review interval, then assigns foragers when the shared meal reserve is short", () => {
    const world = makeWorld();
    const first = makeWorker("worker-a", "generalist", "home-a");
    const second = makeWorker("worker-b", "generalist", "home-b");
    world.agents.push(first, second);
    world.resources.push({
      id: "local-meals",
      kind: "wild_food",
      x: 2,
      y: 2,
      quantity: 4,
      maxQuantity: 4,
      regrowEveryTicks: 240
    });

    world.tick = 59;
    stepWorld(world);
    expect(world.agents.every((agent) => agent.role === "generalist")).toBe(true);

    world.tick = 119;
    stepWorld(world);

    expect(world.agents.filter((agent) => agent.role === "forager")).toHaveLength(1);
    expect(world.agents.filter((agent) => agent.role === "generalist")).toHaveLength(1);
    expect(world.events.some((event) => event.kind === "job_changed")).toBe(true);
  });

  it("assigns hauling while shelter materials are missing, then building after the recipe is stored", () => {
    const world = makeWorld();
    const worker = makeWorker("worker-a", "generalist", null);
    world.agents.push(worker);
    world.stockpile.inventory.food = 1;
    world.tick = 119;

    stepWorld(world);
    expect(worker.role).toBe("hauler");
    expect(world.events.some((event) => event.kind === "job_changed" && event.message.includes("wood or stone"))).toBe(true);

    world.stockpile.inventory.wood = 5;
    world.stockpile.inventory.stone = 2;
    world.stockpile.inventory.food = 20;
    world.tick = 239;
    stepWorld(world);

    expect(worker.role).toBe("builder");
    expect(worker.buildingId).not.toBeNull();
    expect(world.events.some((event) => event.kind === "job_changed" && event.message.includes("building"))).toBe(true);
  });

  it("gains foraging experience when a forager actually gathers a resource", () => {
    const world = makeWorld();
    const worker = makeWorker("worker-a", "forager", "home-a");
    worker.needs.hunger = 65;
    world.agents.push(worker);
    world.resources.push({
      id: "meal-at-feet",
      kind: "wild_food",
      x: worker.x,
      y: worker.y,
      quantity: 2,
      maxQuantity: 2,
      regrowEveryTicks: 240
    });

    stepWorld(world);

    expect(worker.skills?.foraging).toBeGreaterThan(0);
    expect(worker.inventory.food).toBe(1);
    expect(world.events.some((event) => event.kind === "gather_food")).toBe(true);
  });

  it("does not interrupt a recent assignment just because another job becomes slightly more useful", () => {
    const world = makeWorld();
    const worker = makeWorker("worker-a", "builder", "home-a");
    worker.roleChangedTick = 200;
    world.agents.push(worker);
    world.tick = 239;

    stepWorld(world);

    expect(worker.role).toBe("builder");
    expect(world.events.some((event) => event.kind === "job_changed")).toBe(false);
  });
});