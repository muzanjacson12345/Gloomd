import { describe, expect, it } from "vitest";
import { miniMapToWorld, worldToMiniMap } from "../../src/render/minimap";

describe("minimap coordinates", () => {
  const world = { width: 128, height: 96 };
  const viewport = { width: 160, height: 120 };

  it("round-trips a world position through the minimap", () => {
    const point = { x: 32, y: 70 };
    const mini = worldToMiniMap(point, world, viewport);
    const restored = miniMapToWorld(mini, world, viewport);
    expect(restored.x).toBeCloseTo(point.x, 8);
    expect(restored.y).toBeCloseTo(point.y, 8);
  });

  it("maps the centre of the minimap to the centre of the world", () => {
    const point = miniMapToWorld({ x: 80, y: 60 }, world, viewport);
    expect(point.x).toBeCloseTo(64, 8);
    expect(point.y).toBeCloseTo(48, 8);
  });

  it("clamps clicks outside the minimap to valid world coordinates", () => {
    const point = miniMapToWorld({ x: -20, y: 200 }, world, viewport);
    expect(point.x).toBeGreaterThanOrEqual(0);
    expect(point.y).toBeGreaterThanOrEqual(0);
    expect(point.x).toBeLessThanOrEqual(world.width);
    expect(point.y).toBeLessThanOrEqual(world.height);
  });
});
