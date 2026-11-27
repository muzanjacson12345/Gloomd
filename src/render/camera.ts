import type { GridPoint } from "../core/types";

export interface ViewportSize {
  width: number;
  height: number;
}

export interface ScreenPoint {
  x: number;
  y: number;
}

export interface Camera {
  centerX: number;
  centerY: number;
  zoom: number;
  minZoom: number;
  maxZoom: number;
  worldWidth: number;
  worldHeight: number;
}

const DEFAULT_MIN_ZOOM = 1;
const DEFAULT_MAX_ZOOM = 48;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
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

export function createCamera(
  worldWidth: number,
  worldHeight: number,
  initialZoom = 12
): Camera {
  if (
    !Number.isInteger(worldWidth) ||
    !Number.isInteger(worldHeight) ||
    worldWidth <= 0 ||
    worldHeight <= 0
  ) {
    throw new RangeError("World dimensions must be positive whole numbers.");
  }

  if (!Number.isFinite(initialZoom) || initialZoom <= 0) {
    throw new RangeError("Initial zoom must be a positive finite number.");
  }

  return {
    centerX: worldWidth / 2,
    centerY: worldHeight / 2,
    zoom: clamp(initialZoom, DEFAULT_MIN_ZOOM, DEFAULT_MAX_ZOOM),
    minZoom: DEFAULT_MIN_ZOOM,
    maxZoom: DEFAULT_MAX_ZOOM,
    worldWidth,
    worldHeight
  };
}

export function panCamera(camera: Camera, deltaScreenX: number, deltaScreenY: number): void {
  if (!Number.isFinite(deltaScreenX) || !Number.isFinite(deltaScreenY)) {
    throw new RangeError("Pan distance must be finite.");
  }

  camera.centerX -= deltaScreenX / camera.zoom;
  camera.centerY -= deltaScreenY / camera.zoom;
}

export function zoomAt(
  camera: Camera,
  screenPoint: ScreenPoint,
  factor: number,
  viewport: ViewportSize
): void {
  assertViewport(viewport);
  if (
    !Number.isFinite(screenPoint.x) ||
    !Number.isFinite(screenPoint.y) ||
    !Number.isFinite(factor) ||
    factor <= 0
  ) {
    throw new RangeError("Zoom anchor and factor must be finite, with a positive factor.");
  }

  const offsetX = screenPoint.x - viewport.width / 2;
  const offsetY = screenPoint.y - viewport.height / 2;
  const anchoredWorldX = camera.centerX + offsetX / camera.zoom;
  const anchoredWorldY = camera.centerY + offsetY / camera.zoom;
  const nextZoom = clamp(camera.zoom * factor, camera.minZoom, camera.maxZoom);

  camera.zoom = nextZoom;
  camera.centerX = anchoredWorldX - offsetX / nextZoom;
  camera.centerY = anchoredWorldY - offsetY / nextZoom;
}

/** A small helper for keyboard and UI zoom buttons, anchored at the screen centre. */
export function zoomCamera(
  camera: Camera,
  factor: number,
  viewport: ViewportSize
): void {
  zoomAt(camera, { x: viewport.width / 2, y: viewport.height / 2 }, factor, viewport);
}

/** Convert a tile coordinate into a stable camera target without mutating the world. */
export function setCameraCenter(camera: Camera, point: GridPoint): void {
  if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) {
    throw new RangeError("Camera target must contain finite coordinates.");
  }

  camera.centerX = clamp(point.x, 0, camera.worldWidth);
  camera.centerY = clamp(point.y, 0, camera.worldHeight);
}
