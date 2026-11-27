import type { GridPoint, WorldState } from "./types";

function blocksSight(world: WorldState, point: GridPoint): boolean {
  const tile = world.tiles[point.y]?.[point.x];
  if (!tile) return true;
  if (!tile.walkable || tile.terrain === "mountain" || tile.waterKind !== "none") return true;
  return world.buildings.some((building) => building.x === point.x && building.y === point.y);
}

/** Returns visible tile coordinates within radius, including the blocking edge tile. */
export function computeVisibleTiles(
  world: WorldState,
  origin: GridPoint,
  radius: number
): GridPoint[] {
  if (!Number.isFinite(radius) || radius < 0 || !Number.isInteger(radius)) {
    throw new RangeError("Vision radius must be a non-negative whole number.");
  }
  if (
    !Number.isInteger(origin.x) || !Number.isInteger(origin.y) ||
    origin.x < 0 || origin.y < 0 || origin.x >= world.width || origin.y >= world.height
  ) {
    return [];
  }

  const visible = new Map<string, GridPoint>();
  const add = (point: GridPoint) => visible.set(`${point.x}:${point.y}`, point);

  const hasLineOfSight = (target: GridPoint): boolean => {
    let x = origin.x;
    let y = origin.y;
    const dx = Math.abs(target.x - origin.x);
    const dy = Math.abs(target.y - origin.y);
    const sx = origin.x < target.x ? 1 : -1;
    const sy = origin.y < target.y ? 1 : -1;
    let error = dx - dy;

    while (x !== target.x || y !== target.y) {
      const doubled = 2 * error;
      if (doubled > -dy) {
        error -= dy;
        x += sx;
      }
      if (doubled < dx) {
        error += dx;
        y += sy;
      }

      if (x === target.x && y === target.y) return true;
      if (blocksSight(world, { x, y })) return false;
    }
    return true;
  };

  for (let y = Math.max(0, origin.y - radius); y <= Math.min(world.height - 1, origin.y + radius); y += 1) {
    for (let x = Math.max(0, origin.x - radius); x <= Math.min(world.width - 1, origin.x + radius); x += 1) {
      const distanceX = x - origin.x;
      const distanceY = y - origin.y;
      if (distanceX * distanceX + distanceY * distanceY > radius * radius) continue;
      const target = { x, y };
      if (hasLineOfSight(target)) add(target);
    }
  }

  return [...visible.values()];
}
