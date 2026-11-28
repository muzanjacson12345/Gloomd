import { CROP_FOOD_YIELD, CROP_GROWTH_TICKS } from "../core/farming";
import { getTileKnowledgeState } from "../core/exploration";
import { getWorkReservation } from "../core/reservations";
import type { Building, FarmPlot, ResourceNode, WorldState } from "../core/types";
import type { AppShell } from "./app-shell";

export type WorldObjectSelection =
  | { kind: "resource"; id: string }
  | { kind: "farm_plot"; id: string }
  | { kind: "building"; id: string }
  | { kind: "stockpile" }
  | { kind: "tile"; x: number; y: number };

const RESOURCE_NAMES: Record<ResourceNode["kind"], string> = {
  wild_food: "Wild food patch",
  fish: "Fishing ground",
  wood: "Timber stand",
  stone: "Stone outcrop"
};

function createRow(label: string, value: string): HTMLElement {
  const row = document.createElement("div");
  const caption = document.createElement("span");
  const reading = document.createElement("strong");
  row.className = "inspector-detail-row";
  caption.textContent = label;
  reading.textContent = value;
  row.append(caption, reading);
  return row;
}

function appendSection(target: HTMLElement, title: string): void {
  const heading = document.createElement("div");
  heading.className = "inspector-detail-heading";
  heading.textContent = title;
  target.append(heading);
}

function appendReservation(
  target: HTMLElement,
  world: WorldState,
  kind: "resource" | "farm_plot",
  id: string
): void {
  const reservation = getWorkReservation(world, kind, id);
  const agent = reservation
    ? world.agents.find((candidate) => candidate.id === reservation.agentId && candidate.alive)
    : null;
  target.append(createRow("WORKSITE", agent ? "IN USE · " + agent.name : "AVAILABLE"));
}

function describeResource(resource: ResourceNode, world: WorldState, target: HTMLElement): void {
  target.append(createRow("RESOURCE", RESOURCE_NAMES[resource.kind]));
  target.append(createRow("REMAINING", resource.quantity + " / " + resource.maxQuantity));
  const status = resource.quantity > 0
    ? "AVAILABLE"
    : resource.regrowEveryTicks === null
      ? "DEPLETED · FINITE"
      : "DEPLETED · RECOVERING";
  target.append(createRow("STATUS", status));
  if (resource.regrowEveryTicks !== null) {
    const timeRemaining = resource.nextRegrowTick !== undefined && resource.nextRegrowTick !== null
      ? Math.max(0, resource.nextRegrowTick - world.tick)
      : resource.quantity < resource.maxQuantity
        ? resource.regrowEveryTicks
        : 0;
    target.append(createRow("RECOVERY", timeRemaining > 0
      ? timeRemaining + " WORLD MIN"
      : resource.quantity >= resource.maxQuantity ? "FULL" : "NEXT CYCLE"));
  }
  appendReservation(target, world, "resource", resource.id);
}

function describeFarmPlot(plot: FarmPlot, world: WorldState, target: HTMLElement): void {
  const progress = plot.stage === "ready" ? 100
    : plot.stage === "prepared" ? 0
      : Math.round(Math.min(1, plot.growthProgress / CROP_GROWTH_TICKS) * 100);
  target.append(createRow("WORKSITE", "Farm plot"));
  target.append(createRow("CROP STAGE", plot.stage.toUpperCase()));
  target.append(createRow("GROWTH", progress + "%"));
  target.append(createRow("HARVEST", plot.stage === "ready" ? CROP_FOOD_YIELD + " food units ready" : "Not ready"));
  target.append(createRow("SEED BANK", String(world.farmSeedBank ?? 0)));
  appendReservation(target, world, "farm_plot", plot.id);
}

function describeBuilding(building: Building, world: WorldState, target: HTMLElement): void {
  target.append(createRow("STRUCTURE", "Shelter"));
  target.append(createRow("STATUS", building.status === "complete" ? "COMPLETE" : "UNDER CONSTRUCTION"));
  target.append(createRow("BUILD PROGRESS", Math.round(Math.min(1, building.workDone / building.workRequired) * 100) + "%"));
  target.append(createRow("WORK", building.workDone + " / " + building.workRequired));
  const builder = world.agents.find((agent) => agent.id === building.builderId && agent.alive);
  target.append(createRow("BUILDER", builder?.name ?? "NONE"));
}

function describeStockpile(world: WorldState, target: HTMLElement): void {
  target.append(createRow("STORAGE", "Communal stockpile"));
  target.append(createRow("CAPACITY / RESOURCE", String(world.stockpile.capacityPerResource)));
  appendSection(target, "STORED RESOURCES");
  for (const kind of ["food", "fish", "wood", "stone"] as const) {
    target.append(createRow(kind.toUpperCase(), world.stockpile.inventory[kind] + " / " + world.stockpile.capacityPerResource));
  }
}

export function findWorldObjectAtPoint(world: WorldState, point: { x: number; y: number }): WorldObjectSelection {
  const x = Math.floor(point.x);
  const y = Math.floor(point.y);
  const stockpile = world.stockpile;
  if (stockpile.x === x && stockpile.y === y) return { kind: "stockpile" };

  const resource = world.resources
    .filter((candidate) => candidate.x === x && candidate.y === y)
    .sort((left, right) => Number(right.quantity > 0) - Number(left.quantity > 0))[0];
  if (resource) return { kind: "resource", id: resource.id };

  const plot = (world.farmPlots ?? []).find((candidate) => candidate.x === x && candidate.y === y);
  if (plot) return { kind: "farm_plot", id: plot.id };

  const building = world.buildings.find((candidate) => candidate.x === x && candidate.y === y);
  if (building) return { kind: "building", id: building.id };
  return { kind: "tile", x, y };
}

export function renderWorldObjectInspector(
  shell: AppShell,
  world: WorldState,
  selection: WorldObjectSelection
): void {
  shell.inspector.hidden = false;
  shell.inspectorAgentContent.hidden = true;
  shell.inspectorDetails.hidden = false;
  shell.inspectorDetails.replaceChildren();

  let title = "Ground";
  let meta = "TILE · " + (selection.kind === "tile" ? (selection.x + 1) + ", " + (selection.y + 1) : "");
  const details = shell.inspectorDetails;

  if (selection.kind === "resource") {
    const resource = world.resources.find((candidate) => candidate.id === selection.id);
    if (!resource) { shell.inspector.hidden = true; return; }
    title = RESOURCE_NAMES[resource.kind];
    meta = "NATURAL RESOURCE · " + (resource.x + 1) + ", " + (resource.y + 1);
    describeResource(resource, world, details);
  } else if (selection.kind === "farm_plot") {
    const plot = (world.farmPlots ?? []).find((candidate) => candidate.id === selection.id);
    if (!plot) { shell.inspector.hidden = true; return; }
    title = "Farm plot";
    meta = "SETTLEMENT WORKSITE · " + (plot.x + 1) + ", " + (plot.y + 1);
    describeFarmPlot(plot, world, details);
  } else if (selection.kind === "building") {
    const building = world.buildings.find((candidate) => candidate.id === selection.id);
    if (!building) { shell.inspector.hidden = true; return; }
    title = "Shelter";
    meta = "BUILDING · " + (building.x + 1) + ", " + (building.y + 1);
    describeBuilding(building, world, details);
  } else if (selection.kind === "stockpile") {
    title = "Stockpile";
    meta = "SETTLEMENT STORAGE · " + (world.stockpile.x + 1) + ", " + (world.stockpile.y + 1);
    describeStockpile(world, details);
  } else {
    const tile = world.tiles[selection.y]?.[selection.x];
    if (!tile) { shell.inspector.hidden = true; return; }
    const water = tile.waterKind === "freshwater" ? "FRESHWATER" : tile.waterKind === "ocean" ? "OCEAN" : "NONE";
    title = tile.terrain.replaceAll("_", " ");
    meta = "TERRAIN · " + (selection.x + 1) + ", " + (selection.y + 1);
    details.append(createRow("WALKABLE", tile.walkable ? "YES" : "NO"));
    details.append(createRow("ELEVATION", tile.elevation.toFixed(2)));
    details.append(createRow("SOIL MOISTURE", Math.round(tile.moisture * 100) + "%"));
    details.append(createRow("WATER", water));
    const knowledge = getTileKnowledgeState(world, selection.y * world.width + selection.x);
    details.append(createRow("MAP STATUS", knowledge === "shared"
      ? "SHARED WITH SETTLEMENT"
      : knowledge === "personal"
        ? "PERSONAL NOTES"
        : "UNKNOWN"));
    const siteReservation = getWorkReservation(world, "farm_site", selection.x + ":" + selection.y);
    if (siteReservation) {
      const worker = world.agents.find((agent) => agent.id === siteReservation.agentId && agent.alive);
      details.append(createRow("FARMING SITE", "IN USE · " + (worker?.name ?? "WORKER")));
    }
  }

  shell.inspectorName.textContent = title;
  shell.inspectorMeta.textContent = meta;
}

