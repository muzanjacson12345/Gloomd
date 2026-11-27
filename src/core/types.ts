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

export type AgentGoal =
  | "seek_food"
  | "gather"
  | "eat"
  | "seek_water"
  | "drink"
  | "rest"
  | "explore";

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
  role: "forager";
  currentGoal: AgentGoal;
  perceptionRadius: number;
  alive: boolean;
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
  agents: Agent[];
  tick: number;
  events: WorldEvent[];
}

export interface WorldOptions {
  width?: number;
  height?: number;
}

export interface RandomSource {
  next(): number;
  int(min: number, max: number): number;
}

export interface StatefulRandomSource extends RandomSource {
  getState(): number;
}
