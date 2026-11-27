import { describe, expect, it } from "vitest";
import { findAgentAtWorldPoint } from "../../src/ui/map-input";
import type { Agent } from "../../src/core/types";

function agent(id: string, x: number, y: number): Agent {
  return {
    id,
    name: id,
    ageYears: 24,
    x,
    y,
    traits: { curiosity: 0.5, diligence: 0.5, sociability: 0.5 },
    needs: { hunger: 20, thirst: 20, energy: 100, health: 100 },
    inventory: { food: 0, wood: 0, stone: 0 },
    role: "forager",
    currentGoal: "explore",
    perceptionRadius: 12,
    alive: true
  };
}

describe("map agent picking", () => {
  it("selects the nearest living agent inside the pick radius", () => {
    const agents = [
      agent("far", 10, 10),
      agent("nearest", 5.2, 5.1),
      agent("next", 5.7, 5.2),
      agent("dead", 5, 5)
    ];
    agents[3]!.alive = false;

    expect(findAgentAtWorldPoint(agents, { x: 5, y: 5 }, 1)?.id).toBe("nearest");
  });

  it("returns no agent when every living agent is outside the pick radius", () => {
    const agents = [agent("distant", 10, 10)];

    expect(findAgentAtWorldPoint(agents, { x: 5, y: 5 }, 0.5)).toBeNull();
  });
});
