import { describe, expect, it } from "vitest";
import { findNearestUnexploredRoute, hasExploredTile, recordAgentExploration } from "../../src/core/exploration";
import { createWorld } from "../../src/core/world-generation";
import type { Agent } from "../../src/core/types";

function makeAgent(x = 8, y = 8): Agent {
  return {
    id: "scout",
    name: "Ari",
    ageYears: 25,
    x,
    y,
    traits: { curiosity: 0.9, diligence: 0.5, sociability: 0.5 },
    needs: { hunger: 0, thirst: 0, energy: 100, health: 100 },
    inventory: { food: 0, fish: 0, wood: 0, stone: 0 },
    role: "generalist",
    currentGoal: "explore",
    perceptionRadius: 12,
    sightRadius: 2,
    exploredTiles: [],
    explorationTarget: null,
    explorationComplete: false,
    explorationRecordIndex: -1,
    alive: true,
    homeId: null,
    buildingId: null
  };
}

function flatWorld(seed: number) {
  const world = createWorld(seed, { width: 16, height: 16 });
  for (const row of world.tiles) for (const tile of row) {
    tile.terrain = "grassland";
    tile.waterKind = "none";
    tile.walkable = true;
  }
  return world;
}

describe("inhabitant exploration memory", () => {
  it("remembers visible tiles and does not re-record the same position", () => {
    const world = flatWorld(88);
    const agent = makeAgent();
    expect(recordAgentExploration(world, agent)).toBe(true);
    const remembered = agent.exploredTiles ?? [];
    expect(remembered.length).toBeGreaterThan(1);
    expect(hasExploredTile(agent, agent.y * world.width + agent.x)).toBe(true);
    expect(recordAgentExploration(world, agent)).toBe(false);
    expect(agent.exploredTiles).toEqual(remembered);
  });

  it("chooses an unvisited reachable tile and stops when all reachable ground is known", () => {
    const world = flatWorld(89);
    const agent = makeAgent();
    recordAgentExploration(world, agent);
    const route = findNearestUnexploredRoute(world, agent);
    expect(route).not.toBeNull();
    expect(route?.path.length).toBeGreaterThan(0);
    expect(hasExploredTile(agent, route!.point.y * world.width + route!.point.x)).toBe(false);

    agent.exploredTiles = Array.from({ length: world.width * world.height }, (_, index) => index);
    agent.explorationComplete = false;
    expect(findNearestUnexploredRoute(world, agent)).toBeNull();
    expect(agent.explorationComplete).toBe(true);
  });

  it("shares discoveries so another inhabitant does not scout already known tiles", () => {
    const world = flatWorld(91);
    const first = makeAgent(8, 8);
    const second = makeAgent(8, 8);
    recordAgentExploration(world, first);
    const known = new Set(world.exploredTiles ?? []);
    expect(known.size).toBeGreaterThan(1);
    const route = findNearestUnexploredRoute(world, second);
    expect(route).not.toBeNull();
    expect(known.has(route!.point.y * world.width + route!.point.x)).toBe(false);
  });

  it("expands memory after moving into a different area", () => {
    const world = flatWorld(90);
    const agent = makeAgent(3, 3);
    recordAgentExploration(world, agent);
    const before = agent.exploredTiles?.length ?? 0;
    agent.x = 11;
    agent.y = 11;
    expect(recordAgentExploration(world, agent)).toBe(true);
    expect(agent.exploredTiles?.length).toBeGreaterThan(before);
  });
});
