import type { FarmPlot, GridPoint, WorldState } from "./types";

export const INITIAL_FARM_SEEDS = 6;
export const MAX_FARM_SEEDS = 24;
export const MAX_FARM_PLOTS = 8;
export const CROP_GROWTH_TICKS = 360;
export const CROP_FOOD_YIELD = 4;
export const FARM_TEND_INTERVAL_TICKS = 90;
export const FARM_TEND_GROWTH_BONUS = 24;

export function getFarmPlots(world: WorldState): FarmPlot[] {
  if (!world.farmPlots) world.farmPlots = [];
  return world.farmPlots;
}

export function getFarmSeedBank(world: WorldState): number {
  if (!Number.isFinite(world.farmSeedBank) || (world.farmSeedBank ?? 0) < 0) {
    world.farmSeedBank = 0;
  }
  return world.farmSeedBank ?? 0;
}

export function canPrepareFarmPlot(world: WorldState, point: GridPoint, workingAgentId?: string): boolean {
  if (!Number.isInteger(point.x) || !Number.isInteger(point.y) ||
      point.x < 0 || point.y < 0 || point.x >= world.width || point.y >= world.height) return false;
  const tile = world.tiles[point.y]?.[point.x];
  if (!tile?.walkable || tile.terrain !== "grassland" || tile.moisture < 0.25) return false;
  if (world.stockpile.x === point.x && world.stockpile.y === point.y) return false;
  if (world.buildings.some((b) => b.x === point.x && b.y === point.y)) return false;
  if (world.resources.some((r) => r.quantity > 0 && r.x === point.x && r.y === point.y)) return false;
  if (getFarmPlots(world).some((p) => p.x === point.x && p.y === point.y)) return false;
  if (world.agents.some((a) => a.alive && a.id !== workingAgentId && a.x === point.x && a.y === point.y)) return false;
  return true;
}

export function prepareFarmPlot(world: WorldState, point: GridPoint, workingAgentId?: string): FarmPlot | null {
  if (!canPrepareFarmPlot(world, point, workingAgentId)) return null;
  const plot: FarmPlot = {
    id: `farm-${point.x}-${point.y}-${world.tick}`,
    x: point.x,
    y: point.y,
    stage: "prepared",
    growthProgress: 0,
    lastTendedTick: world.tick
  };
  getFarmPlots(world).push(plot);
  return plot;
}

export function plantFarmPlot(world: WorldState, plotId: string): boolean {
  const plot = getFarmPlots(world).find((p) => p.id === plotId);
  if (!plot || plot.stage !== "prepared" || getFarmSeedBank(world) < 1) return false;
  world.farmSeedBank = getFarmSeedBank(world) - 1;
  plot.stage = "growing";
  plot.growthProgress = 0;
  plot.lastTendedTick = world.tick;
  return true;
}

export function advanceFarmPlots(world: WorldState): FarmPlot[] {
  const newlyReady: FarmPlot[] = [];
  for (const plot of getFarmPlots(world)) {
    if (plot.stage !== "growing") continue;
    const moisture = Math.max(0, Math.min(1, world.tiles[plot.y]?.[plot.x]?.moisture ?? 0.4));
    plot.growthProgress = Math.min(CROP_GROWTH_TICKS, plot.growthProgress + 0.65 + moisture * 0.7);
    if (plot.growthProgress >= CROP_GROWTH_TICKS) {
      plot.stage = "ready";
      newlyReady.push(plot);
    }
  }
  return newlyReady;
}

export function tendFarmPlot(world: WorldState, plotId: string): boolean {
  const plot = getFarmPlots(world).find((p) => p.id === plotId);
  if (!plot || plot.stage !== "growing" ||
      world.tick - plot.lastTendedTick < FARM_TEND_INTERVAL_TICKS) return false;
  plot.lastTendedTick = world.tick;
  plot.growthProgress = Math.min(CROP_GROWTH_TICKS, plot.growthProgress + FARM_TEND_GROWTH_BONUS);
  if (plot.growthProgress >= CROP_GROWTH_TICKS) plot.stage = "ready";
  return true;
}

export function harvestFarmPlot(world: WorldState, plotId: string): number {
  const plot = getFarmPlots(world).find((p) => p.id === plotId);
  if (!plot || plot.stage !== "ready") return 0;
  plot.stage = "prepared";
  plot.growthProgress = 0;
  plot.lastTendedTick = world.tick;
  world.farmSeedBank = Math.min(MAX_FARM_SEEDS, getFarmSeedBank(world) + 1);
  return CROP_FOOD_YIELD;
}
