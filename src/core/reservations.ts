import type { WorkReservationKind, WorldState } from "./types";

const RESOURCE_GOALS = new Set(["seek_food", "seek_fish", "gather_wood", "gather_stone"]);
const FARM_GOALS = new Set(["plant_crop", "tend_crop", "harvest_crop"]);

export function isWorksiteReserved(
  world: WorldState,
  kind: WorkReservationKind,
  targetId: string,
  exceptAgentId?: string
): boolean {
  return (world.workReservations ?? []).some((reservation) =>
    reservation.kind === kind && reservation.targetId === targetId &&
    reservation.agentId !== exceptAgentId &&
    world.agents.some((agent) => agent.id === reservation.agentId && agent.alive)
  );
}

export function reserveWorksite(
  world: WorldState,
  agentId: string,
  kind: WorkReservationKind,
  targetId: string,
  x: number,
  y: number
): boolean {
  const agent = world.agents.find((candidate) => candidate.id === agentId && candidate.alive);
  if (!agent || isWorksiteReserved(world, kind, targetId, agentId)) return false;
  const existing = (world.workReservations ?? []).find((reservation) => reservation.agentId === agentId &&
    reservation.kind === kind && reservation.targetId === targetId);
  if (existing) return true;
  // releaseAgentWorksites replaces the array, so obtain the active reference only after release.
  releaseAgentWorksites(world, agentId);
  const reservations = world.workReservations ?? (world.workReservations = []);
  reservations.push({ id: kind + ":" + targetId, agentId, kind, targetId, x, y });
  return true;
}

export function getWorkReservation(
  world: WorldState,
  kind: WorkReservationKind,
  targetId: string
): { agentId: string; x: number; y: number } | undefined {
  return (world.workReservations ?? []).find((candidate) =>
    candidate.kind === kind && candidate.targetId === targetId &&
    world.agents.some((agent) => agent.id === candidate.agentId && agent.alive)
  );
}

export function releaseAgentWorksites(world: WorldState, agentId: string): void {
  if (!world.workReservations) return;
  world.workReservations = world.workReservations.filter((reservation) => reservation.agentId !== agentId);
}

export function releaseWorksite(
  world: WorldState,
  agentId: string,
  kind: WorkReservationKind,
  targetId: string
): void {
  if (!world.workReservations) return;
  world.workReservations = world.workReservations.filter((reservation) =>
    !(reservation.agentId === agentId && reservation.kind === kind && reservation.targetId === targetId)
  );
}

/** Remove claims held by dead, reassigned, or no-longer-working inhabitants. */
export function pruneWorksiteReservations(world: WorldState): void {
  if (!world.workReservations?.length) return;
  world.workReservations = world.workReservations.filter((reservation) => {
    const agent = world.agents.find((candidate) => candidate.id === reservation.agentId && candidate.alive);
    if (!agent) return false;
    if (reservation.kind === "resource") {
      return RESOURCE_GOALS.has(agent.currentGoal) &&
        world.resources.some((resource) => resource.id === reservation.targetId && resource.quantity > 0);
    }
    if (reservation.kind === "farm_plot") {
      return FARM_GOALS.has(agent.currentGoal) &&
        (world.farmPlots ?? []).some((plot) => plot.id === reservation.targetId);
    }
    const tile = world.tiles[reservation.y]?.[reservation.x];
    const siteStillOpen = Boolean(tile?.walkable && tile.terrain === "grassland" && tile.moisture >= 0.25) &&
      !(world.farmPlots ?? []).some((plot) => plot.x === reservation.x && plot.y === reservation.y) &&
      !world.resources.some((resource) => resource.quantity > 0 && resource.x === reservation.x && resource.y === reservation.y) &&
      !world.buildings.some((building) => building.x === reservation.x && building.y === reservation.y);
    return agent.currentGoal === "prepare_field" && siteStillOpen;
  });
}
