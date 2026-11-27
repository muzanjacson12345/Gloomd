import type { Agent, GridPoint } from "../core/types";
import type { Camera, ScreenPoint, ViewportSize } from "../render/camera";
import { panCamera, zoomAt } from "../render/camera";

export interface MapDragRect {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

/** Returns the closest living agent whose centre falls within the pick radius. */
export function findAgentAtWorldPoint(
  agents: readonly Agent[],
  point: GridPoint,
  radius: number
): Agent | null {
  if (!Number.isFinite(radius) || radius < 0) return null;

  const radiusSquared = radius * radius;
  let nearest: Agent | null = null;
  let nearestDistance = radiusSquared;

  for (const agent of agents) {
    if (!agent.alive) continue;
    const dx = agent.x + 0.5 - point.x;
    const dy = agent.y + 0.5 - point.y;
    const distanceSquared = dx * dx + dy * dy;

    if (distanceSquared <= radiusSquared && (nearest === null || distanceSquared < nearestDistance)) {
      nearest = agent;
      nearestDistance = distanceSquared;
    }
  }

  return nearest;
}

export interface MapInputHandlers {
  onSelect(point: ScreenPoint): void;
  onChange(): void;
  isSelectionMode?: () => boolean;
  onSelectionPreview?: (rect: MapDragRect | null) => void;
  onAreaSelect?: (rect: MapDragRect) => void;
}

function makeRect(start: ScreenPoint, end: ScreenPoint): MapDragRect {
  return {
    left: Math.min(start.x, end.x),
    top: Math.min(start.y, end.y),
    right: Math.max(start.x, end.x),
    bottom: Math.max(start.y, end.y)
  };
}

export function attachMapInput(
  canvas: HTMLCanvasElement,
  camera: Camera,
  getViewport: () => ViewportSize,
  handlers: MapInputHandlers
): () => void {
  let pointerId: number | null = null;
  let lastX = 0;
  let lastY = 0;
  let startPoint: ScreenPoint = { x: 0, y: 0 };
  let moved = false;
  let selecting = false;

  const toCanvasPoint = (event: PointerEvent): ScreenPoint => {
    const rect = canvas.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  };

  const pointerDown = (event: PointerEvent): void => {
    if (event.button !== 0) return;
    pointerId = event.pointerId;
    lastX = event.clientX;
    lastY = event.clientY;
    startPoint = toCanvasPoint(event);
    moved = false;
    selecting = handlers.isSelectionMode?.() ?? false;
    canvas.setPointerCapture(event.pointerId);
    canvas.classList.toggle("is-selecting", selecting);
    if (!selecting) canvas.classList.add("is-dragging");
  };

  const pointerMove = (event: PointerEvent): void => {
    if (pointerId !== event.pointerId) return;
    const deltaX = event.clientX - lastX;
    const deltaY = event.clientY - lastY;
    const totalDistance = Math.hypot(event.clientX - (startPoint.x + canvas.getBoundingClientRect().left),
      event.clientY - (startPoint.y + canvas.getBoundingClientRect().top));
    if (totalDistance > 4) moved = true;

    if (selecting) {
      if (moved) {
        handlers.onSelectionPreview?.(makeRect(startPoint, toCanvasPoint(event)));
        handlers.onChange();
      }
    } else if (moved) {
      panCamera(camera, deltaX, deltaY);
      handlers.onChange();
    }
    lastX = event.clientX;
    lastY = event.clientY;
  };

  const pointerUp = (event: PointerEvent): void => {
    if (pointerId !== event.pointerId) return;
    const endPoint = toCanvasPoint(event);
    if (selecting && moved) {
      handlers.onAreaSelect?.(makeRect(startPoint, endPoint));
      handlers.onSelectionPreview?.(null);
      handlers.onChange();
    } else if (!moved) {
      handlers.onSelect(endPoint);
    }
    pointerId = null;
    selecting = false;
    canvas.classList.remove("is-dragging", "is-selecting");
    if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
  };

  const pointerCancel = (): void => {
    pointerId = null;
    selecting = false;
    handlers.onSelectionPreview?.(null);
    canvas.classList.remove("is-dragging", "is-selecting");
  };

  const wheel = (event: WheelEvent): void => {
    event.preventDefault();
    const rect = canvas.getBoundingClientRect();
    zoomAt(
      camera,
      { x: event.clientX - rect.left, y: event.clientY - rect.top },
      event.deltaY < 0 ? 1.16 : 1 / 1.16,
      getViewport()
    );
    handlers.onChange();
  };

  const contextMenu = (event: MouseEvent): void => event.preventDefault();

  canvas.addEventListener("pointerdown", pointerDown);
  canvas.addEventListener("pointermove", pointerMove);
  canvas.addEventListener("pointerup", pointerUp);
  canvas.addEventListener("pointercancel", pointerCancel);
  canvas.addEventListener("wheel", wheel, { passive: false });
  canvas.addEventListener("contextmenu", contextMenu);
  return () => {
    canvas.removeEventListener("pointerdown", pointerDown);
    canvas.removeEventListener("pointermove", pointerMove);
    canvas.removeEventListener("pointerup", pointerUp);
    canvas.removeEventListener("pointercancel", pointerCancel);
    canvas.removeEventListener("wheel", wheel);
    canvas.removeEventListener("contextmenu", contextMenu);
  };
}
