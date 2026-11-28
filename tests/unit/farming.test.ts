import { describe, expect, it } from "vitest";
import { stepWorld } from "../../src/core/simulation";
import { createWorld } from "../../src/core/world-generation";
import {
  advanceFarmPlots,
  canPrepareFarmPlot,
  CROP_GROWTH_TICKS,
  getFarmPlots,
  harvestFarmPlot,
  plantFarmPlot,
  prepareFarmPlot,
  tendFarmPlot
} from "../../src/core/farming";
import type { Agent } from "../../src/core/types";

function makeFarmWorld() {
  const world = createWorld(321, { width: 32, height: 32 });
  for (const row of world.tiles) {
    for (const tile of row) {
      tile.terrain = "grassland";
      tile.walkable = true;
      tile.waterKind = "none";
      tile.moisture = 0.5;
    }
  }
  world.resources = [];
  world.buildings = [];
  world.farmPlots = [];
  world.farmSeedBank = 2;
  world.agents = [];
  world.stockpile.x = 16;
  world.stockpile.y = 16;
  world.stockpile.inventory = { wood: 0, stone: 0, food: 0, fish: 0 };
  return world;
}

function makeFarmer(): Agent {
  return {
    id: "farmer-test",
    name: "Ari",
    ageYears: 24,
    x: 8,
    y: 8,
    traits: { curiosity: 0.5, diligence: 0.8, sociability: 0.5 },
    needs: { hunger: 0, thirst: 0, energy: 100, health: 100 },
    inventory: { food: 0, fish: 0, wood: 0, stone: 0 },
    role: "farmer",
    skills: { foraging: 0, fishing: 0, hauling: 0, building: 0, farming: 20 },
    roleChangedTick: 0,
    currentGoal: "explore",
    perceptionRadius: 16,
    sightRadius: 7,
    destination: null,
    plannedPath: [],
    starvationTicks: 0,
    dehydrationTicks: 0,
    alive: true,
    homeId: null,
    buildingId: null
  };
}

describe("real crop farming", () => {
  it("prepares only empty, walkable, moist grassland and never clears a live resource", () => {
    const world = makeFarmWorld();
    const field = { x: 4, y: 4 };
    expect(canPrepareFarmPlot(world, field)).toBe(true);
    world.tiles[field.y]![field.x]!.terrain = "forest";
    expect(canPrepareFarmPlot(world, field)).toBe(false);
    world.tiles[field.y]![field.x]!.terrain = "grassland";
    world.tiles[field.y]![field.x]!.moisture = 0.1;
    expect(canPrepareFarmPlot(world, field)).toBe(false);
    world.tiles[field.y]![field.x]!.moisture = 0.5;
    world.resources.push({
      id: "berries-on-field",
      kind: "wild_food",
      x: field.x,
      y: field.y,
      quantity: 1,
      maxQuantity: 1,
      regrowEveryTicks: null
    });
    expect(canPrepareFarmPlot(world, field)).toBe(false);
  });

  it("uses one seed to plant and grows crops gradually from actual soil moisture", () => {
    const world = makeFarmWorld();
    const plot = prepareFarmPlot(world, { x: 4, y: 4 });
    expect(plot?.stage).toBe("prepared");
    expect(world.farmSeedBank).toBe(2);
    expect(plantFarmPlot(world, plot!.id)).toBe(true);
    expect(world.farmSeedBank).toBe(1);
    expect(plot?.stage).toBe("growing");
    for (let tick = 0; tick < CROP_GROWTH_TICKS - 1; tick += 1) {
      expect(advanceFarmPlots(world)).toHaveLength(0);
    }
    expect(plot?.stage).toBe("growing");
    expect(advanceFarmPlots(world)).toEqual([plot]);
    expect(plot?.stage).toBe("ready");
  });

  it("allows tending only after its work interval and adds a limited growth bonus", () => {
    const world = makeFarmWorld();
    const plot = prepareFarmPlot(world, { x: 5, y: 5 });
    expect(plot).not.toBeNull();
    if (!plot) return;
    expect(plantFarmPlot(world, plot.id)).toBe(true);
    expect(tendFarmPlot(world, plot.id)).toBe(false);
    world.tick += 90;
    const before = plot.growthProgress;
    expect(tendFarmPlot(world, plot.id)).toBe(true);
    expect(plot.growthProgress).toBe(before + 24);
    expect(plot.stage).toBe("growing");
  });

  it("harvests only ripe crops, returns food and recycles exactly one seed", () => {
    const world = makeFarmWorld();
    const plot = prepareFarmPlot(world, { x: 6, y: 6 });
    expect(plot).not.toBeNull();
    if (!plot) return;
    expect(plantFarmPlot(world, plot.id)).toBe(true);
    expect(harvestFarmPlot(world, plot.id)).toBe(0);
    for (let tick = 0; tick < CROP_GROWTH_TICKS; tick += 1) advanceFarmPlots(world);
    expect(harvestFarmPlot(world, plot.id)).toBe(4);
    expect(plot.stage).toBe("prepared");
    expect(world.farmSeedBank).toBe(2);
    expect(harvestFarmPlot(world, plot.id)).toBe(0);
    expect(plantFarmPlot(world, plot.id)).toBe(true);
    expect(world.farmSeedBank).toBe(1);
  });

  it("lets a replacement farmer reach a field after its original farmer dies", () => {
    const world = makeFarmWorld();
    const originalFarmer = makeFarmer();
    originalFarmer.id = "farmer-who-died";
    originalFarmer.alive = false;
    const replacement = makeFarmer({ x: 2, y: 2 });
    replacement.id = "replacement-farmer";
    replacement.perceptionRadius = 1;
    world.agents.push(originalFarmer, replacement);
    const plot = prepareFarmPlot(world, { x: 5, y: 5 }, originalFarmer.id);
    expect(plot).not.toBeNull();
    if (!plot) return;
    plot.stage = "ready";
    plot.growthProgress = CROP_GROWTH_TICKS;

    stepWorld(world, 10);

    expect(replacement.inventory.food).toBe(4);
    expect(plot.stage).toBe("prepared");
    expect(world.events.some((event) =>
      event.kind === "crop_harvested" && event.agentId === replacement.id
    )).toBe(true);
  });

  it("lets an autonomous farmer harvest a ripe field into carried food", () => {
    const world = makeFarmWorld();
    const farmer = makeFarmer();
    world.agents.push(farmer);
    const plot = prepareFarmPlot(world, { x: farmer.x, y: farmer.y }, farmer.id);
    expect(plot).not.toBeNull();
    if (!plot) return;
    plot.stage = "ready";
    plot.growthProgress = CROP_GROWTH_TICKS;
    stepWorld(world);
    expect(farmer.inventory.food).toBe(4);
    expect(plot.stage).toBe("prepared");
    expect(world.farmSeedBank).toBe(3);
    expect(world.events.some((event) => event.kind === "crop_harvested")).toBe(true);
    expect(getFarmPlots(world)).toHaveLength(1);
  });
});
