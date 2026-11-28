import { describe, expect, it } from "vitest";
import { createStarterAgents } from "../../src/core/agents";
import { createWorld } from "../../src/core/world-generation";
import { isWorksiteReserved, pruneWorksiteReservations, releaseAgentWorksites, reserveWorksite } from "../../src/core/reservations";

describe("temporary worksite reservations", () => {
  it("prevents a second worker claiming a resource that is already reserved en route", () => {
    const world = createWorld(401, { width: 24, height: 24 });
    world.agents = createStarterAgents(world, 2);
    const first = world.agents[0];
    const second = world.agents[1];
    if (!first || !second) throw new Error("Test workers were not created");
    first.currentGoal = "gather_wood";
    second.currentGoal = "gather_wood";
    world.resources.push({
      id: "wood-patch", kind: "wood", x: 7, y: 8,
      quantity: 1, maxQuantity: 1, regrowEveryTicks: null
    });

    expect(reserveWorksite(world, first.id, "resource", "wood-patch", 7, 8)).toBe(true);
    expect(isWorksiteReserved(world, "resource", "wood-patch", second.id)).toBe(true);
    expect(reserveWorksite(world, second.id, "resource", "wood-patch", 7, 8)).toBe(false);
    expect(world.workReservations).toHaveLength(1);
  });

  it("releases a worker's old claim before assigning it a new worksite", () => {
    const world = createWorld(402, { width: 24, height: 24 });
    world.agents = createStarterAgents(world, 2);
    const first = world.agents[0];
    const second = world.agents[1];
    if (!first || !second) throw new Error("Test workers were not created");
    first.currentGoal = "gather_wood";
    world.resources.push(
      { id: "wood-a", kind: "wood", x: 4, y: 4, quantity: 1, maxQuantity: 1, regrowEveryTicks: null },
      { id: "wood-b", kind: "wood", x: 5, y: 5, quantity: 1, maxQuantity: 1, regrowEveryTicks: null }
    );
    expect(reserveWorksite(world, first.id, "resource", "wood-a", 4, 4)).toBe(true);
    expect(reserveWorksite(world, first.id, "resource", "wood-b", 5, 5)).toBe(true);
    expect(world.workReservations).toHaveLength(1);
    expect(world.workReservations?.[0]?.targetId).toBe("wood-b");
    releaseAgentWorksites(world, first.id);
    expect(reserveWorksite(world, second.id, "resource", "wood-a", 4, 4)).toBe(true);
  });

  it("clears claims held by dead, reassigned, or depleted-node workers", () => {
    const world = createWorld(403, { width: 24, height: 24 });
    world.agents = createStarterAgents(world, 2);
    const first = world.agents[0];
    const second = world.agents[1];
    if (!first || !second) throw new Error("Test workers were not created");
    first.currentGoal = "gather_wood";
    second.currentGoal = "plant_crop";
    world.resources.push({
      id: "wood-a", kind: "wood", x: 4, y: 4,
      quantity: 1, maxQuantity: 1, regrowEveryTicks: null
    });
    world.farmPlots = [{
      id: "plot-a", x: 5, y: 5, stage: "growing", growthProgress: 20, lastTendedTick: 0
    }];
    expect(reserveWorksite(world, first.id, "resource", "wood-a", 4, 4)).toBe(true);
    expect(reserveWorksite(world, second.id, "farm_plot", "plot-a", 5, 5)).toBe(true);

    const woodNode = world.resources.find((resource) => resource.id === "wood-a");
    if (!woodNode) throw new Error("Test wood node is missing");
    woodNode.quantity = 0;
    first.alive = false;
    second.currentGoal = "wait";
    pruneWorksiteReservations(world);

    expect(world.workReservations).toHaveLength(0);
  });
});
