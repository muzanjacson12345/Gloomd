import { describe, expect, it } from "vitest";
import {
  depositToStockpile,
  depositFoodToStockpile,
  withdrawFoodFromStockpile,
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
    world.stockpile.inventory = { wood: 4, stone: 2, food: 0, fish: 0 };

    expect(withdrawFromStockpile(world, "wood", 3)).toBe(3);
    expect(withdrawFromStockpile(world, "stone", 20)).toBe(2);
    expect(world.stockpile.inventory).toEqual({ wood: 1, stone: 0, food: 0, fish: 0 });
    expect(withdrawFromStockpile(world, "wood", -2)).toBe(0);
    expect(withdrawFromStockpile(world, "wood", Number.NaN)).toBe(0);
    expect(withdrawFromStockpile(world, "wood", 0)).toBe(0);
    expect(world.stockpile.inventory.wood).toBe(1);
  });

  it("rejects an incomplete material bundle without withdrawing any part", () => {
    const world = createWorld(16, { width: 16, height: 16 });
    world.stockpile.inventory = { wood: 5, stone: 1, food: 0, fish: 0 };

    expect(withdrawMaterialBundle(world, { wood: 5, stone: 2 })).toBe(false);
    expect(world.stockpile.inventory).toEqual({ wood: 5, stone: 1, food: 0, fish: 0 });
  });

  it("withdraws a complete material bundle atomically", () => {
    const world = createWorld(17, { width: 16, height: 16 });
    world.stockpile.inventory = { wood: 7, stone: 4, food: 0, fish: 0 };

    expect(withdrawMaterialBundle(world, { wood: 5, stone: 2 })).toBe(true);
    expect(world.stockpile.inventory).toEqual({ wood: 2, stone: 2, food: 0, fish: 0 });
  });

  it("rejects invalid bundle amounts without mutation", () => {
    const world = createWorld(18, { width: 16, height: 16 });
    world.stockpile.inventory = { wood: 7, stone: 4 };

    expect(withdrawMaterialBundle(world, { wood: 1.5, stone: 2 })).toBe(false);
    expect(withdrawMaterialBundle(world, { wood: -1, stone: 2 })).toBe(false);
    expect(world.stockpile.inventory).toEqual({ wood: 7, stone: 4, food: 0, fish: 0 });
  });

  it("stores food and fish separately and respects each resource capacity", () => {
    const world = createWorld(19, { width: 16, height: 16 });
    world.stockpile.inventory.food = 119;

    expect(depositFoodToStockpile(world, "food", 5)).toBe(1);
    expect(depositFoodToStockpile(world, "fish", 3)).toBe(3);
    expect(world.stockpile.inventory).toMatchObject({ food: 120, fish: 3 });
    expect(withdrawFoodFromStockpile(world, "food", 20)).toBe(20);
    expect(withdrawFoodFromStockpile(world, "fish", 8)).toBe(3);
    expect(world.stockpile.inventory).toMatchObject({ food: 100, fish: 0 });
    expect(withdrawFoodFromStockpile(world, "fish", -1)).toBe(0);
    expect(depositFoodToStockpile(world, "food", Number.NaN)).toBe(0);
    expect(world.stockpile.inventory.food).toBe(100);
  });
});
