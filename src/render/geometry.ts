import type { GridPoint } from "../core/types";
import type { Camera, ScreenPoint, ViewportSize } from "./camera";

export interface WorldBounds {
  /** Inclusive left tile coordinate. */
  left: number;
  /** Inclusive top tile coordinate. */
  top: number;
  /** Exclusive right tile coordinate. */
  right: number;
  /** Exclusive bottom tile coordinate. */
  bottom: number;
}

function assertViewport(viewport: ViewportSize): void {
  if (
    !Number.isFinite(viewport.width) ||
    !Number.isFinite(viewport.height) ||
    viewport.width <= 0 ||
    viewport.height <= 0
  ) {
    throw new RangeError("Viewport dimensions must be positive finite numbers.");
  }
}

export function worldToScreen(
  camera: Camera,
  point: GridPoint,
  viewport: ViewportSize
): ScreenPoint {
  assertViewport(viewport);
  return {
    x: viewport.width / 2 + (point.x - camera.centerX) * camera.zoom,
    y: viewport.height / 2 + (point.y - camera.centerY) * camera.zoom
  };
}

export function screenToWorld(
  camera: Camera,
  point: ScreenPoint,
  viewport: ViewportSize
): GridPoint {
  assertViewport(viewport);
  return {
    x: camera.centerX + (point.x - viewport.width / 2) / camera.zoom,
    y: camera.centerY + (point.y - viewport.height / 2) / camera.zoom
  };
}

export function getVisibleWorldBounds(camera: Camera, viewport: ViewportSize): WorldBounds {
  assertViewport(viewport);

  const halfWidth = viewport.width / (2 * camera.zoom);
  const halfHeight = viewport.height / (2 * camera.zoom);

  return {
    left: Math.max(0, Math.floor(camera.centerX - halfWidth)),
    top: Math.max(0, Math.floor(camera.centerY - halfHeight)),
    right: Math.min(camera.worldWidth, Math.ceil(camera.centerX + halfWidth)),
    bottom: Math.min(camera.worldHeight, Math.ceil(camera.centerY + halfHeight))
  };
}

export function getCappedPixelRatio(devicePixelRatio: number): number {
  if (!Number.isFinite(devicePixelRatio) || devicePixelRatio <= 0) return 1;
  return Math.min(2, devicePixelRatio);
}
