import type { Agent, Building, GridPoint, ResourceNode, Stockpile, Tile, WorldState } from "../core/types";
import { getCappedPixelRatio, getVisibleWorldBounds } from "./geometry";
import type { WorldBounds } from "./geometry";
import type { Camera, ViewportSize } from "./camera";
import { computeVisibleTiles } from "../core/vision";
import type { WorldSelectionRect } from "../ui/selection";
import type { AgentMotionAnimator } from "./motion";

export interface RenderLayers {
  terrain?: boolean;
  resources?: boolean;
  agents?: boolean;
  buildings?: boolean;
  stockpile?: boolean;
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

const TERRAIN_COLOURS: Record<Tile["terrain"], string> = {
  water: "#294650",
  river: "#365f69",
  beach: "#a79772",
  grassland: "#586d4e",
  forest: "#385541",
  hill: "#777854",
  mountain: "#777a73"
};

const VARIATION_COLOURS = ["#00000000", "#ffffff08", "#00000008", "#ffffff0c"] as const;

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

function drawTerrain(
  context: CanvasRenderingContext2D,
  world: WorldState,
  bounds: WorldBounds,
  zoom: number
): void {
  for (let y = bounds.top; y < bounds.bottom; y += 1) {
    const row = world.tiles[y];
    if (!row) continue;

    for (let x = bounds.left; x < bounds.right; x += 1) {
      const tile = row[x];
      if (!tile) continue;

      context.fillStyle = TERRAIN_COLOURS[tile.terrain];
      context.fillRect(x, y, 1.01, 1.01);

      const variation = VARIATION_COLOURS[(x * 13 + y * 7) % VARIATION_COLOURS.length];
      if (variation && variation !== "#00000000") {
        context.fillStyle = variation;
        context.fillRect(x, y, 1.01, 1.01);
      }

      if (zoom >= 7 && tile.terrain === "forest") {
        const offset = ((x * 17 + y * 11) % 5) * 0.06;
        context.fillStyle = "#243f31";
        context.beginPath();
        context.moveTo(x + 0.5, y + 0.18 + offset);
        context.lineTo(x + 0.17, y + 0.82);
        context.lineTo(x + 0.83, y + 0.82);
        context.closePath();
        context.fill();
        context.fillStyle = "#9a8b62";
        context.fillRect(x + 0.46, y + 0.72, 0.08, 0.2);
      } else if (zoom >= 8 && tile.terrain === "mountain") {
        context.fillStyle = "#a7aaa1";
        context.beginPath();
        context.moveTo(x + 0.18, y + 0.83);
        context.lineTo(x + 0.55, y + 0.2);
        context.lineTo(x + 0.87, y + 0.83);
        context.closePath();
        context.fill();
      } else if (zoom >= 9 && tile.terrain === "water") {
        context.strokeStyle = "#ffffff18";
        context.lineWidth = 0.035;
        context.beginPath();
        context.moveTo(x + 0.2, y + 0.35);
        context.lineTo(x + 0.7, y + 0.35);
        context.stroke();
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
      case "wood":
        drawWood(context, resource.x, resource.y);
        break;
      case "stone":
        drawStone(context, resource.x, resource.y);
        break;
    }
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
}

function drawAgentSprite(
  context: CanvasRenderingContext2D,
  agent: Agent,
  position: GridPoint,
  selected: boolean,
  moving: boolean,
  walkPhase: number
): void {
  const x = position.x;
  const y = position.y;
  const bob = moving ? Math.abs(walkPhase) * 0.025 : 0;
  const legSwing = moving ? walkPhase * 0.09 : 0;

  context.fillStyle = "#111b16a8";
  context.beginPath();
  context.ellipse(x + 0.5, y + 0.83, 0.26, 0.09, 0, 0, Math.PI * 2);
  context.fill();

  if (selected) {
    context.strokeStyle = "#e5d5a3";
    context.lineWidth = 0.075;
    context.beginPath();
    context.arc(x + 0.5, y + 0.48, 0.48, 0, Math.PI * 2);
    context.stroke();
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
      agent,
      position,
      selectedIds.has(agent.id),
      motion?.isMoving(agent.id) ?? false,
      motion?.getWalkCycle(agent.id) ?? 0
    );
  }
}


function drawAgentOverlays(
  context: CanvasRenderingContext2D,
  world: WorldState,
  selectedAgents: readonly Agent[],
  bounds: WorldBounds,
  layers: RenderLayers,
  visibilityCache: Map<string, { key: string; tiles: GridPoint[] }>
): void {
  const motion = layers.motion;
  if (layers.showVision) {
    for (const agent of selectedAgents) {
      const key = `${world.tick}:${agent.x}:${agent.y}:${agent.sightRadius ?? 7}:${world.buildings.length}`;
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

      context.fillStyle = "rgba(185, 210, 165, 0.15)";
      for (const point of visible) {
        if (isInsideBounds(point.x, point.y, bounds)) {
          context.fillRect(point.x + 0.08, point.y + 0.08, 0.84, 0.84);
        }
      }
    }
  }

  for (const agent of selectedAgents) {
    const visual = motion?.getPosition(agent.id, agent) ?? { x: agent.x, y: agent.y };
    const startX = visual.x + 0.5;
    const startY = visual.y + 0.5;

    if (layers.showTrails && motion) {
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
          context.strokeStyle = "#d2c08e";
          context.lineWidth = 0.045;
          context.beginPath();
          context.moveTo(before.x + 0.5, before.y + 0.5);
          context.lineTo(after.x + 0.5, after.y + 0.5);
          context.stroke();
        }
        context.restore();
      }
    }

    if (layers.showRoutes && agent.plannedPath && agent.plannedPath.length > 0) {
      context.save();
      context.strokeStyle = "rgba(241, 214, 155, 0.86)";
      context.lineWidth = 0.075;
      context.lineCap = "round";
      context.lineJoin = "round";
      context.setLineDash([0.22, 0.16]);
      context.beginPath();
      context.moveTo(startX, startY);
      for (const point of agent.plannedPath) {
        context.lineTo(point.x + 0.5, point.y + 0.5);
      }
      context.stroke();
      context.restore();
    }

    if (layers.showTargets && agent.destination) {
      const target = agent.destination;
      context.save();
      context.strokeStyle = "#f1d69b";
      context.fillStyle = "rgba(241, 214, 155, 0.16)";
      context.lineWidth = 0.075;
      context.beginPath();
      context.arc(target.x + 0.5, target.y + 0.5, 0.34, 0, Math.PI * 2);
      context.fill();
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
      drawTerrain(context, world, bounds, camera.zoom);
    }

    if (layers.resources !== false) {
      drawResources(context, world.resources, bounds, camera.zoom);
    }

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

    if (camera.zoom >= 2 && selectedAgents.length > 0) {
      drawAgentOverlays(context, world, selectedAgents, bounds, layers, this.visibilityCache);
    }

    if (layers.agents !== false) {
      drawAgents(context, world.agents, bounds, camera.zoom, selectedIds, layers.motion);
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
