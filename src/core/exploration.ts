import { computeVisibleTiles } from "./vision";
import { isWalkableTile } from "./pathfinding";
import type { Agent, GridPoint, WorldState } from "./types";

export interface ExplorationRoute {
  point: GridPoint;
  path: GridPoint[];
}

interface KnownTileCache {
  source: number[];
  size: number;
  values: Set<number>;
}

const agentKnowledge = new WeakMap<Agent, KnownTileCache>();
const settlementKnowledge = new WeakMap<WorldState, KnownTileCache>();

function getKnownTiles<T extends Agent | WorldState>(
  owner: T,
  source: number[],
  cache: WeakMap<T, KnownTileCache>
): KnownTileCache {
  const existing = cache.get(owner);
  if (existing && existing.source === source && existing.size === source.length) return existing;
  const refreshed = { source, size: source.length, values: new Set(source) };
  cache.set(owner, refreshed);
  return refreshed;
}

export function hasExploredTile(agent: Agent, tileIndex: number, world?: WorldState): boolean {
  const personal = getKnownTiles(agent, agent.exploredTiles ?? (agent.exploredTiles = []), agentKnowledge);
  if (personal.values.has(tileIndex)) return true;
  if (!world) return false;
  const shared = getKnownTiles(world, world.exploredTiles ?? (world.exploredTiles = []), settlementKnowledge);
  return shared.values.has(tileIndex);
}

/** Add only tiles the inhabitant could actually see from its current location. */
export function recordAgentExploration(world: WorldState, agent: Agent): boolean {
  const originIndex = agent.y * world.width + agent.x;
  if (agent.explorationRecordIndex === originIndex) return false;

  const radius = Math.max(0, Math.floor(agent.sightRadius ?? 7));
  const visible = computeVisibleTiles(world, { x: agent.x, y: agent.y }, radius);
  const personalList = agent.exploredTiles ?? (agent.exploredTiles = []);
  const personal = getKnownTiles(agent, personalList, agentKnowledge);
  let discovered = false;
  for (const point of visible) {
    const index = point.y * world.width + point.x;
    if (!personal.values.has(index)) {
      personal.values.add(index);
      personalList.push(index);
      personal.size = personalList.length;
      discovered = true;
    }
  }
  agent.explorationRecordIndex = originIndex;
  if (discovered) agent.explorationComplete = false;
  return discovered;
}

/** Publish private field notes to the settlement map when the inhabitant returns home. */
export function publishAgentExploration(world: WorldState, agent: Agent): number {
  const personalList = agent.exploredTiles ?? (agent.exploredTiles = []);
  const settlementList = world.exploredTiles ?? (world.exploredTiles = []);
  const shared = getKnownTiles(world, settlementList, settlementKnowledge);
  const start = Math.min(personalList.length, Math.max(0, agent.explorationPublishedCount ?? 0));
  let published = 0;
  for (let index = start; index < personalList.length; index += 1) {
    const tileIndex = personalList[index];
    if (tileIndex === undefined || shared.values.has(tileIndex)) continue;
    shared.values.add(tileIndex);
    settlementList.push(tileIndex);
    shared.size = settlementList.length;
    published += 1;
  }
  agent.explorationPublishedCount = personalList.length;
  return published;
}

/** Find the closest walkable tile outside this agent's remembered line of sight. */
export function findNearestUnexploredRoute(
  world: WorldState,
  agent: Agent
): ExplorationRoute | null {
  if (agent.explorationComplete) return null;
  const startIndex = agent.y * world.width + agent.x;
  const total = world.width * world.height;
  const personal = getKnownTiles(agent, agent.exploredTiles ?? (agent.exploredTiles = []), agentKnowledge);
  const shared = getKnownTiles(world, world.exploredTiles ?? (world.exploredTiles = []), settlementKnowledge);
  const isKnown = (tileIndex: number): boolean =>
    personal.values.has(tileIndex) || shared.values.has(tileIndex);
  const parents = new Int32Array(total);
  parents.fill(-1);
  const visited = new Uint8Array(total);
  const queue = new Int32Array(total);
  let tail = 0;
  queue[tail++] = startIndex;
  visited[startIndex] = 1;

  const directions: readonly GridPoint[] = [
    { x: 1, y: 0 },
    { x: 0, y: 1 },
    { x: -1, y: 0 },
    { x: 0, y: -1 }
  ];

  for (let head = 0; head < tail; head += 1) {
    const current = queue[head]!;
    if (current !== startIndex && !isKnown(current)) {
      const reversed: GridPoint[] = [];
      let cursor = current;
      while (cursor !== startIndex) {
        reversed.push({
          x: cursor % world.width,
          y: Math.floor(cursor / world.width)
        });
        cursor = parents[cursor] ?? -1;
        if (cursor < 0) return null;
      }
      reversed.reverse();
      return {
        point: { x: current % world.width, y: Math.floor(current / world.width) },
        path: reversed
      };
    }

    const x = current % world.width;
    const y = Math.floor(current / world.width);
    for (const direction of directions) {
      const point = { x: x + direction.x, y: y + direction.y };
      if (!isWalkableTile(world, point)) continue;
      const next = point.y * world.width + point.x;
      if (visited[next] === 1) continue;
      visited[next] = 1;
      parents[next] = current;
      queue[tail++] = next;
    }
  }

  agent.explorationComplete = true;
  agent.explorationTarget = null;
  return null;
}

export type TileKnowledgeState = "unknown" | "personal" | "shared";

/** The settlement's public map, with private discoveries shown separately. */
export function getTileKnowledgeState(world: WorldState, tileIndex: number): TileKnowledgeState {
  if (getKnownTiles(world, world.exploredTiles ?? (world.exploredTiles = []), settlementKnowledge).values.has(tileIndex)) {
    return "shared";
  }
  for (const agent of world.agents) {
    if (!agent.alive) continue;
    if (getKnownTiles(agent, agent.exploredTiles ?? (agent.exploredTiles = []), agentKnowledge).values.has(tileIndex)) {
      return "personal";
    }
  }
  return "unknown";
}
