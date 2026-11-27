# Shared Settlement Logistics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make inhabitants deliver real wood and stone to a communal stockpile and let builders pay shelter costs from that shared store.

**Architecture:** Add a deterministic, finite stockpile to world state and centralize exact deposit/withdraw accounting in a small core module. Haulers physically gather and route materials to an access tile beside the stockpile; builders atomically withdraw shelter materials. Pathfinding, rendering and the compact HUD expose the store as a real map location.

**Tech Stack:** Existing TypeScript, Vite, Canvas 2D, Vitest and GitHub Actions. No new dependencies.

**Spec:** `docs/superpowers/specs/2026-11-27-shared-settlement-logistics-design.md`

## Global Constraints

- Work directly on `main`; do not create a branch for this normal implementation.
- The communal stockpile starts empty and stores at most 120 wood and 120 stone.
- Starter population is 30: six builders, six haulers and eighteen foragers.
- Haulers carry one material unit per successful gathering action and physically return to the stockpile before depositing it.
- A shelter consumes exactly 5 wood and 2 stone from the shared stockpile, only after a safe site is found.
- The stockpile tile is blocked for movement and agent spawning.
- Survival needs take priority over hauling and construction.
- Food remains personal; no new dependencies, services, APIs, cloud simulation or paid services.
- Keep all previous tests and first-settlement behavior passing.

## Review Focus

- A nearly full stockpile must accept only its remaining capacity and preserve undelivered materials on the hauler.
- Two builders competing for the last shelter recipe must not both consume the same materials.
- An unreachable stockpile access tile must not cause a false delivery event or resource disappearance.
- The stockpile must not overlap a live resource, water or starter-agent spawn.
- Hidden/disabled rendering layers must not affect stockpile state or shared inventory.

---

### Task 1: Model the physical stockpile and exact transfers

**Files:**
- Create: `src/core/stockpile.ts`
- Create: `tests/unit/stockpile.test.ts`
- Modify: `src/core/types.ts`
- Modify: `src/core/world-generation.ts`
- Modify: `src/core/pathfinding.ts`
- Modify: `src/core/agents.ts`
- Modify: `tests/unit/simulation.test.ts`
- Modify: `tests/unit/pathfinding.test.ts`
- Modify: `tests/unit/world-generation.test.ts`

**Interfaces:**
- Add `Stockpile` with `id`, `x`, `y`, `inventory: { wood, stone }` and `capacityPerResource`.
- Add `WorldState.stockpile: Stockpile`.
- Add `"hauler"` to `AgentRole`; add goals `gather_wood`, `gather_stone` and `deliver_resources` (existing gathering goals are reused).
- Add `depositToStockpile(world, kind, amount): number`, `withdrawFromStockpile(world, kind, amount): number`, and `withdrawMaterialBundle(world, bundle): boolean`.
- Initialise one empty 120-capacity stockpile on a deterministic resource-free walkable tile nearest map centre.
- Exported walkability and A* must treat the stockpile tile as blocked; starter-agent placement must avoid it.

- [ ] **Step 1: Write failing unit tests**
  - Stockpile deposit/withdraw transfer exact integer quantities, return zero for invalid requests, cap partial deposits and never go negative.
  - Material-bundle withdrawal is all-or-nothing: an insufficient wood or stone balance leaves both amounts unchanged.
  - Every new world has one empty stockpile on a walkable tile with no live resource node at its coordinate.
  - Stockpile location is deterministic for a given seed and its tile is blocked by both general walkability and A*.
  - Thirty starter agents contain exactly six builders, six haulers and eighteen foragers; none spawns on the stockpile tile.

- [ ] **Step 2: Run focused tests and confirm expected failures**
  Run: `npm run test -- tests/unit/stockpile.test.ts tests/unit/world-generation.test.ts tests/unit/pathfinding.test.ts tests/unit/simulation.test.ts`
  Expected: fail because the stockpile model, transfer operations and hauler role are not implemented.

- [ ] **Step 3: Add the stockpile model and exact transfer functions**
  Implement the typed stockpile record and the three transfer functions. Validate positive finite quantities, floor partial deposits/withdrawals to whole units, enforce per-resource capacity, and make bundle withdrawal atomic.

- [ ] **Step 4: Initialise and reserve the stockpile tile**
  Select the nearest walkable resource-free tile to the map centre with deterministic row-major tie-breaking. Exclude this tile in world walkability, A*, exploration and starter-agent spawn selection.

- [ ] **Step 5: Verify the focused core tests**
  Run: `npm run test -- tests/unit/stockpile.test.ts tests/unit/world-generation.test.ts tests/unit/pathfinding.test.ts tests/unit/simulation.test.ts`
  Expected: all focused tests pass.

### Task 2: Implement physical hauling and shared construction supply

**Files:**
- Modify: `src/core/simulation.ts`
- Modify: `tests/unit/simulation.test.ts`
- Test: `tests/unit/stockpile.test.ts`

**Interfaces:**
- Haulers use the existing nearest-resource selection and gather one wood/stone unit per action.
- Export no additional public simulation API; all delivery and stockpile access routing remain private implementation details.
- Builders use `withdrawMaterialBundle(world, { wood: 5, stone: 2 })` only after locating a safe shelter site.

- [ ] **Step 1: Write failing simulation tests**
  - A hauler gathers a real wood/stone node, returns by a walkable path to a tile beside the stockpile, deposits the exact amount and ends with the corresponding inventory reduced to zero.
  - A hauler cannot report a delivery while the stockpile is unreachable.
  - A partial-capacity delivery deposits only the accepted amount and keeps the remainder in inventory.
  - Builders create shelters by consuming 5 wood + 2 stone from the stockpile; the builder's personal inventory is not used.
  - A store with fewer than 5 wood or 2 stone cannot start a shelter and loses neither material.
  - When two builders can act sequentially against a store containing only one shelter recipe, exactly one shelter starts and one recipe is consumed.
  - Survival needs interrupt hauling/building without deleting carried materials or a construction site.

- [ ] **Step 2: Run the focused simulation tests and confirm expected failures**
  Run: `npm run test -- tests/unit/simulation.test.ts`
  Expected: fail because haulers do not yet gather/deliver and builders still use personal materials.

- [ ] **Step 3: Add deterministic material selection**
  Choose the material whose committed total (stockpile plus all living agents' carried units) is below the 5:2 shelter recipe ratio. Respect full per-resource capacity.

- [ ] **Step 4: Add stockpile access routing and delivery**
  Route to the nearest reachable adjacent tile in fixed east/south/west/north order. Transfer exact accepted amounts only after arrival; retain any rejected remainder and emit a delivery event only for a non-zero transfer.

- [ ] **Step 5: Switch builders to shared supply**
  Builders wait/explore while the communal store is insufficient. When enough resources and a safe site exist, withdraw the complete bundle once, create the site and preserve the existing 12-work-tick completion flow.

- [ ] **Step 6: Verify the simulation tests**
  Run: `npm run test -- tests/unit/simulation.test.ts tests/unit/stockpile.test.ts`
  Expected: all stockpile and simulation tests pass.

### Task 3: Expose the stockpile on the map and HUD

**Files:**
- Modify: `src/render/canvas-renderer.ts`
- Modify: `src/app/app.ts`
- Modify: `src/ui/app-shell.ts`
- Modify: `src/ui/hud.ts`
- Modify: `src/styles.css`
- Modify: `README.md`
- Modify: `tests/unit/canvas-renderer.test.ts`

**Interfaces:**
- Add `RenderLayers.stockpile?: boolean`; render the visible stockpile after other buildings and before agents.
- Add a separate `STOCKPILE` layer toggle.
- Add a compact HUD readout showing stored wood and stone.

- [ ] **Step 1: Write a failing renderer test**
  The stockpile marker draws when the stockpile layer is enabled, is absent when disabled, respects visible bounds, and rendering does not mutate inventory or world state.

- [ ] **Step 2: Run the renderer test and confirm the expected failure**
  Run: `npm run test -- tests/unit/canvas-renderer.test.ts`
  Expected: fail because the renderer has no stockpile layer.

- [ ] **Step 3: Draw the stockpile**
  Add a low-cost crate/storehouse marker with a compact overview marker and a more detailed close-zoom shape, culled to visible bounds.

- [ ] **Step 4: Connect the layer, HUD and documentation**
  Add the STOCKPILE layer control, show stored W/S totals separately from IN NATURE resources, and document the hauler/building loop and its limits.

- [ ] **Step 5: Run all checks and commit**
  Run: `npm run test && npm run typecheck && npm run build`
  Expected: all tests pass, strict type-check succeeds and Vite creates the production build.

## Acceptance checklist

- [ ] New worlds have an empty, visible, walkable-location stockpile with 120 wood/stone capacity each.
- [ ] Six deterministic haulers physically deliver gathered wood/stone and exact accounting is maintained.
- [ ] The stockpile tile cannot be walked through or used as an agent spawn.
- [ ] Builders withdraw the exact shelter recipe atomically from shared inventory.
- [ ] Capacity limits and competing builders cannot create, lose or duplicate materials.
- [ ] Survival can interrupt logistics without losing carried resources or construction progress.
- [ ] STOCKPILE map visibility and HUD totals are connected.
- [ ] All tests, type-check and production build pass.
