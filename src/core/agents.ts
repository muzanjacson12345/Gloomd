import { createRandom } from "./random";
import { isWalkableTile } from "./pathfinding";
import type { Agent, GridPoint, WorldState } from "./types";

export interface AgentSpawnOptions {
  center?: GridPoint;
}

const STARTER_NAMES = [
  "Ari", "Bo", "Cato", "Dara", "Eli", "Fara", "Galen", "Hana",
  "Ivo", "Jori", "Kemi", "Lio", "Mira", "Niko", "Ona", "Pax",
  "Quin", "Rhea", "Sami", "Tavi", "Uma", "Venn", "Wren", "Xara",
  "Yori", "Zuri"
] as const;

export function createStarterAgents(
  world: WorldState,
  count: number,
  options: AgentSpawnOptions = {}
): Agent[] {
  if (!Number.isInteger(count) || count < 0) {
    throw new RangeError("Agent count must be a non-negative whole number.");
  }

  const available: GridPoint[] = [];
  for (let y = 0; y < world.height; y += 1) {
    for (let x = 0; x < world.width; x += 1) {
      if (isWalkableTile(world, { x, y })) available.push({ x, y });
    }
  }

  if (count > available.length) {
    throw new RangeError("There are not enough walkable tiles for unique agent spawns.");
  }

  // When a centre is supplied, choose from a deterministic local pool first.
  // Expanding that pool to four times the population prevents tiny spawn rings
  // from over-concentrating the settlement while keeping everyone nearby.
  let spawnCandidates = available;
  if (options.center) {
    const { center } = options;
    spawnCandidates = [...available]
      .sort((left, right) => {
        const leftDistance =
          (left.x - center.x) ** 2 + (left.y - center.y) ** 2;
        const rightDistance =
          (right.x - center.x) ** 2 + (right.y - center.y) ** 2;
        return leftDistance - rightDistance || left.y - right.y || left.x - right.x;
      })
      .slice(0, Math.min(available.length, count * 4));
  }

  const random = createRandom(world.randomState);
  const agents: Agent[] = [];

  // Partial Fisher–Yates shuffle gives every agent a distinct walkable tile.
  for (let index = 0; index < count; index += 1) {
    const swapIndex = random.int(index, spawnCandidates.length - 1);
    const selected = spawnCandidates[swapIndex];
    const current = spawnCandidates[index];
    if (!selected || !current) continue;

    spawnCandidates[index] = selected;
    spawnCandidates[swapIndex] = current;

    const number = index + 1;
    const name = STARTER_NAMES[index % STARTER_NAMES.length] ?? "Ari";
    const role = number % 5 === 0 ? "builder" : number % 5 === 2 ? "hauler" : "forager";
    agents.push({
      id: `agent-${number}`,
      name: number > STARTER_NAMES.length ? `${name} ${number}` : name,
      ageYears: random.int(18, 68),
      x: selected.x,
      y: selected.y,
      traits: {
        curiosity: random.next(),
        diligence: random.next(),
        sociability: random.next()
      },
      needs: { hunger: 20, thirst: 20, energy: 100, health: 100 },
      inventory: { food: 0, wood: 0, stone: 0 },
      role,
      currentGoal: "explore",
      perceptionRadius: role === "hauler" ? 24 : 12,
      alive: true,
      homeId: null,
      buildingId: null
    });
  }

  world.randomState = random.getState();
  return agents;
}
