import type { WorldState } from "./types";

export function takeResource(
  world: WorldState,
  resourceId: string,
  amount: number
): number {
  if (!Number.isFinite(amount) || amount <= 0) return 0;

  const resource = world.resources.find((node) => node.id === resourceId);
  if (!resource || resource.quantity <= 0) return 0;

  const requested = Math.floor(amount);
  if (requested <= 0) return 0;

  const taken = Math.min(resource.quantity, requested);
  resource.quantity -= taken;
  return taken;
}
