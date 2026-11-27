import { describe, expect, it } from "vitest";
import {
  depositToStockpile,
  withdrawFromStockpile,
  withdrawMaterialBundle
} from "../../src/core/stockpile";
import { createWorld } from "../../src/core/world-generation";

describe("communal stockpile accounting", () => {
  it("deposits whole material units and caps each resource independently", () => {
    const world = createWorld(14, { width: 16, height: 16 });
    world.stockpile.inventory.wood = 118;

    expect(depositToStockpile(world, "wood", 5)).toBe(2);
    expect(world.stockpile.inventory.wood).toBe(120);
    expect(depositToStockpile(world, "stone", 3)).toBe(3);
    expect(world.stockpile.inventory.stone).toBe(3);
  });

  it("withdraws only available whole units and never allows a negative balance", () => {
    const world = createWorld(15, { width: 16, height: 16 });
    world.stockpile.inventory = { wood: 4, stone: 2 };

    expect(withdrawFromStockpile(world, "wood", 3)).toBe(3);
    expect(withdrawFromStockpile(world, "stone", 20)).toBe(2);
    expect(world.stockpile.inventory).toEqual({ wood: 1, stone: 0 });
    expect(withdrawFromStockpile(world, "wood", -2)).toBe(0);
    expect(withdrawFromStockpile(world, "wood", Number.NaN)).toBe(0);
    expect(withdrawFromStockpile(world, "wood", 0)).toBe(0);
    expect(world.stockpile.inventory.wood).toBe(1);
  });

  it("rejects an incomplete material bundle without withdrawing any part", () => {
    const world = createWorld(16, { width: 16, height: 16 });
    world.stockpile.inventory = { wood: 5, stone: 1 };

    expect(withdrawMaterialBundle(world, { wood: 5, stone: 2 })).toBe(false);
    expect(world.stockpile.inventory).toEqual({ wood: 5, stone: 1 });
  });

  it("withdraws a complete material bundle atomically", () => {
    const world = createWorld(17, { width: 16, height: 16 });
    world.stockpile.inventory = { wood: 7, stone: 4 };

    expect(withdrawMaterialBundle(world, { wood: 5, stone: 2 })).toBe(true);
    expect(world.stockpile.inventory).toEqual({ wood: 2, stone: 2 });
  });

  it("rejects invalid bundle amounts without mutation", () => {
    const world = createWorld(18, { width: 16, height: 16 });
    world.stockpile.inventory = { wood: 7, stone: 4 };

    expect(withdrawMaterialBundle(world, { wood: 1.5, stone: 2 })).toBe(false);
    expect(withdrawMaterialBundle(world, { wood: -1, stone: 2 })).toBe(false);
    expect(world.stockpile.inventory).toEqual({ wood: 7, stone: 4 });
  });
});
