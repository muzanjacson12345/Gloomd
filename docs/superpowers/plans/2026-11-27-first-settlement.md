# First Settlement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Make a small builder population gather real resources and construct visible, usable-as-home shelters.

**Architecture:** Extend the authoritative world and agent state with buildings and builder goals. Simulation actions consume map resources and progress a shelter over fixed ticks; pathfinding treats construction sites and completed shelters as blocked. The renderer and compact observer UI display the result without changing the map-first layout.

**Tech Stack:** Existing TypeScript, Vite, native Canvas 2D, Vitest and GitHub Actions. No new dependencies.

**Spec:** `docs/superpowers/specs/2026-11-27-first-settlement-design.md`

## Global Constraints

- Work directly on `main`; do not create a branch for this normal implementation.
- Keep the simulation deterministic and local to the visible browser tab.
- Keep survival needs ahead of building work; no fake completion events.
- A shelter costs exactly 5 wood and 2 stone and requires 12 eligible work ticks.
- One in five starter agents is a builder; each builder completes at most one personal shelter.
- A building tile is blocked for all navigation from the moment a site is placed.
- Resource HUD totals are map-node quantities, not agent inventory totals; label them accordingly.
- No paid service, runtime API, cloud simulation, server, LLM call or new runtime dependency.
- Keep all existing foundation behavior and tests passing.

## Review Focus

- Two builders competing for one depleted resource node must never overdraw it.
- A builder without a valid adjacent site must keep all carried materials.
- Hunger or thirst must interrupt construction without deleting or duplicating a site.
- A site must block A* routes and freshwater-bank BFS immediately, including before completion.
- A building must remain visible only when the Homes layer is enabled and must not mutate simulation state.

---

### Task 1: Add deterministic gathering and shelter construction

**Files:**
- Modify: `src/core/types.ts`
- Modify: `src/core/agents.ts`
- Modify: `src/core/world-generation.ts`
- Modify: `src/core/pathfinding.ts`
- Modify: `src/core/simulation.ts`
- Test: `tests/unit/simulation.test.ts`
- Test: `tests/unit/world-generation.test.ts`
- Test: `tests/unit/pathfinding.test.ts`
- Test: `tests/unit/freshwater-search.test.ts`

**Interfaces:**
- Add `AgentRole = "forager" | "builder"`, `BuildingStatus = "under_construction" | "complete"` and `Building` with `id`, `kind: "shelter"`, `x`, `y`, `status`, `workDone`, `workRequired` and `builderId`.
- Add `WorldState.buildings: Building[]`.
- Add `Agent.homeId: string | null` and `Agent.buildingId: string | null`.
- Extend goals with `gather_wood`, `gather_stone` and `build_shelter`.
- Export `isWalkableTile(world, point)` from `pathfinding.ts`; it checks terrain walkability and excludes every building tile.
- Keep `findPath` and freshwater-bank search on the same building-aware walkability rule.

- [x] **Step 1: Write failing world, role and simulation tests**
  - A new world has an empty `buildings` array.
  - Exactly six of thirty seeded starter agents have the builder role, with deterministic role assignment.
  - A builder can reach and gather five wood and two stone; the source nodes decrease by those exact quantities and carried inventory increases by them.
  - A builder with the required materials creates a neighbouring under-construction shelter, pays the exact cost once, and does not place a site on a resource or occupied tile.
  - After twelve eligible work ticks, the shelter is complete, `homeId` is assigned, `buildingId` is cleared and one completion event is emitted.
  - A builder with insufficient materials or no valid site does not lose inventory.
  - Urgent thirst/hunger can interrupt work; the construction site remains and progress resumes later.

- [x] **Step 2: Run the focused tests and confirm expected failures**
  Run: `npm run test -- tests/unit/simulation.test.ts tests/unit/world-generation.test.ts`
  Expected: fail because world buildings, builder roles, gathering and construction are not implemented.

- [x] **Step 3: Implement the world and agent types**
  Add the building collection, role/goals and agent home/construction links. Initialise `buildings: []` and deterministically assign every fifth starter agent as a builder.

- [x] **Step 4: Make navigation building-aware**
  Add `isWalkableTile`; update A*, exploration and freshwater-bank BFS to reject construction and completed building tiles. Add a pathfinding regression test proving a route detours around a shelter.

- [x] **Step 5: Implement builder resource gathering**
  Select the nearest reachable wood or stone node within perception, use the existing safe resource-transfer function for one unit, and emit an event only when a unit is actually transferred. Explore when no matching node is reachable.

- [x] **Step 6: Implement shelter placement and work**
  Use costs of 5 wood and 2 stone and 12 work ticks. Place beside the builder in deterministic east/south/west/north order; reject live resource, agent and building tiles. Deduct resources only after a valid site is found. Allow survival actions to interrupt work while retaining the site. Assign the owner home only at completion.

- [x] **Step 7: Run the full core suite and commit**
  Run: `npm run test && npm run typecheck`
  Expected: every existing and new unit test passes under strict TypeScript. Commit the verified domain/simulation change.

### Task 2: Make shelters observable in the map-first interface

**Files:**
- Modify: `src/render/canvas-renderer.ts`
- Modify: `src/app/app.ts`
- Modify: `src/ui/app-shell.ts`
- Modify: `src/ui/hud.ts`
- Modify: `src/ui/agent-inspector.ts`
- Modify: `src/styles.css`
- Modify: `README.md`
- Test: `tests/unit/canvas-renderer.test.ts`

**Interfaces:**
- Add `RenderLayers.buildings?: boolean`; buildings render after resources and before agents.
- Add a `HOMES` layer toggle while preserving the existing `LAND`, `RESOURCES` and `PEOPLE` controls.
- Add a compact completed-home count to the HUD and label world resource totals `IN NATURE`.
- Add a `HOME` field to the agent inspector: `UNDER CONSTRUCTION`, `SHELTER` or `NONE`.

- [x] **Step 1: Write failing renderer tests**
  A visible construction site and completed shelter draw when the Homes layer is enabled; no building draw calls occur when it is disabled; rendering leaves world state unchanged.

- [x] **Step 2: Run renderer tests and confirm expected failures**
  Run: `npm run test -- tests/unit/canvas-renderer.test.ts`
  Expected: fail because the renderer has no building layer.

- [x] **Step 3: Draw construction sites and completed shelters**
  Use simple low-cost Canvas shapes at close zoom and a compact marker at overview zoom. Keep rendering read-only and within visible bounds.

- [x] **Step 4: Connect the layer and information**
  Add the HOMES toggle, count completed shelters, clarify map resource totals and display each selected inhabitant's home/building status.

- [x] **Step 5: Update the README**
  Clearly separate implemented shelter-building behavior from future shared storage, households, farms, trade, long-term memory and saving.

- [x] **Step 6: Run all checks and commit**
  Run: `npm run test && npm run typecheck && npm run build`
  Expected: all tests pass, type-check succeeds and Vite creates the production build.

## Acceptance checklist

- [x] Builders are a deterministic subset of the population.
- [x] Wood and stone gathering has exact resource/inventory accounting.
- [x] A shelter requires and consumes 5 wood + 2 stone.
- [x] Construction takes 12 work ticks and can be interrupted by urgent survival needs.
- [x] Completed shelters have owner/home links and occupy blocked map tiles.
- [x] Homes can be shown/hidden, counted and inspected.
- [x] All tests, strict type-check and production build pass.
