import type { Agent, GridPoint } from "../core/types";

export interface WorldSelectionRect {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

/** Select living agents by their tile centres, independent of drag direction. */
export function selectAgentsInWorldRect(
  agents: readonly Agent[],
  rect: WorldSelectionRect
): string[] {
  const left = Math.min(rect.left, rect.right);
  const right = Math.max(rect.left, rect.right);
  const top = Math.min(rect.top, rect.bottom);
  const bottom = Math.max(rect.top, rect.bottom);

  if (![left, right, top, bottom].every(Number.isFinite)) return [];

  return agents
    .filter((agent) => {
      if (!agent.alive) return false;
      const center: GridPoint = { x: agent.x + 0.5, y: agent.y + 0.5 };
      return center.x >= left && center.x <= right && center.y >= top && center.y <= bottom;
    })
    .map((agent) => agent.id);
}
