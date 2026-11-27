import type {
  BuildingMaterial,
  MaterialBundle,
  WorldState
} from "./types";

function getWholeUnits(amount: number): number {
  if (!Number.isFinite(amount) || amount <= 0) return 0;
  return Math.floor(amount);
}

/** Move as many whole units as fit from an agent or other carrier into shared storage. */
export function depositToStockpile(
  world: WorldState,
  kind: BuildingMaterial,
  amount: number
): number {
  const requested = getWholeUnits(amount);
  if (requested === 0) return 0;

  const availableCapacity = Math.max(
    0,
    world.stockpile.capacityPerResource - world.stockpile.inventory[kind]
  );
  const deposited = Math.min(requested, availableCapacity);
  world.stockpile.inventory[kind] += deposited;
  return deposited;
}

/** Withdraw up to the requested number of whole units from shared storage. */
export function withdrawFromStockpile(
  world: WorldState,
  kind: BuildingMaterial,
  amount: number
): number {
  const requested = getWholeUnits(amount);
  if (requested === 0) return 0;

  const withdrawn = Math.min(requested, Math.max(0, world.stockpile.inventory[kind]));
  world.stockpile.inventory[kind] -= withdrawn;
  return withdrawn;
}

/** Withdraw a complete bundle or leave the stockpile unchanged. */
export function withdrawMaterialBundle(
  world: WorldState,
  bundle: MaterialBundle
): boolean {
  if (
    !Number.isSafeInteger(bundle.wood) ||
    !Number.isSafeInteger(bundle.stone) ||
    bundle.wood < 0 ||
    bundle.stone < 0
  ) {
    return false;
  }

  const inventory = world.stockpile.inventory;
  if (inventory.wood < bundle.wood || inventory.stone < bundle.stone) {
    return false;
  }

  inventory.wood -= bundle.wood;
  inventory.stone -= bundle.stone;
  return true;
}
