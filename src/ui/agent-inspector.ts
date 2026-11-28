import type { Agent } from "../core/types";
import type { AppShell, AgentNeed } from "./app-shell";
import { formatAgentGoal } from "./agent-activity";
import { ROLE_VISUALS } from "../core/role-visuals";

const NEEDS: readonly AgentNeed[] = ["hunger", "thirst", "energy", "health"];

export function renderAgentInspector(shell: AppShell, agent: Agent | null): void {
  shell.inspector.hidden = agent === null;
  shell.inspectorAgentContent.hidden = false;
  shell.inspectorDetails.hidden = true;
  shell.inspectorDetails.replaceChildren();
  if (!agent) return;
  shell.inspectorName.textContent = agent.name;
  shell.inspectorMeta.textContent = `AGE ${agent.ageYears} · ${ROLE_VISUALS[agent.role].label}`;
  shell.inspectorGoal.textContent = formatAgentGoal(agent.currentGoal);
  shell.inspectorLocation.textContent = `${agent.x + 1}, ${agent.y + 1}`;
  shell.inspectorHome.textContent = agent.homeId !== null
    ? "SHELTER"
    : agent.buildingId !== null
      ? "UNDER CONSTRUCTION"
      : "NONE";
  shell.inspectorInventory.textContent = `${agent.inventory.food} food · ${agent.inventory.fish} fish · ${agent.inventory.wood} wood · ${agent.inventory.stone} stone`;
  for (const need of NEEDS) {
    const value = Math.max(0, Math.min(100, agent.needs[need]));
    shell.needs[need].fill.style.width = `${value}%`;
    shell.needs[need].value.textContent = `${Math.round(value)}%`;
    shell.needs[need].fill.dataset.level =
      need === "health" || need === "energy"
        ? value < 25 ? "low" : "normal"
        : value >= 75 ? "high" : "normal";
  }
}
