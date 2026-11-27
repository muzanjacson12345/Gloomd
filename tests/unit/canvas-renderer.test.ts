import { describe, expect, it } from "vitest";
import { createWorld } from "../../src/core/world-generation";
import { createCamera } from "../../src/render/camera";
import { CanvasWorldRenderer } from "../../src/render/canvas-renderer";

describe("Canvas world renderer", () => {
  it("draws only visible tiles and does not mutate simulation state", () => {
    const world = createWorld(42, { width: 16, height: 16 });
    const before = structuredClone(world);
    const calls = { fillRect: 0 };

    const context = {
      save() {},
      restore() {},
      clearRect() {},
      fillRect() {
        calls.fillRect += 1;
      },
      beginPath() {},
      closePath() {},
      moveTo() {},
      lineTo() {},
      arc() {},
      ellipse() {},
      fill() {},
      stroke() {},
      strokeRect() {},
      fillText() {},
      setLineDash() {}
    } as unknown as CanvasRenderingContext2D;

    const camera = createCamera(world.width, world.height, 12);
    const viewport = { width: 48, height: 48 };
    const renderer = new CanvasWorldRenderer();

    renderer.render(world, camera, context, viewport, {
      terrain: true,
      resources: false,
      agents: false
    });

    expect(calls.fillRect).toBeGreaterThan(1);
    expect(calls.fillRect).toBeLessThan(world.width * world.height);
    expect(world).toEqual(before);
  });
});
