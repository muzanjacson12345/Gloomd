import { createRandom } from "./random";
import { takeResource } from "./resources";
import { depositToStockpile, withdrawMaterialBundle } from "./stockpile";
import { findPath, isWalkableTile } from "./pathfinding";
import type {
  Agent,
  Building,
  GridPoint,
  ResourceKind,
  ResourceNode,
  WorldEvent,
  WorldState
} from "./types";

const NEED_THRESHOLD = 65;
const CRITICAL_HUNGER_THRESHOLD = 90;
const CRITICAL_THIRST_THRESHOLD = 90;
const STARVATION_GRACE_TICKS = 30;
const DEHYDRATION_GRACE_TICKS = 20;
const STARVATION_DAMAGE_PER_TICK = 1;
const DEHYDRATION_DAMAGE_PER_TICK = 1.5;
const FOOD_RESTORE = 35;
const WATER_RESTORE = 45;
const RESTORE_ENERGY = 20;
const SHELTER_MATERIALS = { wood: 5, stone: 2 } as const;
const SHELTER_WORK_TICKS = 12;
const HAULER_LOAD_CAPACITY = 3;
const MAX_STORED_EVENTS = 120;

interface Target {
  point: GridPoint;
  path: GridPoint[];
  resource?: ResourceNode;
}

function distance(a: GridPoint, b: GridPoint): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

function emit(
  world: WorldState,
  emitted: WorldEvent[],
  agent: Agent | null,
  kind: string,
  message: string
): void {
  const event: WorldEvent = {
    id: `event-${world.tick}-${agent?.id ?? "world"}-${kind}-${emitted.length}`,
    tick: world.tick,
    agentId: agent?.id ?? null,
    kind,
    message
  };

  world.events.push(event);
  emitted.push(event);
  if (world.events.length > MAX_STORED_EVENTS) {
    world.events.splice(0, world.events.length - MAX_STORED_EVENTS);
  }
}

function recoverHealth(agent: Agent): void {
  if (
    agent.alive &&
    agent.needs.health > 0 &&
    agent.needs.hunger < 55 &&
    agent.needs.thirst < 55 &&
    agent.needs.energy > 35
  ) {
    // Recovery is intentionally gradual: surviving a shortage is possible,
    // but a damaged inhabitant needs sustained food, water and rest to heal.
    agent.needs.health = Math.min(100, agent.needs.health + 0.25);
  }
}

function updateCriticalNeedTimers(agent: Agent): void {
  // A carried meal is a genuine reserve; it prevents starvation damage until
  // the agent can consume it. Thirst still requires reaching freshwater.
  agent.starvationTicks =
    agent.needs.hunger >= CRITICAL_HUNGER_THRESHOLD &&
      agent.inventory.food <= 0 && agent.inventory.fish <= 0
      ? (agent.starvationTicks ?? 0) + 1
      : 0;
  agent.dehydrationTicks =
    agent.needs.thirst >= CRITICAL_THIRST_THRESHOLD
      ? (agent.dehydrationTicks ?? 0) + 1
      : 0;
}

function dropInventoryAtDeath(world: WorldState, agent: Agent): void {
  const drops: readonly { kind: ResourceKind; quantity: number }[] = [
    { kind: "wild_food", quantity: agent.inventory.food },
    { kind: "fish", quantity: agent.inventory.fish },
    { kind: "wood", quantity: agent.inventory.wood },
    { kind: "stone", quantity: agent.inventory.stone }
  ];

  for (const drop of drops) {
    if (drop.quantity <= 0) continue;
    world.resources.push({
      id: `dropped-${agent.id}-${drop.kind}-${world.tick}`,
      kind: drop.kind,
      x: agent.x,
      y: agent.y,
      quantity: drop.quantity,
      maxQuantity: drop.quantity,
      regrowEveryTicks: null
    });
  }

  agent.inventory.food = 0;
  agent.inventory.fish = 0;
  agent.inventory.wood = 0;
  agent.inventory.stone = 0;
}

function applySurvivalDamage(
  world: WorldState,
  agent: Agent,
  emitted: WorldEvent[]
): boolean {
  let cause: "starvation" | "dehydration" | null = null;

  if (
    agent.needs.hunger < CRITICAL_HUNGER_THRESHOLD ||
    agent.inventory.food > 0 ||
    agent.inventory.fish > 0
  ) {
    agent.starvationTicks = 0;
  }
  if (agent.needs.thirst < CRITICAL_THIRST_THRESHOLD) {
    agent.dehydrationTicks = 0;
  }

  if ((agent.starvationTicks ?? 0) > STARVATION_GRACE_TICKS) {
    agent.needs.health = Math.max(0, agent.needs.health - STARVATION_DAMAGE_PER_TICK);
    cause = "starvation";
  }

  if ((agent.dehydrationTicks ?? 0) > DEHYDRATION_GRACE_TICKS) {
    agent.needs.health = Math.max(0, agent.needs.health - DEHYDRATION_DAMAGE_PER_TICK);
    cause = "dehydration";
  }

  if (agent.needs.health > 0 || cause === null) return false;

  agent.alive = false;
  agent.needs.health = 0;
  agent.destination = null;
  agent.plannedPath = [];
  dropInventoryAtDeath(world, agent);
  emit(
    world,
    emitted,
    agent,
    `death_${cause}`,
    `${agent.name} died from ${cause} after prolonged deprivation.`
  );
  return true;
}

function nearestResource(
  world: WorldState,
  agent: Agent,
  kind: ResourceKind
): Target | null {
  let best: Target | null = null;

  for (const resource of world.resources) {
    if (resource.kind !== kind || resource.quantity <= 0) continue;

    const point = { x: resource.x, y: resource.y };
    if (distance(agent, point) > agent.perceptionRadius) continue;

    const path = findPath(world, agent, point);
    if (path === null) continue;

    if (
      !best ||
      path.length < best.path.length ||
      (path.length === best.path.length &&
        resource.id.localeCompare(best.resource?.id ?? "") < 0)
    ) {
      best = { point, path, resource };
    }
  }

  return best;
}

function nearestFood(world: WorldState, agent: Agent): Target | null {
  return nearestResource(world, agent, "wild_food");
}

function nearestFish(world: WorldState, agent: Agent): Target | null {
  return nearestResource(world, agent, "fish");
}

/**
 * Finds the shortest walkable route to a tile beside freshwater.
 * The search is local to the agent's perception radius and visits each
 * reachable tile at most once. Buildings block movement just like terrain.
 */
export function findNearestFreshwaterBank(
  world: WorldState,
  start: GridPoint,
  perceptionRadius: number
): GridPoint[] | null {
  if (
    !Number.isFinite(perceptionRadius) ||
    perceptionRadius < 0 ||
    !isWalkableTile(world, start)
  ) {
    return null;
  }

  const startIndex = start.y * world.width + start.x;
  const queue: number[] = [startIndex];
  const parents = new Map<number, number | null>([[startIndex, null]]);
  const directions: readonly GridPoint[] = [
    { x: 1, y: 0 },
    { x: 0, y: 1 },
    { x: -1, y: 0 },
    { x: 0, y: -1 }
  ];

  for (let head = 0; head < queue.length; head += 1) {
    const currentIndex = queue[head];
    if (currentIndex === undefined) continue;

    const x = currentIndex % world.width;
    const y = Math.floor(currentIndex / world.width);

    // A water tile is a target, never a node that the agent can enter.
    for (const direction of directions) {
      const waterX = x + direction.x;
      const waterY = y + direction.y;
      const waterDistance =
        Math.abs(waterX - start.x) + Math.abs(waterY - start.y);

      if (
        waterDistance <= perceptionRadius &&
        world.tiles[waterY]?.[waterX]?.waterKind === "freshwater"
      ) {
        const path: GridPoint[] = [];
        let cursor = currentIndex;

        while (cursor !== startIndex) {
          path.push({
            x: cursor % world.width,
            y: Math.floor(cursor / world.width)
          });
          const parent = parents.get(cursor);
          if (parent === undefined || parent === null) return null;
          cursor = parent;
        }

        path.reverse();
        return path;
      }
    }

    for (const direction of directions) {
      const point = { x: x + direction.x, y: y + direction.y };
      if (
        distance(point, start) > perceptionRadius ||
        !isWalkableTile(world, point)
      ) {
        continue;
      }

      const nextIndex = point.y * world.width + point.x;
      if (parents.has(nextIndex)) continue;

      parents.set(nextIndex, currentIndex);
      queue.push(nextIndex);
    }
  }

  return null;
}

function nearestFreshwaterBank(world: WorldState, agent: Agent): Target | null {
  const path = findNearestFreshwaterBank(world, agent, agent.perceptionRadius);
  if (path === null) return null;

  return {
    point: path.at(-1) ?? { x: agent.x, y: agent.y },
    path
  };
}

function moveToward(world: WorldState, agent: Agent, target: Target): boolean {
  agent.destination = { ...target.point };
  agent.plannedPath = target.path.map((point) => ({ ...point }));
  const next = target.path[0];
  if (!next) return true;

  if (!isWalkableTile(world, next)) {
    agent.plannedPath = [];
    agent.destination = null;
    return false;
  }
  agent.x = next.x;
  agent.y = next.y;
  agent.plannedPath = target.path.slice(1).map((point) => ({ ...point }));
  agent.needs.energy = Math.max(0, agent.needs.energy - 0.5);
  return false;
}

function explore(world: WorldState, agent: Agent, random: ReturnType<typeof createRandom>): void {
  const directions: readonly GridPoint[] = [
    { x: 1, y: 0 },
    { x: 0, y: 1 },
    { x: -1, y: 0 },
    { x: 0, y: -1 }
  ];

  const candidates = directions
    .map((direction) => ({ x: agent.x + direction.x, y: agent.y + direction.y }))
    .filter((point) => isWalkableTile(world, point));

  if (candidates.length === 0) return;
  const selected = candidates[random.int(0, candidates.length - 1)];
  if (!selected) return;

  agent.x = selected.x;
  agent.y = selected.y;
  agent.destination = null;
  agent.plannedPath = [];
  agent.needs.energy = Math.max(0, agent.needs.energy - 0.5);
}

function committedMaterialCount(world: WorldState, kind: "wood" | "stone"): number {
  return world.stockpile.inventory[kind] + world.agents.reduce(
    (total, agent) => total + (agent.alive ? agent.inventory[kind] : 0),
    0
  );
}

/** Maintain the 5 wood : 2 stone shelter recipe across stored and carried materials. */
function materialNeededBySettlement(world: WorldState): "wood" | "stone" | null {
  const wood = committedMaterialCount(world, "wood");
  const stone = committedMaterialCount(world, "stone");
  const capacity = world.stockpile.capacityPerResource;

  if (wood >= capacity && stone >= capacity) return null;
  if (wood >= SHELTER_MATERIALS.wood && stone >= SHELTER_MATERIALS.stone) return null;
  if (wood >= capacity) return "stone";
  if (stone >= capacity) return "wood";
  if (wood >= SHELTER_MATERIALS.wood) return "stone";
  if (stone >= SHELTER_MATERIALS.stone) return "wood";
  return wood * 2 <= stone * 5 ? "wood" : "stone";
}

function gatherHaulerMaterial(
  world: WorldState,
  agent: Agent,
  kind: "wood" | "stone",
  random: ReturnType<typeof createRandom>,
  emitted: WorldEvent[]
): void {
  const target = nearestResource(world, agent, kind);
  if (!target?.resource) {
    agent.currentGoal = "search_resources";
    explore(world, agent, random);
    return;
  }

  agent.currentGoal = kind === "wood" ? "gather_wood" : "gather_stone";
  if (!moveToward(world, agent, target)) return;

  const committed = committedMaterialCount(world, kind);
  const recipeTarget = kind === "wood" ? SHELTER_MATERIALS.wood : SHELTER_MATERIALS.stone;
  const remainingForRecipe = Math.max(0, recipeTarget - committed);
  const availableCapacity = Math.max(0, world.stockpile.capacityPerResource - committed);
  const loadAmount = Math.min(HAULER_LOAD_CAPACITY, remainingForRecipe, availableCapacity);
  const gathered = takeResource(world, target.resource.id, loadAmount);
  if (gathered <= 0) {
    agent.currentGoal = "explore";
    return;
  }

  agent.inventory[kind] += gathered;
  emit(
    world,
    emitted,
    agent,
    kind === "wood" ? "gather_wood" : "gather_stone",
    `${agent.name} gathered ${gathered} ${kind} for the settlement.`
  );
  if (target.resource.quantity === 0) {
    const resourceLabel = kind === "wood" ? "forest timber" : "stone";
    emit(
      world,
      emitted,
      null,
      "resource_depleted",
      `A nearby ${resourceLabel} patch has been exhausted.`
    );
  }
}

function nearestStockpileAccess(world: WorldState, agent: Agent): Target | null {
  const store = world.stockpile;
  // Fixed order gives stable tie-breaking for adjacent delivery tiles.
  const accessTiles: readonly GridPoint[] = [
    { x: store.x + 1, y: store.y },
    { x: store.x, y: store.y + 1 },
    { x: store.x - 1, y: store.y },
    { x: store.x, y: store.y - 1 }
  ];
  let best: Target | null = null;

  for (const point of accessTiles) {
    if (!isWalkableTile(world, point)) continue;
    const path = findPath(world, agent, point);
    if (path === null) continue;
    if (!best || path.length < best.path.length) {
      best = { point, path };
    }
  }

  return best;
}

function deliverCarriedMaterials(
  world: WorldState,
  agent: Agent,
  random: ReturnType<typeof createRandom>,
  emitted: WorldEvent[]
): void {
  if (agent.inventory.wood <= 0 && agent.inventory.stone <= 0) return;

  const target = nearestStockpileAccess(world, agent);
  if (!target) {
    agent.currentGoal = "explore";
    explore(world, agent, random);
    return;
  }

  agent.currentGoal = "deliver_resources";
  if (!moveToward(world, agent, target)) return;

  const wood = depositToStockpile(world, "wood", agent.inventory.wood);
  const stone = depositToStockpile(world, "stone", agent.inventory.stone);
  agent.inventory.wood -= wood;
  agent.inventory.stone -= stone;

  if (wood > 0 || stone > 0) {
    const details = [
      ...(wood > 0 ? [`${wood} wood`] : []),
      ...(stone > 0 ? [`${stone} stone`] : [])
    ].join(" and ");
    emit(
      world,
      emitted,
      agent,
      "deliver_resources",
      `${agent.name} delivered ${details} to the communal stockpile.`
    );
  }
}

function findShelterSite(world: WorldState, agent: Agent): GridPoint | null {
  // Stable ordering makes the same world state produce the same building site.
  const candidates: readonly GridPoint[] = [
    { x: agent.x + 1, y: agent.y },
    { x: agent.x, y: agent.y + 1 },
    { x: agent.x - 1, y: agent.y },
    { x: agent.x, y: agent.y - 1 }
  ];

  for (const point of candidates) {
    if (!isWalkableTile(world, point)) continue;

    const hasLiveResource = world.resources.some(
      (resource) =>
        resource.quantity > 0 && resource.x === point.x && resource.y === point.y
    );
    if (hasLiveResource) continue;

    const hasLivingAgent = world.agents.some(
      (other) =>
        other.alive && other.x === point.x && other.y === point.y
    );
    if (hasLivingAgent) continue;

    return point;
  }

  return null;
}

function hasShelterMaterials(world: WorldState): boolean {
  return (
    world.stockpile.inventory.wood >= SHELTER_MATERIALS.wood &&
    world.stockpile.inventory.stone >= SHELTER_MATERIALS.stone
  );
}

function startShelter(
  world: WorldState,
  agent: Agent,
  emitted: WorldEvent[]
): boolean {
  if (agent.homeId !== null || agent.buildingId !== null) {
    return false;
  }

  const point = findShelterSite(world, agent);
  if (!point || !withdrawMaterialBundle(world, SHELTER_MATERIALS)) return false;

  const building: Building = {
    id: `shelter-${agent.id}`,
    kind: "shelter",
    x: point.x,
    y: point.y,
    status: "under_construction",
    workDone: 0,
    workRequired: SHELTER_WORK_TICKS,
    builderId: agent.id
  };

  // The shared material bundle is withdrawn atomically after a safe site is found.
  agent.buildingId = building.id;
  agent.currentGoal = "build_shelter";
  world.buildings.push(building);

  emit(
    world,
    emitted,
    agent,
    "shelter_started",
    `${agent.name} started building a shelter.`
  );
  return true;
}

function nearestShelterWorkTarget(
  world: WorldState,
  agent: Agent,
  building: Building
): Target | null {
  if (distance(agent, building) === 1 && isWalkableTile(world, agent)) {
    return { point: { x: agent.x, y: agent.y }, path: [] };
  }

  const positions: readonly GridPoint[] = [
    { x: building.x + 1, y: building.y },
    { x: building.x, y: building.y + 1 },
    { x: building.x - 1, y: building.y },
    { x: building.x, y: building.y - 1 }
  ];
  let best: Target | null = null;

  for (const point of positions) {
    if (!isWalkableTile(world, point)) continue;
    const path = findPath(world, agent, point);
    if (path === null) continue;
    if (!best || path.length < best.path.length) {
      best = { point, path };
    }
  }

  return best;
}

function workOnShelter(
  world: WorldState,
  agent: Agent,
  building: Building,
  random: ReturnType<typeof createRandom>,
  emitted: WorldEvent[]
): void {
  const target = nearestShelterWorkTarget(world, agent, building);
  if (!target) {
    agent.currentGoal = "explore";
    explore(world, agent, random);
    return;
  }

  agent.currentGoal = "build_shelter";
  if (!moveToward(world, agent, target)) return;

  building.workDone = Math.min(building.workRequired, building.workDone + 1);
  agent.needs.energy = Math.max(0, agent.needs.energy - 1);

  if (building.workDone >= building.workRequired) {
    building.status = "complete";
    agent.homeId = building.id;
    agent.buildingId = null;
    emit(
      world,
      emitted,
      agent,
      "shelter_complete",
      `${agent.name} finished a shelter and made it home.`
    );
  }
}

function stepAgent(
  world: WorldState,
  agent: Agent,
  random: ReturnType<typeof createRandom>,
  emitted: WorldEvent[]
): void {
  if (!agent.alive) return;

  agent.needs.hunger = Math.min(100, agent.needs.hunger + 1);
  agent.needs.thirst = Math.min(100, agent.needs.thirst + 1);
  updateCriticalNeedTimers(agent);
  recoverHealth(agent);

  // Survival always outranks resource work and construction. Deprivation
  // damages health only after a grace period and only when no usable reserve
  // can resolve the immediate need.
  if (agent.needs.thirst >= NEED_THRESHOLD) {
    agent.currentGoal = "seek_water";
    const target = nearestFreshwaterBank(world, agent);

    if (!target) {
      if (applySurvivalDamage(world, agent, emitted)) return;
      agent.currentGoal = "explore";
      explore(world, agent, random);
      return;
    }

    if (moveToward(world, agent, target)) {
      agent.currentGoal = "drink";
      agent.destination = { x: agent.x, y: agent.y };
      agent.plannedPath = [];
      agent.needs.thirst = Math.max(0, agent.needs.thirst - WATER_RESTORE);
      agent.dehydrationTicks = 0;
      emit(world, emitted, agent, "drink", `${agent.name} drank from a freshwater source.`);
    }
    if (applySurvivalDamage(world, agent, emitted)) return;
    return;
  }

  if (agent.needs.hunger >= NEED_THRESHOLD &&
      (agent.inventory.food > 0 || agent.inventory.fish > 0)) {
    agent.currentGoal = "eat";
    agent.destination = null;
    agent.plannedPath = [];
    if (agent.inventory.food > 0) {
      agent.inventory.food -= 1;
      emit(world, emitted, agent, "eat", `${agent.name} ate gathered food.`);
    } else {
      agent.inventory.fish -= 1;
      emit(world, emitted, agent, "eat_fish", `${agent.name} ate a fish.`);
    }
    agent.needs.hunger = Math.max(0, agent.needs.hunger - FOOD_RESTORE);
    agent.starvationTicks = 0;
    return;
  }

  if (agent.needs.hunger >= NEED_THRESHOLD) {
    const fishTarget = agent.role === "fisher" ? nearestFish(world, agent) : null;
    const target = fishTarget ?? nearestFood(world, agent);
    agent.currentGoal = target?.resource?.kind === "fish" ? "seek_fish" : "seek_food";

    if (!target?.resource) {
      if (applySurvivalDamage(world, agent, emitted)) return;
      agent.currentGoal = "explore";
      explore(world, agent, random);
      return;
    }

    if (moveToward(world, agent, target)) {
      const gathered = takeResource(world, target.resource.id, 1);
      if (gathered > 0) {
        const caughtFish = target.resource.kind === "fish";
        if (caughtFish) {
          agent.inventory.fish += gathered;
          agent.currentGoal = "fish";
          emit(
            world,
            emitted,
            agent,
            "fish",
            `${agent.name} caught ${gathered} fish at the freshwater bank.`
          );
        } else {
          agent.inventory.food += gathered;
          agent.currentGoal = "gather";
          emit(
            world,
            emitted,
            agent,
            "gather_food",
            `${agent.name} gathered ${gathered} wild food.`
          );
        }
        agent.destination = { x: agent.x, y: agent.y };
        agent.plannedPath = [];
        if (target.resource.quantity === 0) {
          const label = caughtFish ? "local fish" : "wild-food";
          emit(
            world,
            emitted,
            null,
            "resource_depleted",
            `A ${label} patch has been exhausted and must recover before it can be harvested again.`
          );
        }
      } else {
        agent.currentGoal = "explore";
      }
    }
    if (applySurvivalDamage(world, agent, emitted)) return;
    return;
  }

  if (agent.needs.energy <= 20) {
    agent.currentGoal = "rest";
    agent.destination = null;
    agent.plannedPath = [];
    const before = agent.needs.energy;
    agent.needs.energy = Math.min(100, agent.needs.energy + RESTORE_ENERGY);
    if (agent.needs.energy > before) {
      emit(world, emitted, agent, "rest", `${agent.name} rested and recovered energy.`);
    }
    return;
  }

  // Any carried building material must be delivered before another resource job.
  if (agent.inventory.wood > 0 || agent.inventory.stone > 0) {
    deliverCarriedMaterials(world, agent, random, emitted);
    return;
  }

  if (agent.role === "builder") {
    const currentProject = world.buildings.find(
      (building) => building.id === agent.buildingId
    );

    if (currentProject?.status === "under_construction") {
      workOnShelter(world, agent, currentProject, random, emitted);
      return;
    }

    if (currentProject?.status === "complete") {
      agent.homeId = currentProject.id;
      agent.buildingId = null;
    } else if (agent.buildingId !== null) {
      agent.buildingId = null;
    }

    if (agent.homeId === null) {
      if (!hasShelterMaterials(world)) {
        agent.currentGoal = "wait_for_materials";
        explore(world, agent, random);
      } else if (!startShelter(world, agent, emitted)) {
        agent.currentGoal = "find_build_site";
        explore(world, agent, random);
      }
      return;
    }
  }

  if (agent.role === "hauler") {
    const material = materialNeededBySettlement(world);
    if (!material) {
      agent.currentGoal = "explore";
      explore(world, agent, random);
      return;
    }

    gatherHaulerMaterial(world, agent, material, random, emitted);
    return;
  }

  agent.currentGoal = "explore";
  explore(world, agent, random);
}

export function stepWorld(world: WorldState, ticks = 1): WorldEvent[] {
  if (!Number.isInteger(ticks) || ticks < 0) {
    throw new RangeError("Simulation steps must be a non-negative whole number.");
  }

  const emitted: WorldEvent[] = [];
  const random = createRandom(world.randomState);

  for (let index = 0; index < ticks; index += 1) {
    world.tick += 1;

    for (const resource of world.resources) {
      if (
        resource.regrowEveryTicks === null ||
        resource.regrowEveryTicks <= 0 ||
        resource.quantity >= resource.maxQuantity
      ) {
        continue;
      }

      // Older saves and depleted test fixtures without a scheduled recovery
      // start a fresh interval; a patch never regrows immediately on load.
      if (resource.nextRegrowTick === undefined || resource.nextRegrowTick === null) {
        resource.nextRegrowTick = world.tick + resource.regrowEveryTicks;
        continue;
      }

      if (world.tick >= resource.nextRegrowTick) {
        const wasEmpty = resource.quantity === 0;
        resource.quantity = Math.min(resource.maxQuantity, resource.quantity + 1);
        resource.nextRegrowTick = resource.quantity < resource.maxQuantity
          ? world.tick + resource.regrowEveryTicks
          : null;
        if (wasEmpty && resource.quantity > 0) {
          const resourceLabel = resource.kind === "wild_food"
            ? "wild food"
            : resource.kind === "wood"
              ? "forest timber"
              : "stone";
          emit(
            world,
            emitted,
            null,
            "resource_regrown",
            `A ${resourceLabel} patch has begun to recover.`
          );
        }
      }
    }

    for (const agent of world.agents) {
      stepAgent(world, agent, random, emitted);
    }
  }

  world.randomState = random.getState();
  return emitted;
}
