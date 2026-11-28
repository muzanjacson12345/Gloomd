import type { Agent, AgentGoal } from "../core/types";
import { ROLE_VISUALS } from "../core/role-visuals";
import type { AppShell } from "./app-shell";

const GOAL_LABELS: Record<AgentGoal, string> = {
  seek_food: "Searching for food",
  seek_fish: "Looking for a fishing spot",
  fish: "Fishing",
  gather: "Gathering food",
  eat: "Eating",
  seek_water: "Finding water",
  drink: "Drinking",
  rest: "Resting",
  explore: "Exploring",
  gather_wood: "Gathering wood",
  gather_stone: "Gathering stone",
  deliver_resources: "Hauling to stockpile",
  deliver_food: "Delivering food to storage",
  seek_shared_food: "Walking to communal food",
  collect_ration: "Collecting a meal",
  search_resources: "Searching for building materials",
  wait_for_materials: "Waiting for building supplies",
  find_build_site: "Finding a building site",
  build_shelter: "Building a shelter",
  prepare_field: "Preparing a field",
  plant_crop: "Planting crops",
  tend_crop: "Tending crops",
  harvest_crop: "Harvesting crops",
  wait_for_crops: "Waiting for crops to grow",
  wait: "Waiting — nearby land is already explored"
};

export function formatAgentGoal(goal: AgentGoal): string {
  return GOAL_LABELS[goal];
}

export function renderAgentActivity(
  shell: AppShell,
  agents: readonly Agent[]
): void {
  const living = agents.filter((agent) => agent.alive);
  shell.activityCount.textContent = `${living.length.toString().padStart(2, "0")} ALIVE`;
  shell.activityList.replaceChildren();

  if (living.length === 0) {
    const empty = document.createElement("li");
    empty.className = "empty-event";
    empty.textContent = "No living inhabitants remain.";
    shell.activityList.append(empty);
    return;
  }

  for (const agent of living) {
    const row = document.createElement("li");
    const button = document.createElement("button");
    const identity = document.createElement("span");
    const name = document.createElement("strong");
    const role = document.createElement("span");
    const task = document.createElement("span");

    row.className = "activity-item";
    button.className = "activity-row";
    button.type = "button";
    button.dataset.agentId = agent.id;
    button.setAttribute(
      "aria-label",
      `${agent.name}, ${agent.role}, ${formatAgentGoal(agent.currentGoal)}. Select to inspect.`
    );
    identity.className = "activity-identity";
    name.className = "activity-name";
    name.textContent = agent.name;
    role.className = "activity-role";
    role.textContent = ROLE_VISUALS[agent.role].label;
    task.className = "activity-task";
    task.textContent = formatAgentGoal(agent.currentGoal);

    identity.append(name, role);
    button.append(identity, task);
    row.append(button);
    shell.activityList.append(row);
  }
}
