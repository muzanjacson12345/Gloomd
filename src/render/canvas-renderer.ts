import type { Agent, ResourceNode, Tile, WorldState } from "../core/types";
import { getCappedPixelRatio, getVisibleWorldBounds } from "./geometry";
import type { WorldBounds } from "./geometry";
import type { Camera, ViewportSize } from "./camera";

export interface RenderLayers {
  terrain?: boolean;
  resources?: boolean;
  agents?: boolean;
  selectedAgentId?: string | null;
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

function drawAgentSprite(
  context: CanvasRenderingContext2D,
  agent: Agent,
  selected: boolean
): void {
  const x = agent.x;
  const y = agent.y;

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
  context.moveTo(x + 0.44, y + 0.63);
  context.lineTo(x + 0.38, y + 0.82);
  context.moveTo(x + 0.56, y + 0.63);
  context.lineTo(x + 0.62, y + 0.82);
  context.stroke();

  context.fillStyle = "#d0b88b";
  context.beginPath();
  context.ellipse(x + 0.5, y + 0.53, 0.19, 0.24, 0, 0, Math.PI * 2);
  context.fill();

  context.fillStyle = "#c68f68";
  context.beginPath();
  context.arc(x + 0.5, y + 0.25, 0.14, 0, Math.PI * 2);
  context.fill();

  context.fillStyle = "#3f4c3e";
  context.beginPath();
  context.arc(x + 0.5, y + 0.2, 0.15, Math.PI, Math.PI * 2);
  context.fill();
}

function drawAgentClusters(
  context: CanvasRenderingContext2D,
  agents: readonly Agent[],
  selectedAgentId: string | null | undefined
): void {
  const clusters = new Map<string, Agent[]>();

  for (const agent of agents) {
    if (!agent.alive) continue;
    const cellX = Math.floor(agent.x / 6);
    const cellY = Math.floor(agent.y / 6);
    const key = `${cellX}:${cellY}`;
    const cluster = clusters.get(key) ?? [];
    cluster.push(agent);
    clusters.set(key, cluster);
  }

  for (const cluster of clusters.values()) {
    const centerX = cluster.reduce((sum, agent) => sum + agent.x + 0.5, 0) / cluster.length;
    const centerY = cluster.reduce((sum, agent) => sum + agent.y + 0.5, 0) / cluster.length;
    const selected = cluster.some((agent) => agent.id === selectedAgentId);

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

function drawAgents(
  context: CanvasRenderingContext2D,
  agents: readonly Agent[],
  bounds: WorldBounds,
  zoom: number,
  selectedAgentId: string | null | undefined
): void {
  const visible = agents.filter(
    (agent) => agent.alive && isInsideBounds(agent.x, agent.y, bounds)
  );

  if (zoom < 5) {
    drawAgentClusters(context, visible, selectedAgentId);
    return;
  }

  for (const agent of visible) {
    drawAgentSprite(context, agent, agent.id === selectedAgentId);
  }
}

/** A lightweight, read-only Canvas 2D renderer for the authoritative world state. */
export class CanvasWorldRenderer {
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

    if (layers.agents !== false) {
      drawAgents(context, world.agents, bounds, camera.zoom, layers.selectedAgentId);
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
  const ratio = getCappedPixelRatio(devicePixelRatio);
  const width = Math.max(1, Math.round(viewport.width * ratio));
  const height = Math.max(1, Math.round(viewport.height * ratio));

  if (canvas.width !== width) canvas.width = width;
  if (canvas.height !== height) canvas.height = height;

  canvas.style.width = `${viewport.width}px`;
  canvas.style.height = `${viewport.height}px`;
  return ratio;
}
