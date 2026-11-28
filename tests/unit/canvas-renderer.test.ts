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
      canvas: { width: 48, height: 48 },
      save() {},
      restore() {},
      setTransform() {},
      translate() {},
      scale() {},
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

  it("draws construction sites and completed shelters only when the Homes layer is enabled", () => {
    const world = createWorld(42, { width: 16, height: 16 });
    world.buildings.push(
      {
        id: "site-1",
        kind: "shelter",
        x: 7,
        y: 8,
        status: "under_construction",
        workDone: 4,
        workRequired: 12,
        builderId: "builder-1"
      },
      {
        id: "home-1",
        kind: "shelter",
        x: 8,
        y: 8,
        status: "complete",
        workDone: 12,
        workRequired: 12,
        builderId: "builder-2"
      }
    );
    const before = structuredClone(world);
    const calls = { fillRect: 0, fill: 0 };
    const context = {
      canvas: { width: 96, height: 96 },
      save() {},
      restore() {},
      setTransform() {},
      translate() {},
      scale() {},
      clearRect() {},
      fillRect() { calls.fillRect += 1; },
      beginPath() {},
      closePath() {},
      moveTo() {},
      lineTo() {},
      arc() {},
      ellipse() {},
      fill() { calls.fill += 1; },
      stroke() {},
      strokeRect() {},
      fillText() {},
      setLineDash() {}
    } as unknown as CanvasRenderingContext2D;
    const camera = createCamera(world.width, world.height, 12);
    const viewport = { width: 96, height: 96 };
    const renderer = new CanvasWorldRenderer();

    renderer.render(world, camera, context, viewport, {
      terrain: false,
      resources: false,
      agents: false,
      buildings: true,
      stockpile: false
    });
    expect(calls.fillRect + calls.fill).toBeGreaterThan(1);

    calls.fillRect = 0;
    calls.fill = 0;
    renderer.render(world, camera, context, viewport, {
      terrain: false,
      resources: false,
      agents: false,
      buildings: false,
      stockpile: false
    });
    expect(calls.fillRect + calls.fill).toBe(1);
    expect(world).toEqual(before);
  });


  it("draws the communal stockpile only when its layer is enabled and it is visible", () => {
    const world = createWorld(42, { width: 16, height: 16 });
    const before = structuredClone(world);
    const calls = { fillRect: 0, fill: 0 };
    const context = {
      canvas: { width: 96, height: 96 },
      save() {},
      restore() {},
      setTransform() {},
      translate() {},
      scale() {},
      clearRect() {},
      fillRect() { calls.fillRect += 1; },
      beginPath() {},
      closePath() {},
      moveTo() {},
      lineTo() {},
      arc() {},
      ellipse() {},
      fill() { calls.fill += 1; },
      stroke() {},
      strokeRect() {},
      fillText() {},
      setLineDash() {}
    } as unknown as CanvasRenderingContext2D;
    const camera = createCamera(world.width, world.height, 6);
    const viewport = { width: 96, height: 96 };
    const renderer = new CanvasWorldRenderer();

    renderer.render(world, camera, context, viewport, {
      terrain: false,
      resources: false,
      buildings: false,
      agents: false,
      stockpile: true
    });
    expect(calls.fillRect + calls.fill).toBeGreaterThan(1);

    calls.fillRect = 0;
    calls.fill = 0;
    renderer.render(world, camera, context, viewport, {
      terrain: false,
      resources: false,
      buildings: false,
      agents: false,
      stockpile: false
    });
    expect(calls.fillRect + calls.fill).toBe(1);

    calls.fillRect = 0;
    calls.fill = 0;
    camera.zoom = 48;
    camera.centerX = 0.5;
    camera.centerY = 0.5;
    renderer.render(world, camera, context, viewport, {
      terrain: false,
      resources: false,
      buildings: false,
      agents: false,
      stockpile: true
    });
    expect(calls.fillRect + calls.fill).toBe(1);
    expect(world).toEqual(before);
  });

  it("draws the selected starting-area marker only when one is provided", () => {
    const world = createWorld(42, { width: 16, height: 16 });
    const calls = { arc: 0 };
    const context = {
      canvas: { width: 96, height: 96 },
      save() {},
      restore() {},
      setTransform() {},
      translate() {},
      scale() {},
      clearRect() {},
      fillRect() {},
      beginPath() {},
      closePath() {},
      moveTo() {},
      lineTo() {},
      arc() { calls.arc += 1; },
      ellipse() {},
      fill() {},
      stroke() {},
      strokeRect() {},
      fillText() {},
      setLineDash() {}
    } as unknown as CanvasRenderingContext2D;
    const camera = createCamera(world.width, world.height, 6);
    const viewport = { width: 96, height: 96 };
    const renderer = new CanvasWorldRenderer();

    renderer.render(world, camera, context, viewport, {
      terrain: false,
      resources: false,
      buildings: false,
      agents: false,
      stockpile: false,
      startingPoint: { x: 8, y: 8 }
    });
    expect(calls.arc).toBeGreaterThan(0);

    calls.arc = 0;
    renderer.render(world, camera, context, viewport, {
      terrain: false,
      resources: false,
      buildings: false,
      agents: false,
      stockpile: false
    });
    expect(calls.arc).toBe(0);
  });


  it("shows remaining resource quantities only when the resource-density layer is enabled", () => {
    const world = createWorld(42, { width: 16, height: 16 });
    world.resources = [{
      id: "visible-food",
      kind: "wild_food",
      x: 8,
      y: 8,
      quantity: 3,
      maxQuantity: 4,
      regrowEveryTicks: 240
    }];
    const calls = { fillRect: 0 };
    const context = {
      canvas: { width: 96, height: 96 },
      save() {}, restore() {}, setTransform() {}, translate() {}, scale() {},
      clearRect() {},
      fillRect() { calls.fillRect += 1; },
      beginPath() {}, closePath() {}, moveTo() {}, lineTo() {}, arc() {},
      ellipse() {}, fill() {}, stroke() {}, strokeRect() {}, fillText() {},
      setLineDash() {}
    } as unknown as CanvasRenderingContext2D;
    const camera = createCamera(world.width, world.height, 6);
    const renderer = new CanvasWorldRenderer();

    renderer.render(world, camera, context, { width: 96, height: 96 }, {
      terrain: false, resources: false, agents: false, buildings: false,
      stockpile: false, resourceDensity: true
    });
    expect(calls.fillRect).toBeGreaterThan(1);

    calls.fillRect = 0;
    renderer.render(world, camera, context, { width: 96, height: 96 }, {
      terrain: false, resources: false, agents: false, buildings: false,
      stockpile: false, resourceDensity: false
    });
    expect(calls.fillRect).toBe(1);
  });

  it("shows the current activity of inhabitants only when the activity layer is enabled", () => {
    const world = createWorld(42, { width: 16, height: 16 });
    world.agents.push({
      id: "worker",
      name: "Kemi",
      ageYears: 24,
      x: 8,
      y: 8,
      traits: { curiosity: 0.5, diligence: 0.5, sociability: 0.5 },
      needs: { hunger: 20, thirst: 20, energy: 100, health: 100 },
      inventory: { food: 0, fish: 0, wood: 0, stone: 0 },
      role: "hauler",
      currentGoal: "gather_wood",
      perceptionRadius: 12,
      alive: true,
      homeId: null,
      buildingId: null
    });
    const calls = { arc: 0 };
    const context = {
      canvas: { width: 96, height: 96 },
      save() {}, restore() {}, setTransform() {}, translate() {}, scale() {},
      clearRect() {}, fillRect() {}, beginPath() {}, closePath() {},
      moveTo() {}, lineTo() {}, arc() { calls.arc += 1; }, ellipse() {},
      fill() {}, stroke() {}, strokeRect() {}, fillText() {}, setLineDash() {}
    } as unknown as CanvasRenderingContext2D;
    const camera = createCamera(world.width, world.height, 6);
    const renderer = new CanvasWorldRenderer();

    renderer.render(world, camera, context, { width: 96, height: 96 }, {
      terrain: false, resources: false, agents: false, buildings: false,
      stockpile: false, activities: true
    });
    expect(calls.arc).toBeGreaterThan(0);

    calls.arc = 0;
    renderer.render(world, camera, context, { width: 96, height: 96 }, {
      terrain: false, resources: false, agents: false, buildings: false,
      stockpile: false, activities: false
    });
    expect(calls.arc).toBe(0);
  });
});
