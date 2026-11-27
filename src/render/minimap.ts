import type { WorldState } from "../core/types";
import type { Camera, ViewportSize } from "./camera";

export interface MiniMapPoint { x: number; y: number; }
export interface MiniMapWorldSize { width: number; height: number; }

interface MiniMapTransform {
  scale: number;
  offsetX: number;
  offsetY: number;
}

function getTransform(world: MiniMapWorldSize, viewport: ViewportSize): MiniMapTransform {
  if (
    !Number.isFinite(world.width) || !Number.isFinite(world.height) ||
    world.width <= 0 || world.height <= 0 ||
    !Number.isFinite(viewport.width) || !Number.isFinite(viewport.height) ||
    viewport.width <= 0 || viewport.height <= 0
  ) {
    throw new RangeError("Minimap world and viewport sizes must be positive and finite.");
  }

  const scale = Math.min(viewport.width / world.width, viewport.height / world.height);
  return {
    scale,
    offsetX: (viewport.width - world.width * scale) / 2,
    offsetY: (viewport.height - world.height * scale) / 2
  };
}

export function worldToMiniMap(
  point: MiniMapPoint,
  world: MiniMapWorldSize,
  viewport: ViewportSize
): MiniMapPoint {
  const transform = getTransform(world, viewport);
  return {
    x: transform.offsetX + point.x * transform.scale,
    y: transform.offsetY + point.y * transform.scale
  };
}

export function miniMapToWorld(
  point: MiniMapPoint,
  world: MiniMapWorldSize,
  viewport: ViewportSize
): MiniMapPoint {
  const transform = getTransform(world, viewport);
  return {
    x: Math.max(0, Math.min(world.width, (point.x - transform.offsetX) / transform.scale)),
    y: Math.max(0, Math.min(world.height, (point.y - transform.offsetY) / transform.scale))
  };
}

/** Draw a sampled terrain overview and the current camera rectangle. */
export function drawMiniMap(
  context: CanvasRenderingContext2D,
  world: WorldState,
  camera: Camera
): void {
  const width = context.canvas.width;
  const height = context.canvas.height;
  if (width <= 0 || height <= 0) return;

  const transform = getTransform(world, { width, height });
  context.clearRect(0, 0, width, height);
  context.fillStyle = "#101a15";
  context.fillRect(0, 0, width, height);

  // Sample terrain at minimap-pixel resolution instead of drawing every world tile.
  // This bounds minimap work to its small canvas even for the largest supported map.
  const mapPixelWidth = Math.min(width, Math.ceil(world.width * transform.scale));
  const mapPixelHeight = Math.min(height, Math.ceil(world.height * transform.scale));
  for (let pixelY = 0; pixelY < mapPixelHeight; pixelY += 1) {
    const worldY = Math.min(world.height - 1, Math.floor(pixelY / transform.scale));
    const row = world.tiles[worldY];
    if (!row) continue;
    for (let pixelX = 0; pixelX < mapPixelWidth; pixelX += 1) {
      const worldX = Math.min(world.width - 1, Math.floor(pixelX / transform.scale));
      const tile = row[worldX];
      if (!tile) continue;
      context.fillStyle = tile.terrain === "water" ? "#294d59"
        : tile.terrain === "river" ? "#3d7180"
          : tile.terrain === "beach" ? "#a79772"
            : tile.terrain === "forest" ? "#385541"
              : tile.terrain === "hill" ? "#777854"
                : tile.terrain === "mountain" ? "#858980" : "#657b57";
      context.fillRect(transform.offsetX + pixelX, transform.offsetY + pixelY, 1, 1);
    }
  }

  context.fillStyle = "#d2bd8b";
  for (const agent of world.agents) {
    if (!agent.alive) continue;
    const point = worldToMiniMap({ x: agent.x + 0.5, y: agent.y + 0.5 }, world, { width, height });
    context.fillRect(point.x - 0.65, point.y - 0.65, 1.3, 1.3);
  }

  const halfWidth = width / (2 * camera.zoom);
  const halfHeight = height / (2 * camera.zoom);
  const topLeft = worldToMiniMap({
    x: camera.centerX - halfWidth,
    y: camera.centerY - halfHeight
  }, world, { width, height });
  const bottomRight = worldToMiniMap({
    x: camera.centerX + halfWidth,
    y: camera.centerY + halfHeight
  }, world, { width, height });

  context.strokeStyle = "#f1d69b";
  context.lineWidth = 1.5;
  context.strokeRect(
    topLeft.x,
    topLeft.y,
    Math.max(2, bottomRight.x - topLeft.x),
    Math.max(2, bottomRight.y - topLeft.y)
  );

  context.fillStyle = "#f1d69b";
  const store = worldToMiniMap({ x: world.stockpile.x + 0.5, y: world.stockpile.y + 0.5 }, world, { width, height });
  context.fillRect(store.x - 2, store.y - 2, 4, 4);
}
