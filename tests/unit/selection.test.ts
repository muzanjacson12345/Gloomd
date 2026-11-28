import { describe, expect, it } from "vitest";
import { selectAgentsInWorldRect } from "../../src/ui/selection";
import type { Agent } from "../../src/core/types";

function makeAgent(id: string, x: number, y: number, alive = true): Agent {
  return {
    id,
    name: id,
    ageYears: 20,
    x,
    y,
    traits: { curiosity: 0.5, diligence: 0.5, sociability: 0.5 },
    needs: { hunger: 20, thirst: 20, energy: 100, health: 100 },
    inventory: { food: 0, fish: 0, wood: 0, stone: 0 },
    role: "forager",
    currentGoal: "explore",
    perceptionRadius: 12,
    alive,
    homeId: null,
    buildingId: null
  };
}

describe("rectangle selection", () => {
  it("selects living agents whose tile centres are inside the rectangle", () => {
    const agents = [
      makeAgent("inside-a", 2, 3),
      makeAgent("inside-b", 4, 4),
      makeAgent("outside", 8, 8)
    ];

    expect(selectAgentsInWorldRect(agents, { left: 2, top: 3, right: 5, bottom: 5 }))
      .toEqual(["inside-a", "inside-b"]);
  });

  it("normalises reversed drag corners", () => {
    const agents = [makeAgent("inside", 3, 2)];

    expect(selectAgentsInWorldRect(agents, { left: 5, top: 4, right: 2, bottom: 1 }))
      .toEqual(["inside"]);
  });

  it("never selects dead agents", () => {
    const agents = [makeAgent("dead", 3, 2, false)];

    expect(selectAgentsInWorldRect(agents, { left: 1, top: 1, right: 5, bottom: 5 }))
      .toEqual([]);
  });

  it("returns an empty selection for an area containing no agents", () => {
    expect(selectAgentsInWorldRect([makeAgent("outside", 9, 9)], {
      left: 1, top: 1, right: 2, bottom: 2
    })).toEqual([]);
  });
});
