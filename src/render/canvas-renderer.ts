import type { Agent, AgentGoal, Building, FarmPlot, GridPoint, ResourceKind, ResourceNode, Stockpile, Tile, WorldState } from "../core/types";
import { getCappedPixelRatio, getVisibleWorldBounds } from "./geometry";
import type { WorldBounds } from "./geometry";
import type { Camera, ViewportSize } from "./camera";
import { computeVisibleTiles } from "../core/vision";
import type { WorldSelectionRect } from "../ui/selection";
import type { AgentMotionAnimator } from "./motion";
import { getTerrainBaseColour, terrainVariation } from "./terrain-style";

export interface RenderLayers {
  terrain?: boolean;
  resources?: boolean;
  agents?: boolean;
  buildings?: boolean;
  stockpile?: boolean;
  resourceDensity?: boolean;
  activities?: boolean;
  startingPoint?: GridPoint;
  selectedAgentId?: string | null;
  selectedAgentIds?: readonly string[];
  motion?: AgentMotionAnimator;
  showRoutes?: boolean;
  showTrails?: boolean;
  showVision?: boolean;
  showTargets?: boolean;
  selectionRect?: WorldSelectionRect | null;
}

function clampBounds(bounds: WorldBounds, world: WorldState): WorldBounds {
  return {
    left: Math.max(0, bounds.left - 1),
    top: Math.max(0, bounds.top - 1),
    right: Math.min(world.width, bounds.right + 1),
    bottom: Math.min(world.height, bounds.bottom + 1)
  };
}

function isInsideBounds(x: number, y: number, bounds: WorldBounds): boolean {
  return x >= bounds.left && x < bounds.right && y >= bounds.top && y < bounds.bottom;
}

function drawForestTree(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  variation: number,
  scale: number
): void {
  const centreX = x + 0.5 + (variation - 0.5) * 0.12;
  const centreY = y + 0.48 + (terrainVariation(x, y, 23) - 0.5) * 0.1;
  const canopy = Math.max(0.58, Math.min(1, scale));

  context.save();
  context.fillStyle = "#1b3025";
  context.beginPath();
  context.ellipse(centreX + 0.04, y + 0.84, 0.31 * canopy, 0.11, 0, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = "#8d7854";
  context.fillRect(centreX - 0.045, centreY + 0.13, 0.09, 0.26);

  if (variation < 0.58) {
    context.fillStyle = "#294533";
    context.beginPath();
    context.arc(centreX, centreY - 0.06, 0.31 * canopy, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = "#416849";
    context.beginPath();
    context.arc(centreX - 0.1, centreY - 0.13, 0.19 * canopy, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = "#5a7950";
    context.beginPath();
    context.arc(centreX + 0.11, centreY - 0.04, 0.15 * canopy, 0, Math.PI * 2);
    context.fill();
  } else {
    context.fillStyle = "#243f31";
    context.beginPath();
    context.moveTo(centreX, y + 0.13);
    context.lineTo(centreX - 0.34 * canopy, y + 0.79);
    context.lineTo(centreX + 0.34 * canopy, y + 0.79);
    context.closePath();
    context.fill();
    context.fillStyle = "#3d6143";
    context.beginPath();
    context.moveTo(centreX, y + 0.29);
    context.lineTo(centreX - 0.25 * canopy, y + 0.69);
    context.lineTo(centreX + 0.25 * canopy, y + 0.69);
    context.closePath();
    context.fill();
  }
  context.restore();
}

function drawForestTile(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  stock: number | undefined
): void {
  if (stock === 0) {
    context.fillStyle = "#665641";
    context.fillRect(x + 0.17, y + 0.73, 0.66, 0.13);
    context.fillStyle = "#927b56";
    context.fillRect(x + 0.37, y + 0.57, 0.26, 0.2);
    context.fillStyle = "#c1a77a";
    context.fillRect(x + 0.4, y + 0.55, 0.18, 0.05);
    return;
  }

  if (stock !== undefined && stock <= 2) {
    context.fillStyle = "#4d754e";
    context.beginPath();
    context.moveTo(x + 0.5, y + 0.42);
    context.lineTo(x + 0.27, y + 0.82);
    context.lineTo(x + 0.73, y + 0.82);
    context.closePath();
    context.fill();
    context.fillStyle = "#9a8b62";
    context.fillRect(x + 0.46, y + 0.73, 0.08, 0.15);
    return;
  }

  const variation = terrainVariation(x, y, 5);
  const canopyScale = stock === undefined ? 1 : Math.min(1, 0.58 + stock * 0.07);
  drawForestTree(context, x, y, variation, canopyScale);
}

function drawGrassTexture(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  tile: Tile
): void {
  const variation = terrainVariation(x, y, 9);
  if (variation > 0.72) return;

  context.save();
  context.globalAlpha = 0.2 + Math.min(0.14, tile.moisture * 0.12);
  context.strokeStyle = tile.moisture < 0.32 ? "#d5c18a" : "#b4c18b";
  context.lineWidth = 0.035;
  context.beginPath();
  const startX = x + 0.18 + terrainVariation(x, y, 11) * 0.52;
  const startY = y + 0.34 + terrainVariation(x, y, 13) * 0.38;
  context.moveTo(startX, startY + 0.08);
  context.lineTo(startX - 0.035, startY - 0.05);
  context.moveTo(startX, startY + 0.08);
  context.lineTo(startX + 0.055, startY - 0.04);
  context.stroke();
  context.restore();
}

function drawBeachTexture(
  context: CanvasRenderingContext2D,
  x: number,
  y: number
): void {
  if (terrainVariation(x, y, 31) > 0.68) return;
  context.save();
  context.globalAlpha = 0.34;
  context.fillStyle = "#e0d0a5";
  context.beginPath();
  context.arc(x + 0.24 + terrainVariation(x, y, 33) * 0.46, y + 0.28 + terrainVariation(x, y, 35) * 0.48, 0.035, 0, Math.PI * 2);
  context.arc(x + 0.67, y + 0.72, 0.025, 0, Math.PI * 2);
  context.fill();
  context.restore();
}

function drawHillContours(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  elevation: number
): void {
  context.save();
  context.globalAlpha = 0.26;
  context.strokeStyle = "#d0c59a";
  context.lineWidth = 0.035;
  context.beginPath();
  context.moveTo(x + 0.08, y + 0.7);
  context.lineTo(x + 0.27, y + 0.55);
  context.lineTo(x + 0.72, y + 0.55);
  context.lineTo(x + 0.92, y + 0.7);
  if (elevation > 0.74) {
    context.moveTo(x + 0.17, y + 0.83);
    context.lineTo(x + 0.36, y + 0.7);
    context.lineTo(x + 0.66, y + 0.7);
    context.lineTo(x + 0.84, y + 0.83);
  }
  context.stroke();
  context.restore();
}

function drawMountainPeak(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  elevation: number
): void {
  const peakX = x + 0.48 + (terrainVariation(x, y, 41) - 0.5) * 0.12;
  const peakY = y + 0.12 + (1 - elevation) * 0.35;
  context.fillStyle = "#505b56";
  context.beginPath();
  context.moveTo(peakX - 0.38, y + 0.84);
  context.lineTo(peakX, peakY);
  context.lineTo(peakX + 0.39, y + 0.84);
  context.closePath();
  context.fill();
  context.fillStyle = "#9fa69e";
  context.beginPath();
  context.moveTo(peakX - 0.18, y + 0.56);
  context.lineTo(peakX, peakY);
  context.lineTo(peakX + 0.2, y + 0.58);
  context.lineTo(peakX + 0.06, y + 0.55);
  context.closePath();
  context.fill();

  if (elevation > 0.9) {
    context.fillStyle = "#d8ddd3";
    context.beginPath();
    context.moveTo(peakX - 0.1, peakY + 0.17);
    context.lineTo(peakX, peakY);
    context.lineTo(peakX + 0.12, peakY + 0.18);
    context.lineTo(peakX + 0.035, peakY + 0.13);
    context.closePath();
    context.fill();
  }
}

function drawShoreline(
  context: CanvasRenderingContext2D,
  world: WorldState,
  x: number,
  y: number,
  zoom: number
): void {
  if (zoom < 11.5) return;
  const edges = [
    { neighbor: world.tiles[y - 1]?.[x], x1: x, y1: y, x2: x + 1, y2: y },
    { neighbor: world.tiles[y]?.[x + 1], x1: x + 1, y1: y, x2: x + 1, y2: y + 1 },
    { neighbor: world.tiles[y + 1]?.[x], x1: x, y1: y + 1, x2: x + 1, y2: y + 1 },
    { neighbor: world.tiles[y]?.[x - 1], x1: x, y1: y, x2: x, y2: y + 1 }
  ];
  if (!edges.some((edge) => edge.neighbor?.waterKind === "none")) return;

  context.save();
  context.globalAlpha = 0.42;
  context.strokeStyle = "#b5cbbb";
  context.lineWidth = 0.065;
  for (const edge of edges) {
    if (edge.neighbor?.waterKind !== "none") continue;
    context.beginPath();
    context.moveTo(edge.x1, edge.y1);
    context.lineTo(edge.x2, edge.y2);
    context.stroke();
  }
  context.restore();
}

function drawWaterTexture(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  tile: Tile,
  zoom: number
): void {
  if (zoom < 11.5 || terrainVariation(x, y, 53) > 0.62) return;
  const offset = terrainVariation(x, y, 59) * 0.48;
  context.save();
  context.globalAlpha = tile.waterKind === "ocean" ? 0.18 : 0.24;
  context.strokeStyle = "#b1d1c8";
  context.lineWidth = 0.035;
  context.beginPath();
  context.moveTo(x + 0.16 + offset, y + 0.32);
  context.lineTo(x + 0.46 + offset, y + 0.32);
  context.moveTo(x + 0.25, y + 0.7 - offset * 0.25);
  context.lineTo(x + 0.56, y + 0.7 - offset * 0.25);
  context.stroke();
  context.restore();
}

function drawTerrain(
  context: CanvasRenderingContext2D,
  world: WorldState,
  bounds: WorldBounds,
  zoom: number,
  woodQuantities: ReadonlyMap<string, number>
): void {
  for (let y = bounds.top; y < bounds.bottom; y += 1) {
    const row = world.tiles[y];
    if (!row) continue;

    for (let x = bounds.left; x < bounds.right; x += 1) {
      const tile = row[x];
      if (!tile) continue;

      context.fillStyle = getTerrainBaseColour(tile, x, y);
      context.fillRect(x, y, 1.01, 1.01);

      if (tile.waterKind !== "none") {
        drawShoreline(context, world, x, y, zoom);
        drawWaterTexture(context, x, y, tile, zoom);
      } else if (zoom >= 11.5) {
        switch (tile.terrain) {
          case "grassland":
            drawGrassTexture(context, x, y, tile);
            break;
          case "beach":
            drawBeachTexture(context, x, y);
            break;
          case "forest":
            if (zoom >= 11.5) drawForestTile(context, x, y, woodQuantities.get(`${x}:${y}`));
            break;
          case "hill":
            drawHillContours(context, x, y, tile.elevation);
            break;
          case "mountain":
            if (zoom >= 11.5) drawMountainPeak(context, x, y, tile.elevation);
            break;
          case "water":
          case "river":
            break;
        }
      }
    }
  }
}

function drawFood(context: CanvasRenderingContext2D, x: number, y: number): void {
  context.fillStyle = "#c57d65";
  for (const [dx, dy] of [[0.32, 0.48], [0.58, 0.4], [0.52, 0.66]] as const) {
    context.beginPath();
    context.arc(x + dx, y + dy, 0.11, 0, Math.PI * 2);
    context.fill();
  }
  context.strokeStyle = "#9b8b5d";
  context.lineWidth = 0.055;
  context.beginPath();
  context.moveTo(x + 0.48, y + 0.4);
  context.lineTo(x + 0.56, y + 0.25);
  context.stroke();
}

function drawFish(context: CanvasRenderingContext2D, x: number, y: number): void {
  context.save();
  context.fillStyle = "#77aeb0";
  context.beginPath();
  context.ellipse(x + 0.48, y + 0.5, 0.25, 0.13, -0.12, 0, Math.PI * 2);
  context.fill();
  context.beginPath();
  context.moveTo(x + 0.25, y + 0.5);
  context.lineTo(x + 0.08, y + 0.34);
  context.lineTo(x + 0.08, y + 0.66);
  context.closePath();
  context.fill();
  context.fillStyle = "#d9e1c8";
  context.beginPath();
  context.arc(x + 0.61, y + 0.46, 0.025, 0, Math.PI * 2);
  context.fill();
  context.restore();
}

function drawWood(context: CanvasRenderingContext2D, x: number, y: number): void {
  context.strokeStyle = "#b19770";
  context.lineWidth = 0.12;
  context.lineCap = "round";
  context.beginPath();
  context.moveTo(x + 0.24, y + 0.68);
  context.lineTo(x + 0.72, y + 0.3);
  context.moveTo(x + 0.42, y + 0.53);
  context.lineTo(x + 0.36, y + 0.31);
  context.moveTo(x + 0.57, y + 0.42);
  context.lineTo(x + 0.78, y + 0.5);
  context.stroke();
}

function drawStone(context: CanvasRenderingContext2D, x: number, y: number): void {
  context.fillStyle = "#a5aaa5";
  context.beginPath();
  context.moveTo(x + 0.2, y + 0.68);
  context.lineTo(x + 0.3, y + 0.38);
  context.lineTo(x + 0.62, y + 0.28);
  context.lineTo(x + 0.82, y + 0.58);
  context.lineTo(x + 0.68, y + 0.78);
  context.closePath();
  context.fill();
  context.strokeStyle = "#d0d3ca";
  context.lineWidth = 0.05;
  context.stroke();
}

function drawResources(
  context: CanvasRenderingContext2D,
  resources: readonly ResourceNode[],
  bounds: WorldBounds,
  zoom: number
): void {
  if (zoom < 4) return;

  for (const resource of resources) {
    if (resource.quantity <= 0 || !isInsideBounds(resource.x, resource.y, bounds)) continue;

    switch (resource.kind) {
      case "wild_food":
        drawFood(context, resource.x, resource.y);
        break;
      case "fish":
        drawFish(context, resource.x, resource.y);
        break;
      case "wood":
        drawWood(context, resource.x, resource.y);
        break;
      case "stone":
        drawStone(context, resource.x, resource.y);
        break;
    }
  }
}


const RESOURCE_DENSITY_COLOURS: Record<ResourceKind, string> = {
  wild_food: "#c9856c",
  fish: "#73aeb0",
  wood: "#91ad78",
  stone: "#afb4b0"
};

/** Shows the remaining stock at real resource nodes; it does not invent influence zones. */
function drawResourceDensity(
  context: CanvasRenderingContext2D,
  resources: readonly ResourceNode[],
  bounds: WorldBounds,
  zoom: number
): void {
  if (zoom < 2) return;

  const cells = new Map<string, {
    x: number;
    y: number;
    quantity: number;
    capacity: number;
    byKind: Map<ResourceKind, number>;
  }>();

  for (const resource of resources) {
    if (resource.quantity <= 0 || !isInsideBounds(resource.x, resource.y, bounds)) continue;
    const key = `${resource.x}:${resource.y}`;
    const cell = cells.get(key) ?? {
      x: resource.x,
      y: resource.y,
      quantity: 0,
      capacity: 0,
      byKind: new Map<ResourceKind, number>()
    };
    cell.quantity += resource.quantity;
    cell.capacity += Math.max(resource.quantity, resource.maxQuantity);
    cell.byKind.set(resource.kind, (cell.byKind.get(resource.kind) ?? 0) + resource.quantity);
    cells.set(key, cell);
  }

  for (const cell of cells.values()) {
    if (cell.capacity <= 0) continue;
    let dominantKind: ResourceKind = "wild_food";
    let dominantQuantity = -1;
    for (const [kind, quantity] of cell.byKind) {
      if (quantity > dominantQuantity) {
        dominantKind = kind;
        dominantQuantity = quantity;
      }
    }
    const remainingRatio = Math.max(0, Math.min(1, cell.quantity / cell.capacity));
    context.save();
    context.globalAlpha = 0.06 + remainingRatio * 0.27;
    context.fillStyle = RESOURCE_DENSITY_COLOURS[dominantKind];
    context.fillRect(cell.x + 0.04, cell.y + 0.04, 0.92, 0.92);
    context.restore();
  }
}


function drawFarmPlots(
  context: CanvasRenderingContext2D,
  farmPlots: readonly FarmPlot[],
  bounds: WorldBounds,
  zoom: number
): void {
  if (zoom < 2) return;
  for (const plot of farmPlots) {
    if (!isInsideBounds(plot.x, plot.y, bounds)) continue;
    const x = plot.x, y = plot.y;
    if (zoom < 4) {
      context.fillStyle = plot.stage === "ready" ? "#c5a45f" : plot.stage === "growing" ? "#77966b" : "#806d50";
      context.globalAlpha = 0.85;
      context.fillRect(x + 0.22, y + 0.22, 0.56, 0.56);
      context.globalAlpha = 1;
      continue;
    }
    context.save();
    context.fillStyle = "#766344";
    context.fillRect(x + 0.08, y + 0.12, 0.84, 0.76);
    context.strokeStyle = "#a48a5e";
    context.lineWidth = 0.055;
    for (let row = 0; row < 3; row += 1) {
      const lineY = y + 0.29 + row * 0.22;
      context.beginPath();
      context.moveTo(x + 0.15, lineY);
      context.lineTo(x + 0.85, lineY);
      context.stroke();
    }
    if (plot.stage !== "prepared") {
      const ready = plot.stage === "ready";
      context.strokeStyle = ready ? "#d6b65f" : "#83a76f";
      context.fillStyle = ready ? "#d8bd70" : "#789c68";
      context.lineWidth = 0.065;
      for (let row = 0; row < 3; row += 1) {
        for (let column = 0; column < 3; column += 1) {
          const stemX = x + 0.25 + column * 0.25;
          const stemY = y + 0.24 + row * 0.22;
          context.beginPath();
          context.moveTo(stemX, stemY + 0.1);
          context.lineTo(stemX - 0.035, stemY - (ready ? 0.13 : 0.07));
          context.moveTo(stemX, stemY + 0.04);
          context.lineTo(stemX + 0.06, stemY - 0.015);
          context.stroke();
          if (ready) {
            context.beginPath();
            context.arc(stemX - 0.035, stemY - 0.13, 0.045, 0, Math.PI * 2);
            context.fill();
          }
        }
      }
    }
    context.restore();
  }
}

function drawBuildings(
  context: CanvasRenderingContext2D,
  buildings: readonly Building[],
  bounds: WorldBounds,
  zoom: number
): void {
  for (const building of buildings) {
    if (!isInsideBounds(building.x, building.y, bounds)) continue;

    const x = building.x;
    const y = building.y;
    const complete = building.status === "complete";

    if (zoom < 4) {
      context.fillStyle = complete ? "#d2c092" : "#b58c6d";
      context.fillRect(x + 0.25, y + 0.25, 0.5, 0.5);
      if (!complete) {
        context.strokeStyle = "#e2c99b";
        context.lineWidth = 0.07;
        context.strokeRect(x + 0.18, y + 0.18, 0.64, 0.64);
      }
      continue;
    }

    // Low-detail walls and roof keep buildings cheap to draw at close zoom.
    context.fillStyle = "#18231c";
    context.fillRect(x + 0.17, y + 0.48, 0.66, 0.39);

    context.fillStyle = complete ? "#b5a17a" : "#8d907a";
    context.fillRect(x + 0.25, y + 0.46, 0.5, 0.38);

    context.fillStyle = complete ? "#465649" : "#96775e";
    context.beginPath();
    context.moveTo(x + 0.17, y + 0.49);
    context.lineTo(x + 0.5, y + 0.18);
    context.lineTo(x + 0.83, y + 0.49);
    context.closePath();
    context.fill();

    if (complete) {
      context.fillStyle = "#594b39";
      context.fillRect(x + 0.44, y + 0.63, 0.12, 0.21);
      context.fillStyle = "#d8c79d";
      context.fillRect(x + 0.29, y + 0.55, 0.09, 0.09);
    } else {
      context.strokeStyle = "#d9c39b";
      context.lineWidth = 0.045;
      context.beginPath();
      context.moveTo(x + 0.22, y + 0.39);
      context.lineTo(x + 0.22, y + 0.88);
      context.moveTo(x + 0.78, y + 0.39);
      context.lineTo(x + 0.78, y + 0.88);
      context.moveTo(x + 0.22, y + 0.55);
      context.lineTo(x + 0.78, y + 0.55);
      context.stroke();
    }
  }
}


function drawStockpile(
  context: CanvasRenderingContext2D,
  stockpile: Stockpile,
  bounds: WorldBounds,
  zoom: number
): void {
  if (!isInsideBounds(stockpile.x, stockpile.y, bounds)) return;

  const x = stockpile.x;
  const y = stockpile.y;

  if (zoom < 4) {
    context.fillStyle = "#a98a5d";
    context.fillRect(x + 0.24, y + 0.24, 0.52, 0.52);
    context.fillStyle = "#382f22";
    context.fillRect(x + 0.32, y + 0.32, 0.36, 0.36);
    if (stockpile.inventory.food > 0) {
      context.fillStyle = "#c9856c";
      context.fillRect(x + 0.25, y + 0.26, 0.12, 0.12);
    }
    if (stockpile.inventory.fish > 0) {
      context.fillStyle = "#73aeb0";
      context.fillRect(x + 0.63, y + 0.26, 0.12, 0.12);
    }
    return;
  }

  // A few simple crates make the store recognizable without sprite assets.
  context.fillStyle = "#171f19";
  context.fillRect(x + 0.12, y + 0.72, 0.76, 0.14);

  context.fillStyle = "#806342";
  context.fillRect(x + 0.18, y + 0.42, 0.28, 0.34);
  context.fillRect(x + 0.51, y + 0.34, 0.3, 0.42);

  context.fillStyle = "#b89a68";
  context.fillRect(x + 0.22, y + 0.46, 0.2, 0.08);
  context.fillRect(x + 0.55, y + 0.38, 0.22, 0.08);

  context.strokeStyle = "#3b3022";
  context.lineWidth = 0.045;
  context.strokeRect(x + 0.18, y + 0.42, 0.28, 0.34);
  context.strokeRect(x + 0.51, y + 0.34, 0.3, 0.42);
  context.beginPath();
  context.moveTo(x + 0.32, y + 0.42);
  context.lineTo(x + 0.32, y + 0.76);
  context.moveTo(x + 0.51, y + 0.55);
  context.lineTo(x + 0.81, y + 0.55);
  context.stroke();

  // Small coloured sacks show actual communal food stores without adding labels.
  if (stockpile.inventory.food > 0) {
    context.fillStyle = "#c9856c";
    context.fillRect(x + 0.22, y + 0.20, 0.18, 0.14);
    context.strokeStyle = "#3b3022";
    context.strokeRect(x + 0.22, y + 0.20, 0.18, 0.14);
  }
  if (stockpile.inventory.fish > 0) {
    context.fillStyle = "#73aeb0";
    context.fillRect(x + 0.60, y + 0.18, 0.18, 0.14);
    context.strokeStyle = "#3b3022";
    context.strokeRect(x + 0.60, y + 0.18, 0.18, 0.14);
  }
}

function drawAgentSprite(
  context: CanvasRenderingContext2D,
  position: GridPoint,
  selected: boolean,
  moving: boolean,
  walkPhase: number,
  facing: GridPoint,
  cargoColour: string | null
): void {
  const bob = moving ? Math.abs(walkPhase) * 0.025 : 0;
  const legSwing = moving ? walkPhase * 0.09 : 0;
  // The sprite's local forward direction is north. Rotate the whole figure so
  // the visible facing follows its actual last/active grid movement.
  const angle = Math.atan2(facing.x, -facing.y);
  const x = -0.5;
  const y = -0.5;

  context.save();
  context.translate(position.x + 0.5, position.y + 0.5);
  context.rotate(angle);

  context.fillStyle = "#111b16a8";
  context.beginPath();
  context.ellipse(0, 0.33, 0.26, 0.09, 0, 0, Math.PI * 2);
  context.fill();

  if (selected) {
    context.strokeStyle = "#e5d5a3";
    context.lineWidth = 0.075;
    context.beginPath();
    context.arc(0, -0.02, 0.48, 0, Math.PI * 2);
    context.stroke();
  }

  if (cargoColour) {
    // A small pack sits behind the body and remains readable at close zoom.
    context.fillStyle = "#292b22";
    context.fillRect(x + 0.65, y + 0.43 - bob, 0.16, 0.17);
    context.fillStyle = cargoColour;
    context.fillRect(x + 0.67, y + 0.45 - bob, 0.12, 0.13);
  }

  context.strokeStyle = "#252f28";
  context.lineWidth = 0.09;
  context.lineCap = "round";
  context.beginPath();
  context.moveTo(x + 0.44, y + 0.63 - bob);
  context.lineTo(x + 0.38 - legSwing, y + 0.82);
  context.moveTo(x + 0.56, y + 0.63 - bob);
  context.lineTo(x + 0.62 + legSwing, y + 0.82);
  context.stroke();

  context.fillStyle = "#d0b88b";
  context.beginPath();
  context.ellipse(x + 0.5, y + 0.53 - bob, 0.19, 0.24, 0, 0, Math.PI * 2);
  context.fill();

  context.fillStyle = "#c68f68";
  context.beginPath();
  context.arc(x + 0.5, y + 0.25 - bob, 0.14, 0, Math.PI * 2);
  context.fill();

  context.fillStyle = "#3f4c3e";
  context.beginPath();
  context.arc(x + 0.5, y + 0.2 - bob, 0.15, Math.PI, Math.PI * 2);
  context.fill();
  context.restore();
}

function getCargoColour(agent: Agent): string | null {
  if (agent.inventory.wood > 0 || agent.inventory.stone > 0) return "#b69a68";
  if (agent.inventory.fish > 0) return "#6faeb0";
  if (agent.inventory.food > 0) return "#c98267";
  return null;
}


function drawAgentClusters(
  context: CanvasRenderingContext2D,
  agents: readonly Agent[],
  selectedIds: ReadonlySet<string>,
  motion?: AgentMotionAnimator
): void {
  const clusters = new Map<string, Array<{ agent: Agent; position: GridPoint }>>();

  for (const agent of agents) {
    if (!agent.alive) continue;
    const position = motion?.getPosition(agent.id, agent) ?? { x: agent.x, y: agent.y };
    const cellX = Math.floor(position.x / 6);
    const cellY = Math.floor(position.y / 6);
    const key = `${cellX}:${cellY}`;
    const cluster = clusters.get(key) ?? [];
    cluster.push({ agent, position });
    clusters.set(key, cluster);
  }

  for (const cluster of clusters.values()) {
    const centerX = cluster.reduce((sum, entry) => sum + entry.position.x + 0.5, 0) / cluster.length;
    const centerY = cluster.reduce((sum, entry) => sum + entry.position.y + 0.5, 0) / cluster.length;
    const selected = cluster.some((entry) => selectedIds.has(entry.agent.id));

    context.fillStyle = selected ? "#e5d5a3" : "#d0b88b";
    context.beginPath();
    context.arc(centerX, centerY, 0.32, 0, Math.PI * 2);
    context.fill();

    if (cluster.length > 1) {
      context.fillStyle = "#1c2921";
      context.font = "0.36px sans-serif";
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.fillText(String(cluster.length), centerX, centerY + 0.01);
    }
  }
}


function drawStartingPoint(
  context: CanvasRenderingContext2D,
  point: GridPoint,
  bounds: WorldBounds
): void {
  if (!isInsideBounds(point.x, point.y, bounds)) return;

  context.strokeStyle = "#f0d38e";
  context.lineWidth = 0.1;
  context.beginPath();
  context.arc(point.x + 0.5, point.y + 0.5, 0.62, 0, Math.PI * 2);
  context.stroke();

  context.beginPath();
  context.moveTo(point.x + 0.5, point.y + 0.15);
  context.lineTo(point.x + 0.5, point.y + 0.85);
  context.moveTo(point.x + 0.15, point.y + 0.5);
  context.lineTo(point.x + 0.85, point.y + 0.5);
  context.stroke();
}

function drawAgents(
  context: CanvasRenderingContext2D,
  agents: readonly Agent[],
  bounds: WorldBounds,
  zoom: number,
  selectedIds: ReadonlySet<string>,
  motion?: AgentMotionAnimator
): void {
  const visible = agents.filter((agent) => {
    if (!agent.alive) return false;
    const position = motion?.getPosition(agent.id, agent) ?? { x: agent.x, y: agent.y };
    return isInsideBounds(position.x, position.y, bounds);
  });

  if (zoom < 5) {
    drawAgentClusters(context, visible, selectedIds, motion);
    return;
  }

  for (const agent of visible) {
    const position = motion?.getPosition(agent.id, agent) ?? { x: agent.x, y: agent.y };
    drawAgentSprite(
      context,
      position,
      selectedIds.has(agent.id),
      motion?.isMoving(agent.id) ?? false,
      motion?.getWalkCycle(agent.id) ?? 0,
      motion?.getFacing(agent.id) ?? { x: 0, y: -1 },
      getCargoColour(agent)
    );
  }
}


const ACTIVITY_COLOURS: Record<AgentGoal, string> = {
  seek_food: "#c9856c",
  seek_fish: "#73aeb0",
  fish: "#73aeb0",
  gather: "#c9856c",
  eat: "#c6a4b5",
  seek_water: "#74a9c0",
  drink: "#74a9c0",
  rest: "#b1a4bf",
  explore: "#a5ad9c",
  gather_wood: "#91ad78",
  gather_stone: "#afb4b0",
  deliver_resources: "#c2b07d",
  deliver_food: "#c9856c",
  seek_shared_food: "#c6a4b5",
  collect_ration: "#c6a4b5",
  search_resources: "#a2ad8d",
  wait_for_materials: "#a2ad8d",
  find_build_site: "#d2a46f",
  build_shelter: "#d28e69",
  prepare_field: "#987d54",
  plant_crop: "#86a96d",
  tend_crop: "#9bb77a",
  harvest_crop: "#d1b05f",
  wait_for_crops: "#9b9d83"
};

function drawAgentActivities(
  context: CanvasRenderingContext2D,
  agents: readonly Agent[],
  bounds: WorldBounds,
  zoom: number,
  motion?: AgentMotionAnimator
): void {
  const visible = agents.filter((agent) => {
    if (!agent.alive) return false;
    const position = motion?.getPosition(agent.id, agent) ?? { x: agent.x, y: agent.y };
    return isInsideBounds(position.x, position.y, bounds);
  });

  if (zoom < 5) {
    const buckets = new Map<string, {
      x: number;
      y: number;
      count: number;
      goals: Map<AgentGoal, number>;
    }>();
    for (const agent of visible) {
      const position = motion?.getPosition(agent.id, agent) ?? { x: agent.x, y: agent.y };
      const key = `${Math.floor(position.x / 6)}:${Math.floor(position.y / 6)}`;
      const bucket = buckets.get(key) ?? { x: 0, y: 0, count: 0, goals: new Map<AgentGoal, number>() };
      bucket.x += position.x + 0.5;
      bucket.y += position.y + 0.5;
      bucket.count += 1;
      bucket.goals.set(agent.currentGoal, (bucket.goals.get(agent.currentGoal) ?? 0) + 1);
      buckets.set(key, bucket);
    }

    for (const bucket of buckets.values()) {
      let dominantGoal: AgentGoal = "explore";
      let dominantCount = -1;
      for (const [goal, count] of bucket.goals) {
        if (count > dominantCount) {
          dominantGoal = goal;
          dominantCount = count;
        }
      }
      const x = bucket.x / bucket.count;
      const y = bucket.y / bucket.count;
      context.save();
      context.fillStyle = ACTIVITY_COLOURS[dominantGoal];
      context.globalAlpha = 0.78;
      context.beginPath();
      context.arc(x, y, 0.24 + Math.min(0.1, bucket.count * 0.015), 0, Math.PI * 2);
      context.fill();
      if (bucket.count > 1) {
        context.globalAlpha = 1;
        context.fillStyle = "#17221c";
        context.font = "0.3px sans-serif";
        context.textAlign = "center";
        context.textBaseline = "middle";
        context.fillText(String(bucket.count), x, y + 0.01);
      }
      context.restore();
    }
    return;
  }

  for (const agent of visible) {
    const position = motion?.getPosition(agent.id, agent) ?? { x: agent.x, y: agent.y };
    context.save();
    context.strokeStyle = ACTIVITY_COLOURS[agent.currentGoal];
    context.globalAlpha = 0.9;
    context.lineWidth = 0.055;
    context.beginPath();
    context.arc(position.x + 0.5, position.y + 0.5, 0.29, 0, Math.PI * 2);
    context.stroke();
    context.restore();
  }
}


const AGENT_OVERLAY_COLOURS = [
  "#e5c58a",
  "#88b4a3",
  "#c69dc2",
  "#d48f75",
  "#8ba8cf",
  "#b5bd7c",
  "#c6a27d",
  "#83b9bf"
] as const;

function getAgentOverlayColour(agentId: string): string {
  let hash = 0;
  for (let index = 0; index < agentId.length; index += 1) {
    hash = (Math.imul(hash, 31) + agentId.charCodeAt(index)) | 0;
  }
  return AGENT_OVERLAY_COLOURS[Math.abs(hash) % AGENT_OVERLAY_COLOURS.length] ?? "#e5c58a";
}

function drawAgentOverlays(
  context: CanvasRenderingContext2D,
  world: WorldState,
  selectedAgents: readonly Agent[],
  bounds: WorldBounds,
  layers: RenderLayers,
  visibilityCache: Map<string, { key: string; tiles: GridPoint[] }>,
  zoom: number
): void {
  const motion = layers.motion;
  if (layers.showVision && zoom >= 5) {
    for (const agent of selectedAgents) {
      const buildingSignature = world.buildings.map((building) => `${building.x},${building.y}`).join(";");
      const key = `${agent.x}:${agent.y}:${agent.sightRadius ?? 7}:${buildingSignature}`;
      const cached = visibilityCache.get(agent.id);
      let visible = cached?.key === key ? cached.tiles : null;
      if (!visible) {
        visible = computeVisibleTiles(
          world,
          { x: agent.x, y: agent.y },
          agent.sightRadius ?? 7
        );
        visibilityCache.set(agent.id, { key, tiles: visible });
      }

      context.save();
      context.fillStyle = getAgentOverlayColour(agent.id);
      context.globalAlpha = 0.14;
      for (const point of visible) {
        if (isInsideBounds(point.x, point.y, bounds)) {
          context.fillRect(point.x + 0.08, point.y + 0.08, 0.84, 0.84);
        }
      }
      context.restore();
    }
  }

  for (const agent of selectedAgents) {
    const visual = motion?.getPosition(agent.id, agent) ?? { x: agent.x, y: agent.y };
    const startX = visual.x + 0.5;
    const startY = visual.y + 0.5;

    const overlayColour = getAgentOverlayColour(agent.id);

    if (layers.showTrails && motion && zoom >= 3) {
      const trail = motion.getTrail(agent.id);
      if (trail.length > 1) {
        context.save();
        context.lineCap = "round";
        context.lineJoin = "round";
        for (let index = 1; index < trail.length; index += 1) {
          const before = trail[index - 1];
          const after = trail[index];
          if (!before || !after) continue;
          context.globalAlpha = 0.12 + 0.55 * (index / (trail.length - 1));
          context.strokeStyle = overlayColour;
          context.lineWidth = 0.045;
          context.beginPath();
          context.moveTo(before.x + 0.5, before.y + 0.5);
          context.lineTo(after.x + 0.5, after.y + 0.5);
          context.stroke();
        }
        context.restore();
      }
    }

    if (layers.showRoutes && zoom >= 2 && agent.plannedPath && agent.plannedPath.length > 0) {
      context.save();
      context.strokeStyle = overlayColour;
      context.lineWidth = 0.075;
      context.lineCap = "round";
      context.lineJoin = "round";
      context.setLineDash([0.22, 0.16]);
      context.beginPath();
      context.moveTo(startX, startY);
      // The authoritative agent has already reserved the next grid tile.
      // Draw through that tile centre so the visual route never cuts a corner.
      context.lineTo(agent.x + 0.5, agent.y + 0.5);
      for (const point of agent.plannedPath) {
        context.lineTo(point.x + 0.5, point.y + 0.5);
      }
      context.stroke();
      context.restore();
    }

    if (layers.showTargets && zoom >= 2 && agent.destination) {
      const target = agent.destination;
      context.save();
      context.strokeStyle = overlayColour;
      context.fillStyle = overlayColour;
      context.lineWidth = 0.075;
      context.beginPath();
      context.arc(target.x + 0.5, target.y + 0.5, 0.34, 0, Math.PI * 2);
      context.globalAlpha = 0.16;
      context.fill();
      context.globalAlpha = 0.9;
      context.stroke();
      context.beginPath();
      context.moveTo(target.x + 0.5, target.y + 0.05);
      context.lineTo(target.x + 0.5, target.y + 0.95);
      context.moveTo(target.x + 0.05, target.y + 0.5);
      context.lineTo(target.x + 0.95, target.y + 0.5);
      context.stroke();
      context.restore();
    }
  }

  if (layers.selectionRect) {
    const rect = layers.selectionRect;
    context.save();
    context.fillStyle = "rgba(212, 188, 131, 0.11)";
    context.strokeStyle = "rgba(241, 214, 155, 0.92)";
    context.lineWidth = 0.065;
    context.setLineDash([0.22, 0.14]);
    context.fillRect(rect.left, rect.top, rect.right - rect.left, rect.bottom - rect.top);
    context.strokeRect(rect.left, rect.top, rect.right - rect.left, rect.bottom - rect.top);
    context.restore();
  }
}

/** A lightweight, read-only Canvas 2D renderer for the authoritative world state. */
export class CanvasWorldRenderer {
  private readonly visibilityCache = new Map<string, { key: string; tiles: GridPoint[] }>();
  private woodLookupTick = -1;
  private woodQuantities = new Map<string, number>();

  private getWoodQuantities(world: WorldState): ReadonlyMap<string, number> {
    if (this.woodLookupTick !== world.tick) {
      this.woodQuantities = new Map<string, number>();
      for (const resource of world.resources) {
        if (resource.kind !== "wood") continue;
        const key = `${resource.x}:${resource.y}`;
        this.woodQuantities.set(key, (this.woodQuantities.get(key) ?? 0) + resource.quantity);
      }
      this.woodLookupTick = world.tick;
    }
    return this.woodQuantities;
  }

  render(
    world: WorldState,
    camera: Camera,
    context: CanvasRenderingContext2D,
    viewport: ViewportSize,
    layers: RenderLayers = {}
  ): void {
    if (viewport.width <= 0 || viewport.height <= 0) return;

    const ratio = getCappedPixelRatio(
      Math.max(1, context.canvas.width / viewport.width)
    );

    context.save();
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.clearRect(0, 0, viewport.width, viewport.height);
    context.fillStyle = "#19251f";
    context.fillRect(0, 0, viewport.width, viewport.height);

    context.translate(
      viewport.width / 2 - camera.centerX * camera.zoom,
      viewport.height / 2 - camera.centerY * camera.zoom
    );
    context.scale(camera.zoom, camera.zoom);

    const bounds = clampBounds(getVisibleWorldBounds(camera, viewport), world);

    if (layers.terrain !== false) {
      drawTerrain(context, world, bounds, camera.zoom, this.getWoodQuantities(world));
    }

    if (layers.resourceDensity) {
      drawResourceDensity(context, world.resources, bounds, camera.zoom);
    }

    if (layers.resources !== false) {
      drawResources(context, world.resources, bounds, camera.zoom);
    }

    drawFarmPlots(context, world.farmPlots ?? [], bounds, camera.zoom);

    if (layers.buildings !== false) {
      drawBuildings(context, world.buildings, bounds, camera.zoom);
    }

    if (layers.stockpile !== false) {
      drawStockpile(context, world.stockpile, bounds, camera.zoom);
    }

    if (layers.startingPoint) {
      drawStartingPoint(context, layers.startingPoint, bounds);
    }

    const selectedIds = new Set(layers.selectedAgentIds ?? []);
    if (layers.selectedAgentId) selectedIds.add(layers.selectedAgentId);
    const selectedAgents = world.agents.filter((agent) => agent.alive && selectedIds.has(agent.id));

    if (selectedAgents.length > 0 || layers.selectionRect) {
      drawAgentOverlays(context, world, selectedAgents, bounds, layers, this.visibilityCache, camera.zoom);
    }

    if (layers.agents !== false) {
      drawAgents(context, world.agents, bounds, camera.zoom, selectedIds, layers.motion);
    }

    if (layers.activities) {
      drawAgentActivities(context, world.agents, bounds, camera.zoom, layers.motion);
    }

    context.restore();
  }
}

/** Configure a canvas backing store without allowing extreme high-DPI allocations. */
export function resizeCanvas(
  canvas: HTMLCanvasElement,
  viewport: ViewportSize,
  devicePixelRatio = 1
): number {
  if (
    !Number.isFinite(viewport.width) ||
    !Number.isFinite(viewport.height) ||
    viewport.width <= 0 ||
    viewport.height <= 0
  ) {
    throw new RangeError("Canvas viewport dimensions must be positive finite numbers.");
  }

  const ratio = getCappedPixelRatio(devicePixelRatio);
  const width = Math.max(1, Math.round(viewport.width * ratio));
  const height = Math.max(1, Math.round(viewport.height * ratio));

  if (canvas.width !== width) canvas.width = width;
  if (canvas.height !== height) canvas.height = height;
  return ratio;
}
