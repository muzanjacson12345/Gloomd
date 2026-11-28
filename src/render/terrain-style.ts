import type { Tile } from "../core/types";

export interface MapLegendItem {
  label: string;
  color: string;
}

export const TERRAIN_LEGEND_ITEMS: readonly MapLegendItem[] = [
  { label: "OCEAN", color: "#294650" },
  { label: "FRESHWATER", color: "#3a6871" },
  { label: "RIVER", color: "#477987" },
  { label: "COAST / BEACH", color: "#a79772" },
  { label: "GRASSLAND", color: "#697b57" },
  { label: "FOREST", color: "#385541" },
  { label: "HILLS", color: "#777854" },
  { label: "MOUNTAINS", color: "#858980" }
] as const;

export const MAP_SYMBOL_LEGEND_ITEMS: readonly (MapLegendItem & { shape: "dot" | "square" })[] = [
  { label: "WILD FOOD", color: "#c57d65", shape: "dot" },
  { label: "FISH", color: "#77aeb0", shape: "dot" },
  { label: "WOOD", color: "#b19770", shape: "dot" },
  { label: "STONE", color: "#a5aaa5", shape: "dot" },
  { label: "PEOPLE", color: "#e1c58b", shape: "dot" },
  { label: "BUILDINGS", color: "#b5a17a", shape: "square" },
  { label: "STOCKPILE", color: "#806342", shape: "square" }
] as const;

/** Stable coordinate noise for decoration; it never consumes simulation randomness. */
export function terrainVariation(x: number, y: number, salt = 0): number {
  let hash = Math.imul((x + salt) | 0, 0x45d9f3b);
  hash = Math.imul(hash ^ Math.imul((y - salt) | 0, 0x27d4eb2d), 0x45d9f3b);
  hash ^= hash >>> 16;
  hash = Math.imul(hash, 0x45d9f3b);
  hash ^= hash >>> 16;
  return (hash >>> 0) / 0xffff_ffff;
}

function clamp(value: number, minimum = 0, maximum = 1): number {
  return Math.max(minimum, Math.min(maximum, value));
}

function mixHex(from: string, to: string, amount: number): string {
  const ratio = clamp(amount);
  const fromValue = Number.parseInt(from.slice(1), 16);
  const toValue = Number.parseInt(to.slice(1), 16);
  const channels = [16, 8, 0].map((shift) => {
    const a = (fromValue >> shift) & 0xff;
    const b = (toValue >> shift) & 0xff;
    return Math.round(a + (b - a) * ratio).toString(16).padStart(2, "0");
  });
  return "#" + channels.join("");
}

function shade(hex: string, amount: number): string {
  return amount >= 0
    ? mixHex(hex, "#ffffff", amount)
    : mixHex(hex, "#000000", -amount);
}

/** The same base palette is used by the main map and the minimap. */
export function getTerrainBaseColour(tile: Tile, x: number, y: number): string {
  const moisture = clamp(tile.moisture);
  const elevation = clamp(tile.elevation);
  let base: string;

  switch (tile.terrain) {
    case "water":
      base = tile.waterKind === "ocean" ? "#294650" : "#3a6871";
      break;
    case "river":
      base = "#477987";
      break;
    case "beach":
      base = "#a79772";
      break;
    case "grassland":
      if (moisture < 0.32) {
        base = mixHex("#a08d60", "#858658", moisture / 0.32);
      } else if (moisture > 0.72) {
        base = mixHex("#617a55", "#47714e", (moisture - 0.72) / 0.28);
      } else {
        base = mixHex("#697b57", "#617650", (moisture - 0.32) / 0.4);
      }
      break;
    case "forest":
      base = mixHex("#304a37", "#527149", (moisture - 0.42) / 0.58);
      break;
    case "hill":
      base = mixHex("#747653", "#96916c", (elevation - 0.69) / 0.13);
      break;
    case "mountain":
      base = mixHex("#68736d", "#b4b9b0", (elevation - 0.82) / 0.18);
      break;
  }

  const variation = (terrainVariation(x, y, 17) - 0.5) * 0.075;
  return shade(base, variation);
}
