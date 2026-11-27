export type TerrainType =
  | "water"
  | "beach"
  | "grassland"
  | "forest"
  | "hill"
  | "mountain"
  | "river";

export type WaterKind = "none" | "ocean" | "freshwater";

export type ResourceKind = "wild_food" | "wood" | "stone";

export type AgentRole = "forager" | "hauler" | "builder";

export type BuildingStatus = "under_construction" | "complete";

export type BuildingMaterial = "wood" | "stone";

export interface MaterialBundle {
  wood: number;
  stone: number;
}

export interface Stockpile {
  id: string;
  x: number;
  y: number;
  inventory: MaterialBundle;
  capacityPerResource: number;
}

export interface Building {
  id: string;
  kind: "shelter";
  x: number;
  y: number;
  status: BuildingStatus;
  workDone: number;
  workRequired: number;
  builderId: string;
}

export type AgentGoal =
  | "seek_food"
  | "gather"
  | "eat"
  | "seek_water"
  | "drink"
  | "rest"
  | "explore"
  | "gather_wood"
  | "gather_stone"
  | "deliver_resources"
  | "search_resources"
  | "wait_for_materials"
  | "find_build_site"
  | "build_shelter";

export interface GridPoint {
  x: number;
  y: number;
}

export interface Tile {
  terrain: TerrainType;
  elevation: number;
  moisture: number;
  waterKind: WaterKind;
  walkable: boolean;
}

export interface ResourceNode {
  id: string;
  kind: ResourceKind;
  x: number;
  y: number;
  quantity: number;
  maxQuantity: number;
  regrowEveryTicks: number | null;
}

export interface Agent {
  id: string;
  name: string;
  ageYears: number;
  x: number;
  y: number;
  traits: {
    curiosity: number;
    diligence: number;
    sociability: number;
  };
  needs: {
    hunger: number;
    thirst: number;
    energy: number;
    health: number;
  };
  inventory: {
    food: number;
    wood: number;
    stone: number;
  };
  role: AgentRole;
  currentGoal: AgentGoal;
  perceptionRadius: number;
  alive: boolean;
  homeId: string | null;
  buildingId: string | null;
}

export interface WorldEvent {
  id: string;
  tick: number;
  agentId: string | null;
  kind: string;
  message: string;
}

export interface WorldState {
  seed: number;
  randomState: number;
  width: number;
  height: number;
  tiles: Tile[][];
  resources: ResourceNode[];
  stockpile: Stockpile;
  buildings: Building[];
  agents: Agent[];
  tick: number;
  events: WorldEvent[];
}

export interface WorldOptions {
  width?: number;
  height?: number;
  waterCoverage?: number;
}

export interface RandomSource {
  next(): number;
  int(min: number, max: number): number;
}

export interface StatefulRandomSource extends RandomSource {
  getState(): number;
}
