import type { WorldState } from "../core/types";
import type { AppShell } from "./app-shell";

function formatWorldTime(tick: number): string {
  const totalMinutes = 360 + tick;
  const day = Math.floor(totalMinutes / 1440) + 1;
  const minuteOfDay = totalMinutes % 1440;
  const hours = Math.floor(minuteOfDay / 60).toString().padStart(2, "0");
  const minutes = (minuteOfDay % 60).toString().padStart(2, "0");
  return `DAY ${day.toString().padStart(2, "0")} · ${hours}:${minutes}`;
}

export function updateHud(shell: AppShell, world: WorldState, playing: boolean, speed: number, zoom: number): void {
  const population = world.agents.filter((agent) => agent.alive).length;
  const deaths = world.agents.filter((agent) => !agent.alive).length;
  const completedHomes = world.buildings.filter(
    (building) => building.kind === "shelter" && building.status === "complete"
  ).length;
  const totals = world.resources.reduce(
    (sum, resource) => {
      if (resource.quantity > 0) sum[resource.kind] += resource.quantity;
      return sum;
    },
    { wild_food: 0, wood: 0, stone: 0 }
  );
  shell.worldTime.textContent = formatWorldTime(world.tick);
  shell.population.textContent = population.toString().padStart(2, "0");
  shell.deathCount.textContent = deaths.toString().padStart(2, "0");
  shell.homeCount.textContent = completedHomes.toString().padStart(2, "0");
  shell.resourceSummary.textContent = `FOOD ${totals.wild_food} · WOOD ${totals.wood} · STONE ${totals.stone}`;
  shell.stockpileSummary.textContent = `WOOD ${world.stockpile.inventory.wood} · STONE ${world.stockpile.inventory.stone}`;
  shell.zoomLevel.textContent = `${zoom.toFixed(1)}×`;
  shell.playButton.textContent = playing ? "Ⅱ  PAUSE" : "▶  RESUME";
  shell.playButton.setAttribute("aria-label", playing ? "Pause simulation" : "Resume simulation");
  for (const button of shell.speedButtons) {
    const active = Number(button.dataset.speed) === speed;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", String(active));
  }
}
