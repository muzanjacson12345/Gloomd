import { describe, expect, it } from "vitest";
import { createCamera } from "../../src/render/camera";
import {
  getCappedPixelRatio,
  getVisibleWorldBounds,
  screenToWorld,
  worldToScreen
} from "../../src/render/geometry";

describe("map geometry", () => {
  it("round-trips world and screen coordinates", () => {
    const camera = createCamera(128, 96, 16);
    const viewport = { width: 800, height: 600 };
    const point = { x: 24.25, y: 60.75 };

    const screen = worldToScreen(camera, point, viewport);
    const world = screenToWorld(camera, screen, viewport);

    expect(world.x).toBeCloseTo(point.x, 10);
    expect(world.y).toBeCloseTo(point.y, 10);
  });

  it("places the camera center at the center of the viewport", () => {
    const camera = createCamera(128, 96, 12);
    const screen = worldToScreen(
      camera,
      { x: camera.centerX, y: camera.centerY },
      { width: 320, height: 568 }
    );

    expect(screen).toEqual({ x: 160, y: 284 });
  });

  it("clamps visible bounds for a small viewport at the map edge", () => {
    const camera = createCamera(128, 96, 4);
    camera.centerX = 2;
    camera.centerY = 2;

    const bounds = getVisibleWorldBounds(camera, { width: 320, height: 568 });

    expect(bounds.left).toBe(0);
    expect(bounds.top).toBe(0);
    expect(bounds.right).toBeLessThanOrEqual(128);
    expect(bounds.bottom).toBeLessThanOrEqual(96);
  });

  it("supports large viewports without returning out-of-world bounds", () => {
    const camera = createCamera(128, 96, 10);
    const bounds = getVisibleWorldBounds(camera, { width: 3840, height: 2160 });

    expect(bounds.left).toBe(0);
    expect(bounds.top).toBe(0);
    expect(bounds.right).toBe(128);
    expect(bounds.bottom).toBe(96);
  });

  it("caps high-DPI rendering at a pixel ratio of two", () => {
    expect(getCappedPixelRatio(1)).toBe(1);
    expect(getCappedPixelRatio(1.5)).toBe(1.5);
    expect(getCappedPixelRatio(3)).toBe(2);
  });
});
