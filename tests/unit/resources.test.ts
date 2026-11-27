import { describe, expect, it } from "vitest";

describe("world resource accounting", () => {
  it("reduces a resource node by exactly the amount taken", async () => {
    const worldPath = "../../src/core/world-generation.ts";
    const resourcePath = "../../src/core/resources.ts";
    const [worldModule, resourceModule] = await Promise.all([
      import(/* @vite-ignore */ worldPath).catch(() => null),
      import(/* @vite-ignore */ resourcePath).catch(() => null)
    ]);

    expect(typeof worldModule?.createWorld).toBe("function");
    expect(typeof resourceModule?.takeResource).toBe("function");
    if (typeof worldModule?.createWorld !== "function" || typeof resourceModule?.takeResource !== "function") return;

    const world = worldModule.createWorld(42);
    const node = world.resources[0];
    expect(node).toBeDefined();
    if (!node) return;

    const before = node.quantity;
    const taken = resourceModule.takeResource(world, node.id, 1);

    expect(taken).toBe(1);
    expect(node.quantity).toBe(before - 1);
  });

  it("never removes more than the node contains or allows negative quantities", async () => {
    const worldPath = "../../src/core/world-generation.ts";
    const resourcePath = "../../src/core/resources.ts";
    const [worldModule, resourceModule] = await Promise.all([
      import(/* @vite-ignore */ worldPath).catch(() => null),
      import(/* @vite-ignore */ resourcePath).catch(() => null)
    ]);

    expect(typeof worldModule?.createWorld).toBe("function");
    expect(typeof resourceModule?.takeResource).toBe("function");
    if (typeof worldModule?.createWorld !== "function" || typeof resourceModule?.takeResource !== "function") return;

    const world = worldModule.createWorld(42);
    const node = world.resources[0];
    expect(node).toBeDefined();
    if (!node) return;

    const available = node.quantity;
    const taken = resourceModule.takeResource(world, node.id, available + 100);

    expect(taken).toBe(available);
    expect(node.quantity).toBe(0);
    expect(node.quantity).toBeGreaterThanOrEqual(0);
  });

  it("returns zero for missing resources and invalid requests", async () => {
    const worldPath = "../../src/core/world-generation.ts";
    const resourcePath = "../../src/core/resources.ts";
    const [worldModule, resourceModule] = await Promise.all([
      import(/* @vite-ignore */ worldPath).catch(() => null),
      import(/* @vite-ignore */ resourcePath).catch(() => null)
    ]);

    expect(typeof worldModule?.createWorld).toBe("function");
    expect(typeof resourceModule?.takeResource).toBe("function");
    if (typeof worldModule?.createWorld !== "function" || typeof resourceModule?.takeResource !== "function") return;

    const world = worldModule.createWorld(42);
    expect(resourceModule.takeResource(world, "missing-node", 1)).toBe(0);
    const node = world.resources[0];
    expect(node).toBeDefined();
    if (!node) return;
    const before = node.quantity;
    expect(resourceModule.takeResource(world, node.id, -1)).toBe(0);
    expect(resourceModule.takeResource(world, node.id, 0)).toBe(0);
    expect(node.quantity).toBe(before);
  });
});
