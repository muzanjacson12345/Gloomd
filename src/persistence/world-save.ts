import type { Agent, AgentSkills, FarmPlot, GridPoint, ResourceNode, Tile, WorldState } from "../core/types";

export const WORLD_SAVE_FORMAT = "gloomd-world-save" as const;
export const WORLD_SAVE_VERSION = 2 as const;

export interface WorldSave {
  format: typeof WORLD_SAVE_FORMAT;
  schemaVersion: typeof WORLD_SAVE_VERSION;
  savedAt: number;
  startingPoint: GridPoint;
  world: WorldState;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isInteger(value: unknown): value is number {
  return Number.isSafeInteger(value);
}

function isPoint(value: unknown): value is GridPoint {
  return isRecord(value) && isInteger(value.x) && isInteger(value.y);
}

function isStockpileInventory(value: unknown): boolean {
  return isRecord(value) &&
    isFiniteNumber(value.wood) && value.wood >= 0 &&
    isFiniteNumber(value.stone) && value.stone >= 0 &&
    isFiniteNumber(value.food) && value.food >= 0 &&
    isFiniteNumber(value.fish) && value.fish >= 0;
}

function isTile(value: unknown): value is Tile {
  if (!isRecord(value)) return false;
  const terrain = ["water", "beach", "grassland", "forest", "hill", "mountain", "river"];
  return terrain.includes(String(value.terrain)) &&
    ["none", "ocean", "freshwater"].includes(String(value.waterKind)) &&
    isFiniteNumber(value.elevation) &&
    isFiniteNumber(value.moisture) &&
    typeof value.walkable === "boolean";
}

function isResource(value: unknown, width: number, height: number): value is ResourceNode {
  if (!isRecord(value)) return false;
  return typeof value.id === "string" &&
    ["wild_food", "fish", "wood", "stone"].includes(String(value.kind)) &&
    isInteger(value.x) && value.x >= 0 && value.x < width &&
    isInteger(value.y) && value.y >= 0 && value.y < height &&
    isFiniteNumber(value.quantity) && value.quantity >= 0 &&
    isFiniteNumber(value.maxQuantity) && value.maxQuantity >= value.quantity &&
    (value.regrowEveryTicks === null ||
      (isFiniteNumber(value.regrowEveryTicks) && value.regrowEveryTicks > 0)) &&
    (value.nextRegrowTick === undefined || value.nextRegrowTick === null ||
      (isInteger(value.nextRegrowTick) && value.nextRegrowTick >= 0));
}

function isAgent(value: unknown, width: number, height: number): value is Agent {
  if (!isRecord(value) || !isRecord(value.needs) || !isRecord(value.inventory) ||
      !isRecord(value.traits)) return false;

  const needs = value.needs;
  const inventory = value.inventory;
  const traits = value.traits;
  const skills = value.skills;
  const needNames = ["hunger", "thirst", "energy", "health"] as const;
  const inventoryNames = ["food", "fish", "wood", "stone"] as const;
  const traitNames = ["curiosity", "diligence", "sociability"] as const;
  const skillNames = ["foraging", "fishing", "hauling", "building", "farming"] as const;

  return typeof value.id === "string" &&
    typeof value.name === "string" &&
    isFiniteNumber(value.ageYears) && value.ageYears >= 0 &&
    isInteger(value.x) && value.x >= 0 && value.x < width &&
    isInteger(value.y) && value.y >= 0 && value.y < height &&
    needNames.every((name) => isFiniteNumber(needs[name]) && needs[name] >= 0 && needs[name] <= 100) &&
    inventoryNames.every((name) => isFiniteNumber(inventory[name]) && inventory[name] >= 0) &&
    traitNames.every((name) => isFiniteNumber(traits[name]) && traits[name] >= 0 && traits[name] <= 1) &&
    isRecord(skills) && skillNames.every((name) => isFiniteNumber(skills[name]) && skills[name] >= 0 && skills[name] <= 100) &&
    (value.roleChangedTick === undefined || (isInteger(value.roleChangedTick) && value.roleChangedTick >= 0)) &&
    ["forager", "fisher", "farmer", "hauler", "builder", "generalist"].includes(String(value.role)) &&
    typeof value.currentGoal === "string" &&
    isFiniteNumber(value.perceptionRadius) && value.perceptionRadius >= 0 &&
    (value.sightRadius === undefined || (isFiniteNumber(value.sightRadius) && value.sightRadius >= 0)) &&
    (value.destination === undefined || value.destination === null ||
      (isPoint(value.destination) && value.destination.x >= 0 && value.destination.x < width &&
        value.destination.y >= 0 && value.destination.y < height)) &&
    (value.plannedPath === undefined ||
      (Array.isArray(value.plannedPath) && value.plannedPath.every((point) =>
        isPoint(point) && point.x >= 0 && point.x < width && point.y >= 0 && point.y < height))) &&
    (value.exploredTiles === undefined ||
      (Array.isArray(value.exploredTiles) && value.exploredTiles.length <= width * height &&
        value.exploredTiles.every((index) => isInteger(index) && index >= 0 && index < width * height))) &&
    (value.explorationTarget === undefined || value.explorationTarget === null ||
      (isPoint(value.explorationTarget) && value.explorationTarget.x >= 0 && value.explorationTarget.x < width &&
        value.explorationTarget.y >= 0 && value.explorationTarget.y < height)) &&
    (value.explorationComplete === undefined || typeof value.explorationComplete === "boolean") &&
    (value.explorationRecordIndex === undefined ||
      (isInteger(value.explorationRecordIndex) && value.explorationRecordIndex >= -1 &&
        value.explorationRecordIndex < width * height)) &&
    (value.explorationPublishedCount === undefined ||
      (isInteger(value.explorationPublishedCount) && value.explorationPublishedCount >= 0 &&
        (!Array.isArray(value.exploredTiles) || value.explorationPublishedCount <= value.exploredTiles.length))) &&
    (value.explorationPhase === undefined ||
      ["idle", "outbound", "returning"].includes(String(value.explorationPhase))) &&
    (value.starvationTicks === undefined || (isInteger(value.starvationTicks) && value.starvationTicks >= 0)) &&
    (value.dehydrationTicks === undefined || (isInteger(value.dehydrationTicks) && value.dehydrationTicks >= 0)) &&
    typeof value.alive === "boolean" &&
    (value.homeId === null || typeof value.homeId === "string") &&
    (value.buildingId === null || typeof value.buildingId === "string");
}

function isFarmPlot(value: unknown, width: number, height: number): value is FarmPlot {
  if (!isRecord(value)) return false;
  return typeof value.id === "string" &&
    isInteger(value.x) && value.x >= 0 && value.x < width &&
    isInteger(value.y) && value.y >= 0 && value.y < height &&
    ["prepared", "growing", "ready"].includes(String(value.stage)) &&
    isFiniteNumber(value.growthProgress) && value.growthProgress >= 0 && value.growthProgress <= 360 &&
    isInteger(value.lastTendedTick) && value.lastTendedTick >= 0;
}

function isWorldState(value: unknown): value is WorldState {
  if (!isRecord(value)) return false;
  const width = value.width;
  const height = value.height;
  if (!isInteger(width) || !isInteger(height) ||
      width < 16 || height < 16 || width > 512 || height > 512 ||
      width * height > 65_536) return false;

  if (!Array.isArray(value.tiles) || value.tiles.length !== height ||
      !value.tiles.every((row) => Array.isArray(row) && row.length === width && row.every(isTile))) {
    return false;
  }

  if (!Array.isArray(value.resources) ||
      !value.resources.every((resource) => isResource(resource, width, height))) return false;

  if (!Array.isArray(value.agents) ||
      !value.agents.every((agent) => isAgent(agent, width, height))) return false;
  if (value.farmPlots !== undefined &&
      (!Array.isArray(value.farmPlots) || !value.farmPlots.every((plot) => isFarmPlot(plot, width, height)))) return false;
  if (value.farmSeedBank !== undefined &&
      (!isInteger(value.farmSeedBank) || value.farmSeedBank < 0 || value.farmSeedBank > 24)) return false;
  if (value.exploredTiles !== undefined &&
      (!Array.isArray(value.exploredTiles) || value.exploredTiles.length > width * height ||
        !value.exploredTiles.every((index) => isInteger(index) && index >= 0 && index < width * height))) return false;

  if (!Array.isArray(value.buildings) || !value.buildings.every((building) => {
    if (!isRecord(building)) return false;
    return typeof building.id === "string" &&
      building.kind === "shelter" &&
      isInteger(building.x) && building.x >= 0 && building.x < width &&
      isInteger(building.y) && building.y >= 0 && building.y < height &&
      ["under_construction", "complete"].includes(String(building.status)) &&
      isFiniteNumber(building.workDone) && building.workDone >= 0 &&
      isFiniteNumber(building.workRequired) && building.workRequired > 0 &&
      typeof building.builderId === "string";
  })) return false;

  if (!isRecord(value.stockpile) ||
      typeof value.stockpile.id !== "string" ||
      !isInteger(value.stockpile.x) || value.stockpile.x < 0 || value.stockpile.x >= width ||
      !isInteger(value.stockpile.y) || value.stockpile.y < 0 || value.stockpile.y >= height ||
      !isStockpileInventory(value.stockpile.inventory) ||
      !isFiniteNumber(value.stockpile.capacityPerResource) ||
      value.stockpile.capacityPerResource <= 0) return false;

  if (!isInteger(value.seed) || !isInteger(value.randomState) ||
      !isInteger(value.tick) || value.tick < 0) return false;

  if (!Array.isArray(value.events) || !value.events.every((event) => {
    if (!isRecord(event)) return false;
    return typeof event.id === "string" &&
      isInteger(event.tick) && event.tick >= 0 &&
      (event.agentId === null || typeof event.agentId === "string") &&
      typeof event.kind === "string" &&
      typeof event.message === "string";
  })) return false;

  return true;
}

function cloneWorld(world: WorldState): WorldState {
  const snapshot = JSON.parse(JSON.stringify(world)) as WorldState;
  // Worksite reservations are temporary and are always rebuilt after load.
  delete snapshot.workReservations;
  return snapshot;
}

export function createWorldSave(
  world: WorldState,
  startingPoint: GridPoint,
  savedAt = Date.now()
): WorldSave {
  if (!isFiniteNumber(savedAt) || savedAt < 0) {
    throw new RangeError("Save timestamp must be a non-negative finite number.");
  }
  if (!isPoint(startingPoint) ||
      startingPoint.x < 0 || startingPoint.x >= world.width ||
      startingPoint.y < 0 || startingPoint.y >= world.height ||
      !world.tiles[startingPoint.y]?.[startingPoint.x]?.walkable) {
    throw new RangeError("The starting point must be a walkable tile inside the world.");
  }

  const snapshot = cloneWorld(world);
  if (!isWorldState(snapshot)) {
    throw new TypeError("The current world contains invalid state and cannot be saved.");
  }

  return {
    format: WORLD_SAVE_FORMAT,
    schemaVersion: WORLD_SAVE_VERSION,
    savedAt,
    startingPoint: { ...startingPoint },
    world: snapshot
  };
}

export function serializeWorldSave(save: WorldSave): string {
  return JSON.stringify(save);
}

function migrateWorldSave(parsed: unknown): unknown {
  // Version-one saves created before fish and shared meals used smaller
  // inventories. Add zero-valued fields without changing their world state.
  const migrated = JSON.parse(JSON.stringify(parsed)) as unknown;
  if (!isRecord(migrated) || !isRecord(migrated.world)) return migrated;
  const sourceVersion = migrated.schemaVersion;

  if (!Array.isArray(migrated.world.farmPlots)) migrated.world.farmPlots = [];
  if (!isInteger(migrated.world.farmSeedBank) || migrated.world.farmSeedBank < 0) migrated.world.farmSeedBank = 6;
  if (!Array.isArray(migrated.world.exploredTiles)) migrated.world.exploredTiles = [];

  const stockpile = migrated.world.stockpile;
  if (isRecord(stockpile) && isRecord(stockpile.inventory)) {
    if (stockpile.inventory.food === undefined) stockpile.inventory.food = 0;
    if (stockpile.inventory.fish === undefined) stockpile.inventory.fish = 0;
  }

  if (Array.isArray(migrated.world.agents)) {
    for (const agent of migrated.world.agents) {
      if (!isRecord(agent) || !isRecord(agent.inventory)) continue;
      if (agent.inventory.fish === undefined) agent.inventory.fish = 0;
      if (isRecord(agent.skills) && agent.skills.farming === undefined) agent.skills.farming = 0;
      if (!isRecord(agent.skills)) {
        const skills: AgentSkills = { foraging: 0, fishing: 0, hauling: 0, building: 0, farming: 0 };
        const roleSkill: keyof AgentSkills | undefined = agent.role === "forager"
          ? "foraging"
          : agent.role === "fisher"
            ? "fishing"
            : agent.role === "hauler"
              ? "hauling"
              : agent.role === "builder"
                ? "building"
                : agent.role === "farmer"
                  ? "farming"
                  : undefined;
        if (roleSkill) skills[roleSkill] = 18;
        agent.skills = skills;
      }
      if (!Array.isArray(agent.exploredTiles)) agent.exploredTiles = [];
      if (agent.explorationTarget === undefined) agent.explorationTarget = null;
      if (typeof agent.explorationComplete !== "boolean") agent.explorationComplete = false;
      if (!isInteger(agent.explorationRecordIndex) || agent.explorationRecordIndex < -1) {
        agent.explorationRecordIndex = -1;
      }
      if (!isInteger(agent.explorationPublishedCount) || agent.explorationPublishedCount < 0) {
        // Version-one exploration was already shared immediately.
        agent.explorationPublishedCount = sourceVersion === 1 ? agent.exploredTiles.length : 0;
      }
      if (!["idle", "outbound", "returning"].includes(String(agent.explorationPhase))) {
        agent.explorationPhase = "idle";
      }
      if (!isInteger(agent.roleChangedTick) || agent.roleChangedTick < 0) agent.roleChangedTick = 0;
    }
  }

  delete migrated.world.workReservations;
  migrated.schemaVersion = WORLD_SAVE_VERSION;
  return migrated;
}

export function parseWorldSave(serialized: string): WorldSave {
  let parsed: unknown;
  try {
    parsed = JSON.parse(serialized) as unknown;
  } catch {
    throw new TypeError("The selected save file is not valid JSON.");
  }

  if (!isRecord(parsed) || parsed.format !== WORLD_SAVE_FORMAT) {
    throw new TypeError("This file is not a GLOOMD world save.");
  }
  if (parsed.schemaVersion !== 1 && parsed.schemaVersion !== WORLD_SAVE_VERSION) {
    throw new Error(`Unsupported GLOOMD save version: ${String(parsed.schemaVersion)}.`);
  }

  parsed = migrateWorldSave(parsed);
  if (!isRecord(parsed) ||
      !isFiniteNumber(parsed.savedAt) || parsed.savedAt < 0 ||
      !isPoint(parsed.startingPoint) || !isWorldState(parsed.world)) {
    throw new TypeError("The GLOOMD save is incomplete or contains invalid world data.");
  }

  const world = parsed.world;
  const start = parsed.startingPoint;
  if (
    start.x < 0 || start.x >= world.width ||
    start.y < 0 || start.y >= world.height ||
    !world.tiles[start.y]?.[start.x]?.walkable
  ) {
    throw new TypeError("The saved starting point is not a walkable tile inside the world.");
  }

  return parsed as unknown as WorldSave;
}
