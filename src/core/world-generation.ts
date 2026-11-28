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
const MAX_WORLD_TILES = 65_536;
const DEFAULT_WATER_COVERAGE = 0.38;
const MIN_WATER_COVERAGE = 0.25;
const MAX_WATER_COVERAGE = 0.55;
// One wild-food unit returns every four simulated hours. Timber recovers
// much more slowly as a rough forest-regeneration model; stone remains finite.
export const RESOURCE_FOOD_REGROW_TICKS = 240;
export const RESOURCE_WOOD_REGROW_TICKS = 7_200;
export const RESOURCE_FISH_REGROW_TICKS = 720;

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
    case "fish":
      // Fish habitat depends on a neighbouring freshwater tile and is checked
      // with map context in createResources(), not by this tile-only helper.
      return false;
  }
}


function fade(value: number): number {
  return value * value * (3 - 2 * value);
}

function hashGrid(x: number, y: number, seed: number): number {
  let hash = Math.imul(x | 0, 0x1f123bb5) ^ Math.imul(y | 0, 0x5f356495) ^ (seed >>> 0);
  hash = Math.imul(hash ^ (hash >>> 16), 0x45d9f3b);
  hash = Math.imul(hash ^ (hash >>> 16), 0x45d9f3b);
  hash ^= hash >>> 16;
  return (hash >>> 0) / 0xffff_ffff;
}

function valueNoise(x: number, y: number, spacing: number, seed: number): number {
  const gridX = x / spacing;
  const gridY = y / spacing;
  const x0 = Math.floor(gridX);
  const y0 = Math.floor(gridY);
  const tx = fade(gridX - x0);
  const ty = fade(gridY - y0);
  const topLeft = hashGrid(x0, y0, seed);
  const topRight = hashGrid(x0 + 1, y0, seed);
  const bottomLeft = hashGrid(x0, y0 + 1, seed);
  const bottomRight = hashGrid(x0 + 1, y0 + 1, seed);
  const top = topLeft + (topRight - topLeft) * tx;
  const bottom = bottomLeft + (bottomRight - bottomLeft) * tx;
  return top + (bottom - top) * ty;
}

function fractalNoise(
  x: number,
  y: number,
  baseSpacing: number,
  seed: number
): number {
  let total = 0;
  let amplitude = 1;
  let amplitudeTotal = 0;
  for (let octave = 0; octave < 4; octave += 1) {
    const spacing = Math.max(2, baseSpacing / (2 ** octave));
    total += valueNoise(x, y, spacing, seed + octave * 0x9e3779b) * amplitude;
    amplitudeTotal += amplitude;
    amplitude *= 0.5;
  }
  return total / amplitudeTotal;
}

function addInlandLakes(
  width: number,
  height: number,
  elevation: Float32Array,
  seed: number,
  lakeMask: Uint8Array,
  lakeBuffer: Uint8Array
): void {
  const total = width * height;
  const minimumDimension = Math.min(width, height);
  const lakeCount = Math.max(1, Math.min(8, Math.round(total / 7_000)));
  const random = createRandom((seed ^ 0x68bc21eb) | 0);
  const centres: GridPoint[] = [];
  const margin = Math.max(7, Math.round(minimumDimension * 0.16));

  for (let lake = 0; lake < lakeCount; lake += 1) {
    let selected: GridPoint | null = null;
    let selectedElevation = Number.NEGATIVE_INFINITY;

    for (let attempt = 0; attempt < 64; attempt += 1) {
      const x = random.int(margin, width - margin - 1);
      const y = random.int(margin, height - margin - 1);
      if (centres.some((centre) => Math.hypot(centre.x - x, centre.y - y) < minimumDimension * 0.2)) {
        continue;
      }
      const value = elevation[y * width + x] ?? 0;
      if (value > selectedElevation) {
        selected = { x, y };
        selectedElevation = value;
      }
    }

    if (!selected) continue;
    centres.push(selected);

    const radiusX = random.int(
      2,
      Math.max(3, Math.round(width * 0.035))
    );
    const radiusY = random.int(
      2,
      Math.max(3, Math.round(height * 0.045))
    );

    for (let y = Math.max(1, selected.y - radiusY * 2); y <= Math.min(height - 2, selected.y + radiusY * 2); y += 1) {
      for (let x = Math.max(1, selected.x - radiusX * 2); x <= Math.min(width - 2, selected.x + radiusX * 2); x += 1) {
        const dx = (x - selected.x) / radiusX;
        const dy = (y - selected.y) / radiusY;
        const shapeNoise = valueNoise(x, y, Math.max(3, minimumDimension * 0.06), seed + lake * 0x45d9f3b);
        const noisyRadius = 1 + (shapeNoise - 0.5) * 0.38;
        const radius = dx * dx + dy * dy;

        if (radius <= noisyRadius * noisyRadius) {
          lakeMask[y * width + x] = 1;
        }
        if (radius <= 2.05) {
          lakeBuffer[y * width + x] = 1;
        }
      }
    }
  }
}

function classifyOcean(
  width: number,
  height: number,
  waterMask: Uint8Array
): Uint8Array {
  const total = width * height;
  const oceanMask = new Uint8Array(total);
  const queue = new Int32Array(total);
  let tail = 0;

  for (let x = 0; x < width; x += 1) {
    const top = x;
    const bottom = (height - 1) * width + x;
    if (waterMask[top] === 1 && oceanMask[top] === 0) {
      oceanMask[top] = 1;
      queue[tail++] = top;
    }
    if (waterMask[bottom] === 1 && oceanMask[bottom] === 0) {
      oceanMask[bottom] = 1;
      queue[tail++] = bottom;
    }
  }
  for (let y = 0; y < height; y += 1) {
    const left = y * width;
    const right = y * width + width - 1;
    if (waterMask[left] === 1 && oceanMask[left] === 0) {
      oceanMask[left] = 1;
      queue[tail++] = left;
    }
    if (waterMask[right] === 1 && oceanMask[right] === 0) {
      oceanMask[right] = 1;
      queue[tail++] = right;
    }
  }

  const directions: readonly GridPoint[] = [
    { x: 1, y: 0 }, { x: 0, y: 1 },
    { x: -1, y: 0 }, { x: 0, y: -1 }
  ];
  for (let head = 0; head < tail; head += 1) {
    const current = queue[head]!;
    const x = current % width;
    const y = Math.floor(current / width);
    for (const direction of directions) {
      const nextX = x + direction.x;
      const nextY = y + direction.y;
      if (nextX < 0 || nextX >= width || nextY < 0 || nextY >= height) continue;
      const next = nextY * width + nextX;
      if (waterMask[next] !== 1 || oceanMask[next] === 1) continue;
      oceanMask[next] = 1;
      queue[tail++] = next;
    }
  }

  return oceanMask;
}

function carveRivers(
  width: number,
  height: number,
  tiles: Tile[][],
  elevation: Float32Array,
  seed: number
): void {
  const total = width * height;
  const distanceToWater = new Int32Array(total);
  distanceToWater.fill(-1);
  const queue = new Int32Array(total);
  let tail = 0;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (tiles[y]?.[x]?.waterKind === "none") continue;
      const index = y * width + x;
      distanceToWater[index] = 0;
      queue[tail++] = index;
    }
  }

  const directions: readonly GridPoint[] = [
    { x: 1, y: 0 }, { x: 0, y: 1 },
    { x: -1, y: 0 }, { x: 0, y: -1 }
  ];

  for (let head = 0; head < tail; head += 1) {
    const current = queue[head]!;
    const x = current % width;
    const y = Math.floor(current / width);
    const currentDistance = distanceToWater[current] ?? 0;

    for (const direction of directions) {
      const nextX = x + direction.x;
      const nextY = y + direction.y;
      if (nextX < 0 || nextY < 0 || nextX >= width || nextY >= height) continue;
      const next = nextY * width + nextX;
      if (distanceToWater[next] !== -1) continue;
      distanceToWater[next] = currentDistance + 1;
      queue[tail++] = next;
    }
  }

  const minimumDimension = Math.min(width, height);
  const riverCount = Math.max(1, Math.min(4, Math.round(minimumDimension / 48)));
  const sourceCandidates: number[] = [];
  for (let index = 0; index < total; index += 1) {
    if (
      distanceToWater[index]! >= Math.max(8, Math.round(minimumDimension * 0.12)) &&
      (elevation[index] ?? 0) >= 0.58 &&
      tiles[Math.floor(index / width)]?.[index % width]?.waterKind === "none"
    ) {
      sourceCandidates.push(index);
    }
  }

  const random = createRandom((seed ^ 0x4f1bbcdc) | 0);
  const selectedSources: number[] = [];
  for (let river = 0; river < riverCount && sourceCandidates.length > 0; river += 1) {
    let bestPosition = -1;
    let bestScore = Number.NEGATIVE_INFINITY;
    for (let attempt = 0; attempt < 72; attempt += 1) {
      const candidatePosition = random.int(0, sourceCandidates.length - 1);
      const candidate = sourceCandidates[candidatePosition]!;
      const x = candidate % width;
      const y = Math.floor(candidate / width);
      if (selectedSources.some((source) => Math.hypot(source % width - x, Math.floor(source / width) - y) < minimumDimension * 0.18)) {
        continue;
      }
      const score = (elevation[candidate] ?? 0) + random.next() * 0.16;
      if (score > bestScore) {
        bestScore = score;
        bestPosition = candidatePosition;
      }
    }
    if (bestPosition < 0) break;

    const source = sourceCandidates.splice(bestPosition, 1)[0]!;
    selectedSources.push(source);
    let current = source;

    for (let step = 0; step < Math.max(width, height) * 2; step += 1) {
      const x = current % width;
      const y = Math.floor(current / width);
      const tile = tiles[y]?.[x];
      if (!tile || distanceToWater[current] === 0) break;

      tile.terrain = "river";
      tile.waterKind = "freshwater";
      tile.walkable = false;

      const nextCandidates = directions
        .map((direction) => ({ x: x + direction.x, y: y + direction.y }))
        .filter((point) =>
          point.x >= 0 &&
          point.y >= 0 &&
          point.x < width &&
          point.y < height
        )
        .map((point) => {
          const index = point.y * width + point.x;
          return { index, distance: distanceToWater[index]!, elevation: elevation[index] ?? 1 };
        })
        .filter((candidate) => candidate.distance >= 0 && candidate.distance < distanceToWater[current]!);

      if (nextCandidates.length === 0) break;
      nextCandidates.sort((left, right) =>
        left.distance - right.distance ||
        left.elevation - right.elevation ||
        left.index - right.index
      );
      current = nextCandidates[0]!.index;
    }
  }
}

function createTerrain(
  width: number,
  height: number,
  seed: number,
  waterCoverage: number
): Tile[][] {
  const total = width * height;
  const minimumDimension = Math.min(width, height);
  const elevation = new Float32Array(total);
  const moisture = new Float32Array(total);
  const elevationSeed = (seed ^ 0x1b873593) | 0;
  const moistureSeed = (seed ^ 0x5bd1e995) | 0;
  const lakeMask = new Uint8Array(total);
  const lakeBuffer = new Uint8Array(total);

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const edgeDistance = Math.min(x, y, width - 1 - x, height - 1 - y);
      const interiorLift = fade(clamp(edgeDistance / (minimumDimension * 0.18))) * 0.18;
      const continent = valueNoise(x, y, minimumDimension * 0.58, elevationSeed);
      const detail = fractalNoise(x, y, minimumDimension * 0.34, elevationSeed + 0x2c1b3c6d);
      const ridge = 1 - Math.abs(valueNoise(x + 31, y - 17, minimumDimension * 0.16, elevationSeed + 0x6d2b79f5) * 2 - 1);
      const index = y * width + x;
      elevation[index] = clamp(continent * 0.52 + detail * 0.36 + ridge * 0.12 + interiorLift);
      moisture[index] = fractalNoise(x + 73, y - 29, minimumDimension * 0.42, moistureSeed);
    }
  }

  addInlandLakes(width, height, elevation, seed, lakeMask, lakeBuffer);
  const lakeCells = lakeMask.reduce((count, value) => count + value, 0);
  const oceanBudget = Math.max(1, Math.floor(total * waterCoverage) - lakeCells);
  const candidates: number[] = [];
  for (let index = 0; index < total; index += 1) {
    if (lakeMask[index] === 1 || lakeBuffer[index] === 1) continue;
    candidates.push(index);
  }
  candidates.sort((left, right) =>
    (elevation[left] ?? 0) - (elevation[right] ?? 0) || left - right
  );

  const waterMask = new Uint8Array(total);
  for (let index = 0; index < lakeMask.length; index += 1) {
    if (lakeMask[index] === 1) waterMask[index] = 1;
  }
  for (let index = 0; index < Math.min(oceanBudget, candidates.length); index += 1) {
    waterMask[candidates[index]!] = 1;
  }

  const oceanMask = classifyOcean(width, height, waterMask);
  const tiles: Tile[][] = Array.from({ length: height }, (_, y) =>
    Array.from({ length: width }, (_, x): Tile => {
      const index = y * width + x;
      const water = waterMask[index] === 1;
      const ocean = oceanMask[index] === 1;
      const elevationValue = elevation[index] ?? 0.5;
      const moistureValue = moisture[index] ?? 0.5;
      let waterKind: WaterKind = "none";
      let terrain: Tile["terrain"] = "grassland";
      let walkable = true;

      if (water) {
        waterKind = ocean ? "ocean" : "freshwater";
        terrain = "water";
        walkable = false;
      } else if (elevationValue >= 0.82) {
        terrain = "mountain";
      } else if (elevationValue >= 0.69) {
        terrain = "hill";
      } else if (moistureValue >= 0.57) {
        terrain = "forest";
      }

      return { terrain, elevation: elevationValue, moisture: moistureValue, waterKind, walkable };
    })
  );

  carveRivers(width, height, tiles, elevation, seed);

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const tile = tiles[y]?.[x];
      if (!tile || !tile.walkable || tile.terrain !== "grassland") continue;
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
        addResource("wood", x, y, random.int(3, 7), RESOURCE_WOOD_REGROW_TICKS);
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

      const freshwaterBank = [
        tiles[y - 1]?.[x],
        tiles[y + 1]?.[x],
        tiles[y]?.[x - 1],
        tiles[y]?.[x + 1]
      ].some((neighbor) => neighbor?.waterKind === "freshwater");
      if (freshwaterBank && random.next() < 0.075) {
        addResource("fish", x, y, random.int(3, 6), RESOURCE_FISH_REGROW_TICKS);
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
        if (!tile) continue;

        if (kind === "fish") {
          const freshwaterBank = [
            tiles[y - 1]?.[x],
            tiles[y + 1]?.[x],
            tiles[y]?.[x - 1],
            tiles[y]?.[x + 1]
          ].some((neighbor) => neighbor?.waterKind === "freshwater");
          if (!tile.walkable || !freshwaterBank) continue;
        } else if (!resourceEligible(kind, tile)) {
          continue;
        }

        const quantity = kind === "wild_food" ? 3 : kind === "fish" ? 4 : 4;
        const regrow = kind === "wild_food"
          ? RESOURCE_FOOD_REGROW_TICKS
          : kind === "wood"
            ? RESOURCE_WOOD_REGROW_TICKS
            : kind === "fish"
              ? RESOURCE_FISH_REGROW_TICKS
              : null;
        addResource(kind, x, y, quantity, regrow);
        return;
      }
    }
  };

  ensureResource("wild_food");
  ensureResource("fish");
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
  const resourceTiles = new Set(
    resources.filter(resource => resource.quantity > 0).map(resource => resource.y * width + resource.x)
  );
  let selected: GridPoint | null = null;
  let bestDistance = Number.POSITIVE_INFINITY;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (!tiles[y]?.[x]?.walkable || resourceTiles.has(y * width + x)) continue;
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
    inventory: { wood: 0, stone: 0, food: 0, fish: 0 },
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
  if (width * height > MAX_WORLD_TILES) {
    throw new RangeError(`World exceeds the 65,536 tile budget. Choose a smaller map size.`);
  }

  const waterCoverage = options.waterCoverage ?? DEFAULT_WATER_COVERAGE;
  if (!Number.isFinite(waterCoverage) || waterCoverage < MIN_WATER_COVERAGE || waterCoverage > MAX_WATER_COVERAGE) {
    throw new RangeError("Water coverage must be between 0.25 and 0.55.");
  }

  const random = createRandom(seed);
  const tiles = createTerrain(width, height, seed, waterCoverage);
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
    events: [],
    farmPlots: [],
    farmSeedBank: 6,
    exploredTiles: []
  };
}



/** Move the shared stockpile to a clear tile near the chosen settlement centre. */
export function relocateStockpileNear(world: WorldState, target: GridPoint): GridPoint {
  if (!Number.isFinite(target.x) || !Number.isFinite(target.y)) {
    throw new RangeError("Stockpile target must be a finite grid point.");
  }
  const resourceTiles = new Set(
    world.resources.filter(resource => resource.quantity > 0)
      .map(resource => resource.y * world.width + resource.x)
  );
  let selected: GridPoint | null = null;
  let bestDistance = Number.POSITIVE_INFINITY;

  for (let y = 0; y < world.height; y += 1) {
    for (let x = 0; x < world.width; x += 1) {
      const index = y * world.width + x;
      if (!world.tiles[y]?.[x]?.walkable || resourceTiles.has(index)) continue;
      if (x === Math.round(target.x) && y === Math.round(target.y)) continue;
      const distance = Math.abs(x - target.x) + Math.abs(y - target.y);
      if (distance < bestDistance) {
        selected = { x, y };
        bestDistance = distance;
      }
    }
  }

  if (!selected) {
    throw new RangeError("No free land is available near the selected settlement start.");
  }
  world.stockpile.x = selected.x;
  world.stockpile.y = selected.y;
  return selected;
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
