export type TerrainType =
  | "water"
  | "beach"
  | "grassland"
  | "forest"
  | "hill"
  | "mountain"
  | "river";

export type WaterKind = "none" | "ocean" | "freshwater";

export type ResourceKind = "wild_food" | "fish" | "wood" | "stone";

export type AgentRole = "forager" | "fisher" | "hauler" | "builder" | "generalist";

export type BuildingStatus = "under_construction" | "complete";

export type BuildingMaterial = "wood" | "stone";

export type StoredFoodKind = "food" | "fish";

export interface AgentSkills {
  foraging: number;
  fishing: number;
  hauling: number;
  building: number;
}
export interface MaterialBundle {
  wood: number;
  stone: number;
}

export interface StockpileInventory extends MaterialBundle {
  food: number;
  fish: number;
}

export interface Stockpile {
  id: string;
  x: number;
  y: number;
  inventory: StockpileInventory;
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
  | "seek_fish"
  | "fish"
  | "gather"
  | "eat"
  | "seek_water"
  | "drink"
  | "rest"
  | "explore"
  | "gather_wood"
  | "gather_stone"
  | "deliver_resources"
  | "deliver_food"
  | "seek_shared_food"
  | "collect_ration"
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
  /** Next local recovery time; null means no recovery is currently scheduled. */
  nextRegrowTick?: number | null;
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
    fish: number;
    wood: number;
    stone: number;
  };
  role: AgentRole;
  /** Learned work skills; absent only in legacy or hand-built test agents. */
  skills?: AgentSkills;
  /** World tick at which this agent last changed its ordinary work role. */
  roleChangedTick?: number;
  currentGoal: AgentGoal;
  perceptionRadius: number;
  /** Visual line-of-sight radius; separate from resource-search perception. */
  sightRadius?: number;
  /** Current best-known walk destination, used only for observation overlays. */
  destination?: GridPoint | null;
  /** Remaining grid route to destination, kept aligned with the latest decision. */
  plannedPath?: GridPoint[];
  /** Consecutive simulated minutes with critical hunger or dehydration. */
  starvationTicks?: number;
  dehydrationTicks?: number;
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
