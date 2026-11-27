import type { Camera, ScreenPoint, ViewportSize } from "../render/camera";
import { panCamera, zoomAt } from "../render/camera";

export interface MapInputHandlers {
  onSelect(point: ScreenPoint): void;
  onChange(): void;
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
  let moved = false;

  const pointerDown = (event: PointerEvent): void => {
    if (event.button !== 0) return;
    pointerId = event.pointerId;
    lastX = event.clientX;
    lastY = event.clientY;
    moved = false;
    canvas.setPointerCapture(event.pointerId);
    canvas.classList.add("is-dragging");
  };
  const pointerMove = (event: PointerEvent): void => {
    if (pointerId !== event.pointerId) return;
    const deltaX = event.clientX - lastX;
    const deltaY = event.clientY - lastY;
    if (Math.abs(deltaX) + Math.abs(deltaY) > 2) moved = true;
    if (moved) {
      panCamera(camera, deltaX, deltaY);
      handlers.onChange();
    }
    lastX = event.clientX;
    lastY = event.clientY;
  };
  const pointerUp = (event: PointerEvent): void => {
    if (pointerId !== event.pointerId) return;
    if (!moved) {
      const rect = canvas.getBoundingClientRect();
      handlers.onSelect({ x: event.clientX - rect.left, y: event.clientY - rect.top });
    }
    pointerId = null;
    canvas.classList.remove("is-dragging");
    if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
  };
  const pointerCancel = (): void => {
    pointerId = null;
    canvas.classList.remove("is-dragging");
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
