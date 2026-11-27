import type { GridPoint, WorldState } from "./types";

interface OpenNode {
  index: number;
  cost: number;
  estimate: number;
  priority: number;
}

class MinHeap {
  private readonly values: OpenNode[] = [];

  get size(): number {
    return this.values.length;
  }

  push(value: OpenNode): void {
    this.values.push(value);
    let index = this.values.length - 1;

    while (index > 0) {
      const parent = Math.floor((index - 1) / 2);
      const parentValue = this.values[parent];
      if (!parentValue || compare(parentValue, value) <= 0) break;
      this.values[index] = parentValue;
      index = parent;
    }

    this.values[index] = value;
  }

  pop(): OpenNode | undefined {
    const first = this.values[0];
    const last = this.values.pop();
    if (!first || !last || this.values.length === 0) return first;

    let index = 0;
    while (true) {
      const left = index * 2 + 1;
      const right = left + 1;
      if (left >= this.values.length) break;

      let child = left;
      const leftValue = this.values[left];
      const rightValue = this.values[right];

      if (rightValue && leftValue && compare(rightValue, leftValue) < 0) {
        child = right;
      }

      const childValue = this.values[child];
      if (!childValue || compare(last, childValue) <= 0) break;

      this.values[index] = childValue;
      index = child;
    }

    this.values[index] = last;
    return first;
  }
}

function compare(left: OpenNode, right: OpenNode): number {
  return (
    left.priority - right.priority ||
    left.estimate - right.estimate ||
    left.index - right.index
  );
}

function isInside(world: WorldState, point: GridPoint): boolean {
  return (
    Number.isInteger(point.x) &&
    Number.isInteger(point.y) &&
    point.x >= 0 &&
    point.y >= 0 &&
    point.x < world.width &&
    point.y < world.height
  );
}

export function isWalkableTile(world: WorldState, point: GridPoint): boolean {
  if (!isInside(world, point) || !world.tiles[point.y]?.[point.x]?.walkable) {
    return false;
  }

  return !world.buildings.some(
    (building) => building.x === point.x && building.y === point.y
  );
}

function heuristic(a: GridPoint, b: GridPoint): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

export function findPath(
  world: WorldState,
  start: GridPoint,
  goal: GridPoint
): GridPoint[] | null {
  if (!isWalkableTile(world, start) || !isWalkableTile(world, goal)) return null;
  if (start.x === goal.x && start.y === goal.y) return [];

  const total = world.width * world.height;
  const startIndex = start.y * world.width + start.x;
  const goalIndex = goal.y * world.width + goal.x;
  const costs = new Float64Array(total);
  costs.fill(Number.POSITIVE_INFINITY);
  costs[startIndex] = 0;

  const parents = new Int32Array(total);
  parents.fill(-1);

  const closed = new Uint8Array(total);
  const open = new MinHeap();
  const startEstimate = heuristic(start, goal);

  open.push({
    index: startIndex,
    cost: 0,
    estimate: startEstimate,
    priority: startEstimate
  });

  // A fixed right/down/left/up order keeps equally good routes reproducible.
  const directions: readonly GridPoint[] = [
    { x: 1, y: 0 },
    { x: 0, y: 1 },
    { x: -1, y: 0 },
    { x: 0, y: -1 }
  ];

  while (open.size > 0) {
    const current = open.pop();
    if (!current) break;

    if (current.cost !== costs[current.index] || closed[current.index] === 1) {
      continue;
    }

    if (current.index === goalIndex) {
      const reversed: GridPoint[] = [];
      let cursor = goalIndex;

      while (cursor !== startIndex) {
        reversed.push({
          x: cursor % world.width,
          y: Math.floor(cursor / world.width)
        });
        cursor = parents[cursor] ?? -1;
        if (cursor < 0) return null;
      }

      reversed.reverse();
      return reversed;
    }

    closed[current.index] = 1;
    const currentPoint = {
      x: current.index % world.width,
      y: Math.floor(current.index / world.width)
    };

    for (const direction of directions) {
      const point = {
        x: currentPoint.x + direction.x,
        y: currentPoint.y + direction.y
      };
      if (!isWalkableTile(world, point)) continue;

      const neighborIndex = point.y * world.width + point.x;
      if (closed[neighborIndex] === 1) continue;

      const nextCost = current.cost + 1;
      if (nextCost >= costs[neighborIndex]!) continue;

      costs[neighborIndex] = nextCost;
      parents[neighborIndex] = current.index;

      const estimate = heuristic(point, goal);
      open.push({
        index: neighborIndex,
        cost: nextCost,
        estimate,
        priority: nextCost + estimate
      });
    }
  }

  return null;
}
