import { describe, expect, it } from "vitest";
import { formatAgentGoal } from "../../src/ui/agent-activity";
import type { AgentGoal } from "../../src/core/types";

describe("readable inhabitant activity", () => {
  const cases: readonly [AgentGoal, string][] = [
    ["seek_food", "Searching for food"],
    ["gather", "Gathering food"],
    ["eat", "Eating"],
    ["seek_water", "Finding water"],
    ["drink", "Drinking"],
    ["rest", "Resting"],
    ["explore", "Exploring"],
    ["gather_wood", "Gathering wood"],
    ["gather_stone", "Gathering stone"],
    ["deliver_resources", "Hauling to stockpile"],
    ["deliver_food", "Delivering food to storage"],
    ["seek_shared_food", "Walking to communal food"],
    ["collect_ration", "Collecting a meal"],
    ["build_shelter", "Building a shelter"],
    ["search_resources", "Searching for building materials"],
    ["wait_for_materials", "Waiting for building supplies"],
    ["find_build_site", "Finding a building site"]
  ];

  it.each(cases)("translates %s into a clear current activity", (goal, label) => {
    expect(formatAgentGoal(goal)).toBe(label);
  });
});
