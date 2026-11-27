import { createRandom } from "./random";
import type {
  GridPoint,
  ResourceKind,
  ResourceNode,
  Stockpile,
  Tile,
  WaterKind,
  WorldOptions,
  WorldState
} from "./types";

const DEFAULT_WIDTH = 128;
const DEFAULT_HEIGHT = 96;
const MIN_DIMENSION = 16;
const MAX_DIMENSION = 512;
const RESOURCE_FOOD_REGROW_TICKS = 40;

function clamp(value: number, min = 0, max = 1): number {
  return Math.max(min, Math.min(max, value));
}

function isValidDimension(value: number): boolean {
  return Number.isInteger(value) && value >= MIN_DIMENSION && value <= MAX_DIMENSION;
}

function resourceEligible(kind: ResourceKind, tile: Tile): boolean {
  switch (kind) {
    case "wild_food":
      return tile.walkable && (tile.terrain === "grassland" || tile.terrain === "forest" || tile.terrain === "beach");
    case "wood":
      return tile.walkable && (tile.terrain === "forest" || tile.terrain === "grassland");
    case "stone":
      return tile.walkable && (tile.terrain === "hill" || tile.terrain === "mountain" || tile.terrain === "grassland");
  }
}

function createTerrain(
  width: number,
  height: number,
  seed: number
): Tile[][] {
  const seedOffset = (seed % 100_003) * 0.0007;
  const lakeX = width * (0.68 + Math.sin(seedOffset) * 0.025);
  const lakeY = height * (0.47 + Math.cos(seedOffset) * 0.035);
  const lakeRadiusX = Math.max(2, width * 0.055);
  const lakeRadiusY = Math.max(2, height * 0.075);

  const tiles = Array.from({ length: height }, (_, y) =>
    Array.from({ length: width }, (_, x): Tile => {
      const elevationWave =
        Math.sin(x * 0.061 + seedOffset) * 0.17 +
        Math.cos(y * 0.073 - seedOffset) * 0.16 +
        Math.sin((x + y) * 0.039 + seedOffset * 1.7) * 0.13 +
        Math.cos((x - y) * 0.027 - seedOffset) * 0.09;
      const ridge = Math.abs(Math.sin((x * 0.023 + y * 0.015) + seedOffset)) * 0.13;
      const elevation = clamp(0.48 + elevationWave + ridge, 0.04, 0.96);
      const moisture = clamp(
        0.5 +
          Math.cos(x * 0.047 + seedOffset) * 0.2 +
          Math.sin(y * 0.058 - seedOffset * 0.8) * 0.19 +
          Math.sin((x + y) * 0.019) * 0.08,
        0.04,
        0.96
      );

      const oceanEdge = 6 + Math.sin(y * 0.105 + seedOffset) * 1.8 + Math.sin(y * 0.037) * 1.3;
      const ocean = x < oceanEdge;
      const inLake =
        ((x - lakeX) / lakeRadiusX) ** 2 +
        ((y - lakeY) / lakeRadiusY) ** 2 <= 1;

      const riverCenter =
        Math.max(
          oceanEdge + 3,
          width * 0.36 +
            Math.sin(y * 0.075 + seedOffset * 2) * width * 0.035 +
            Math.sin(y * 0.19 - seedOffset) * width * 0.012
        );
      const inRiver =
        y >= 2 &&
        y <= height - 3 &&
        Math.abs(x - riverCenter) <= 1 &&
        !ocean;

      let waterKind: WaterKind = "none";
      let terrain: Tile["terrain"] = "grassland";
      let walkable = true;

      if (ocean) {
        waterKind = "ocean";
        terrain = "water";
        walkable = false;
      } else if (inLake) {
        waterKind = "freshwater";
        terrain = "water";
        walkable = false;
      } else if (inRiver) {
        waterKind = "freshwater";
        terrain = "river";
        walkable = false;
      } else if (elevation >= 0.79) {
        terrain = "mountain";
      } else if (elevation >= 0.67) {
        terrain = "hill";
      } else if (moisture >= 0.57) {
        terrain = "forest";
      }

      return { terrain, elevation, moisture, waterKind, walkable };
    })
  );

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const tile = tiles[y]?.[x];
      if (!tile || !tile.walkable) continue;

      const nearWater = [
        tiles[y - 1]?.[x],
        tiles[y + 1]?.[x],
        tiles[y]?.[x - 1],
        tiles[y]?.[x + 1]
      ].some((neighbor) => neighbor !== undefined && neighbor.waterKind !== "none");

      if (nearWater) tile.terrain = "beach";
    }
  }

  return tiles;
}

function createResources(
  tiles: Tile[][],
  random: ReturnType<typeof createRandom>
): ResourceNode[] {
  const resources: ResourceNode[] = [];
  let nextId = 1;

  const addResource = (
    kind: ResourceKind,
    x: number,
    y: number,
    quantity: number,
    regrowEveryTicks: number | null
  ): void => {
    resources.push({
      id: `resource-${nextId}`,
      kind,
      x,
      y,
      quantity,
      maxQuantity: quantity,
      regrowEveryTicks
    });
    nextId += 1;
  };

  for (let y = 0; y < tiles.length; y += 1) {
    const row = tiles[y];
    if (!row) continue;

    for (let x = 0; x < row.length; x += 1) {
      const tile = row[x];
      if (!tile || !tile.walkable) continue;

      if (tile.terrain === "forest" && random.next() < 0.055) {
        addResource("wood", x, y, random.int(3, 7), null);
      }

      if (
        (tile.terrain === "grassland" || tile.terrain === "forest" || tile.terrain === "beach") &&
        random.next() < 0.035
      ) {
        addResource("wild_food", x, y, random.int(2, 5), RESOURCE_FOOD_REGROW_TICKS);
      }

      if (
        (tile.terrain === "hill" || tile.terrain === "mountain") &&
        random.next() < 0.045
      ) {
        addResource("stone", x, y, random.int(3, 8), null);
      }
    }
  }

  const ensureResource = (kind: ResourceKind): void => {
    if (resources.some((resource) => resource.kind === kind)) return;

    for (let y = 0; y < tiles.length; y += 1) {
      const row = tiles[y];
      if (!row) continue;

      for (let x = 0; x < row.length; x += 1) {
        const tile = row[x];
        if (!tile || !resourceEligible(kind, tile)) continue;

        const quantity = kind === "wild_food" ? 3 : 4;
        const regrow = kind === "wild_food" ? RESOURCE_FOOD_REGROW_TICKS : null;
        addResource(kind, x, y, quantity, regrow);
        return;
      }
    }
  };

  ensureResource("wild_food");
  ensureResource("wood");
  ensureResource("stone");

  return resources;
}


const STOCKPILE_CAPACITY_PER_RESOURCE = 120;

function createStockpile(
  tiles: Tile[][],
  resources: ResourceNode[],
  width: number,
  height: number
): Stockpile {
  const centerX = Math.floor(width / 2);
  const centerY = Math.floor(height / 2);
  let selected: { x: number; y: number } | null = null;
  let bestDistance = Number.POSITIVE_INFINITY;

  // Row-major iteration plus strict improvement gives stable tie-breaking.
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const tile = tiles[y]?.[x];
      if (!tile?.walkable) continue;

      const containsResource = resources.some(
        (resource) =>
          resource.quantity > 0 && resource.x === x && resource.y === y
      );
      if (containsResource) continue;

      const candidateDistance = Math.abs(x - centerX) + Math.abs(y - centerY);
      if (candidateDistance < bestDistance) {
        selected = { x, y };
        bestDistance = candidateDistance;
      }
    }
  }

  if (!selected) {
    throw new RangeError("A communal stockpile requires a free walkable tile.");
  }

  return {
    id: "settlement-stockpile",
    x: selected.x,
    y: selected.y,
    inventory: { wood: 0, stone: 0 },
    capacityPerResource: STOCKPILE_CAPACITY_PER_RESOURCE
  };
}

export function createWorld(seed: number, options: WorldOptions = {}): WorldState {
  if (!Number.isSafeInteger(seed)) {
    throw new RangeError("World seed must be a safe integer.");
  }

  const width = options.width ?? DEFAULT_WIDTH;
  const height = options.height ?? DEFAULT_HEIGHT;

  if (!isValidDimension(width) || !isValidDimension(height)) {
    throw new RangeError(`World dimensions must be whole numbers between ${MIN_DIMENSION} and ${MAX_DIMENSION}.`);
  }

  const random = createRandom(seed);
  const tiles = createTerrain(width, height, seed);
  const resources = createResources(tiles, random);
  const stockpile = createStockpile(tiles, resources, width, height);

  return {
    seed,
    randomState: random.getState(),
    width,
    height,
    tiles,
    resources,
    stockpile,
    buildings: [],
    agents: [],
    tick: 0,
    events: []
  };
}


/** Return the closest walkable tile to a requested start point.
 * Ties are resolved in stable row-major order (top to bottom, left to right).
 */
export function findNearestWalkablePoint(
  world: WorldState,
  target: GridPoint
): GridPoint | null {
  if (!Number.isFinite(target.x) || !Number.isFinite(target.y)) return null;

  let nearest: GridPoint | null = null;
  let nearestDistance = Number.POSITIVE_INFINITY;

  for (let y = 0; y < world.height; y += 1) {
    for (let x = 0; x < world.width; x += 1) {
      if (!isWalkable(world, x, y)) continue;
      const distanceX = x - target.x;
      const distanceY = y - target.y;
      const distance = distanceX * distanceX + distanceY * distanceY;
      if (distance < nearestDistance) {
        nearest = { x, y };
        nearestDistance = distance;
      }
    }
  }

  return nearest;
}

export function getTile(world: WorldState, x: number, y: number): Tile | undefined {
  if (!Number.isInteger(x) || !Number.isInteger(y)) return undefined;
  if (x < 0 || y < 0 || x >= world.width || y >= world.height) return undefined;
  return world.tiles[y]?.[x];
}

export function isWalkable(world: WorldState, x: number, y: number): boolean {
  const tile = getTile(world, x, y);
  if (!tile?.walkable) return false;
  if (world.stockpile.x === x && world.stockpile.y === y) return false;
  return !world.buildings.some((building) => building.x === x && building.y === y);
}
