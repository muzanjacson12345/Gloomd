import { createRandom } from "./random";
import type { Agent, GridPoint, WorldState } from "./types";

const STARTER_NAMES = [
  "Ari", "Bo", "Cato", "Dara", "Eli", "Fara", "Galen", "Hana",
  "Ivo", "Jori", "Kemi", "Lio", "Mira", "Niko", "Ona", "Pax",
  "Quin", "Rhea", "Sami", "Tavi", "Uma", "Venn", "Wren", "Xara",
  "Yori", "Zuri"
] as const;

export function createStarterAgents(world: WorldState, count: number): Agent[] {
  if (!Number.isInteger(count) || count < 0) {
    throw new RangeError("Agent count must be a non-negative whole number.");
  }

  const available: GridPoint[] = [];
  for (let y = 0; y < world.height; y += 1) {
    for (let x = 0; x < world.width; x += 1) {
      if (world.tiles[y]?.[x]?.walkable) available.push({ x, y });
    }
  }

  if (count > available.length) {
    throw new RangeError("There are not enough walkable tiles for unique agent spawns.");
  }

  const random = createRandom(world.randomState);
  const agents: Agent[] = [];

  // Partial Fisher–Yates shuffle gives every agent a distinct walkable tile.
  for (let index = 0; index < count; index += 1) {
    const swapIndex = random.int(index, available.length - 1);
    const selected = available[swapIndex];
    const current = available[index];
    if (!selected || !current) continue;

    available[index] = selected;
    available[swapIndex] = current;

    const number = index + 1;
    const name = STARTER_NAMES[index % STARTER_NAMES.length];
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
      role: "forager",
      currentGoal: "explore",
      perceptionRadius: 12,
      alive: true
    });
  }

  world.randomState = random.getState();
  return agents;
}
