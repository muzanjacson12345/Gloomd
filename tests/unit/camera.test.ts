import { describe, expect, it } from "vitest";
import { createCamera, panCamera, zoomAt } from "../../src/render/camera";

describe("map camera", () => {
  it("starts centered on the world with a bounded zoom", () => {
    const camera = createCamera(128, 96, 14);

    expect(camera.centerX).toBe(64);
    expect(camera.centerY).toBe(48);
    expect(camera.zoom).toBe(14);
    expect(camera.zoom).toBeGreaterThanOrEqual(camera.minZoom);
    expect(camera.zoom).toBeLessThanOrEqual(camera.maxZoom);
  });

  it("pans the view opposite to the pointer drag", () => {
    const camera = createCamera(128, 96, 10);

    panCamera(camera, 50, -20);

    expect(camera.centerX).toBe(59);
    expect(camera.centerY).toBe(50);
  });

  it("keeps the world point under the pointer fixed while zooming", async () => {
    const { screenToWorld } = await import("../../src/render/geometry");
    const camera = createCamera(128, 96, 10);
    const viewport = { width: 800, height: 600 };
    const pointer = { x: 180, y: 420 };
    const before = screenToWorld(camera, pointer, viewport);

    zoomAt(camera, pointer, 2, viewport);

    const after = screenToWorld(camera, pointer, viewport);
    expect(camera.zoom).toBe(20);
    expect(after.x).toBeCloseTo(before.x, 10);
    expect(after.y).toBeCloseTo(before.y, 10);
  });

  it("clamps zoom between the camera limits", () => {
    const camera = createCamera(128, 96, 14);
    const viewport = { width: 800, height: 600 };

    zoomAt(camera, { x: 400, y: 300 }, 100, viewport);
    expect(camera.zoom).toBe(camera.maxZoom);

    zoomAt(camera, { x: 400, y: 300 }, 0.001, viewport);
    expect(camera.zoom).toBe(camera.minZoom);
  });
});
