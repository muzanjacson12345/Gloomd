import { describe, expect, it } from "vitest";
import { createStarterAgents } from "../../src/core/agents";
import { createWorld } from "../../src/core/world-generation";
import type { Agent, GridPoint, WorldState } from "../../src/core/types";

describe("chosen settlement spawn location", () => {
  it("places a requested population near the chosen centre on unique walkable tiles", () => {
    const world = createWorld(77, { width: 32, height: 24 });
    for (const row of world.tiles) {
      for (const tile of row) {
        tile.terrain = "grassland";
        tile.walkable = true;
        tile.waterKind = "none";
      }
    }

    const createWithCenter = createStarterAgents as unknown as (
      world: WorldState,
      count: number,
      options: { center: GridPoint }
    ) => Agent[];
    const center = { x: 16, y: 12 };
    const agents = createWithCenter(world, 12, { center });

    expect(agents).toHaveLength(12);
    expect(new Set(agents.map((agent) => agent.id)).size).toBe(12);
    expect(new Set(agents.map((agent) => `${agent.x},${agent.y}`)).size).toBe(12);
    expect(agents.every((agent) => world.tiles[agent.y]?.[agent.x]?.walkable)).toBe(true);
    expect(agents.every((agent) => agent.x !== world.stockpile.x || agent.y !== world.stockpile.y)).toBe(true);
    expect(Math.max(...agents.map((agent) =>
      Math.abs(agent.x - center.x) + Math.abs(agent.y - center.y)
    ))).toBeLessThanOrEqual(8);
  });
});
