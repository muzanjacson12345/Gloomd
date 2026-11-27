import { createRandom } from "./random";
import { takeResource } from "./resources";
import { findPath } from "./pathfinding";
import type { Agent, GridPoint, ResourceNode, WorldEvent, WorldState } from "./types";

const NEED_THRESHOLD = 65;
const FOOD_RESTORE = 35;
const WATER_RESTORE = 45;
const RESTORE_ENERGY = 20;
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

function nearestFood(world: WorldState, agent: Agent): Target | null {
  let best: Target | null = null;

  for (const resource of world.resources) {
    if (resource.kind !== "wild_food" || resource.quantity <= 0) continue;
    const target = { x: resource.x, y: resource.y };
    if (distance(agent, target) > agent.perceptionRadius) continue;

    const path = findPath(world, agent, target);
    if (path === null) continue;

    if (
      !best ||
      path.length < best.path.length ||
      (path.length === best.path.length && resource.id.localeCompare(best.resource?.id ?? "") < 0)
    ) {
      best = { point: target, path, resource };
    }
  }

  return best;
}

function nearestFreshwaterBank(world: WorldState, agent: Agent): Target | null {
  let best: Target | null = null;
  const offsets: readonly GridPoint[] = [
    { x: 1, y: 0 },
    { x: 0, y: 1 },
    { x: -1, y: 0 },
    { x: 0, y: -1 }
  ];

  for (let y = 0; y < world.height; y += 1) {
    for (let x = 0; x < world.width; x += 1) {
      if (world.tiles[y]?.[x]?.waterKind !== "freshwater") continue;

      const water = { x, y };
      if (distance(agent, water) > agent.perceptionRadius) continue;

      for (const offset of offsets) {
        const bank = { x: x + offset.x, y: y + offset.y };
        if (!world.tiles[bank.y]?.[bank.x]?.walkable) continue;

        const path = findPath(world, agent, bank);
        if (path === null) continue;

        if (!best || path.length < best.path.length) {
          best = { point: bank, path };
        }
      }
    }
  }

  return best;
}

function moveToward(world: WorldState, agent: Agent, target: Target): boolean {
  const next = target.path[0];
  if (!next) return true;

  if (!world.tiles[next.y]?.[next.x]?.walkable) return false;
  agent.x = next.x;
  agent.y = next.y;
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
    .filter((point) => world.tiles[point.y]?.[point.x]?.walkable);

  if (candidates.length === 0) return;
  const selected = candidates[random.int(0, candidates.length - 1)];
  if (!selected) return;

  agent.x = selected.x;
  agent.y = selected.y;
  agent.needs.energy = Math.max(0, agent.needs.energy - 0.5);
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

  if (agent.needs.thirst >= NEED_THRESHOLD) {
    agent.currentGoal = "seek_water";
    const target = nearestFreshwaterBank(world, agent);

    if (!target) {
      agent.currentGoal = "explore";
      explore(world, agent, random);
      return;
    }

    if (moveToward(world, agent, target)) {
      agent.currentGoal = "drink";
      agent.needs.thirst = Math.max(0, agent.needs.thirst - WATER_RESTORE);
      emit(world, emitted, agent, "drink", `${agent.name} drank from a freshwater source.`);
    }
    return;
  }

  if (agent.needs.hunger >= NEED_THRESHOLD && agent.inventory.food > 0) {
    agent.currentGoal = "eat";
    agent.inventory.food -= 1;
    agent.needs.hunger = Math.max(0, agent.needs.hunger - FOOD_RESTORE);
    emit(world, emitted, agent, "eat", `${agent.name} ate gathered food.`);
    return;
  }

  if (agent.needs.hunger >= NEED_THRESHOLD) {
    agent.currentGoal = "seek_food";
    const target = nearestFood(world, agent);

    if (!target || !target.resource) {
      agent.currentGoal = "explore";
      explore(world, agent, random);
      return;
    }

    if (moveToward(world, agent, target)) {
      const gathered = takeResource(world, target.resource.id, 1);
      if (gathered > 0) {
        agent.inventory.food += gathered;
        agent.currentGoal = "gather";
        emit(
          world,
          emitted,
          agent,
          "gather_food",
          `${agent.name} gathered ${gathered} wild food.`
        );
      } else {
        agent.currentGoal = "explore";
      }
    }
    return;
  }

  if (agent.needs.energy <= 20) {
    agent.currentGoal = "rest";
    const before = agent.needs.energy;
    agent.needs.energy = Math.min(100, agent.needs.energy + RESTORE_ENERGY);
    if (agent.needs.energy > before) {
      emit(world, emitted, agent, "rest", `${agent.name} rested and recovered energy.`);
    }
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
        resource.regrowEveryTicks !== null &&
        resource.regrowEveryTicks > 0 &&
        world.tick % resource.regrowEveryTicks === 0 &&
        resource.quantity < resource.maxQuantity
      ) {
        resource.quantity += 1;
      }
    }

    for (const agent of world.agents) {
      stepAgent(world, agent, random, emitted);
    }
  }

  world.randomState = random.getState();
  return emitted;
}
