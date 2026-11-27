# GLOOMD First Playable World Implementation Plan

> **For agentic workers:** Implement this plan task-by-task using the repository's GitHub integration and the available GitHub Actions runner. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the empty repository with the first genuinely playable GLOOMD world: a full-window, minimalist top-down map containing a procedurally generated landscape and autonomous inhabitants whose needs, movement and food actions cause real changes to the world.

**Architecture:** Keep the simulation as pure, deterministic TypeScript state and rules, independent from the Canvas 2D renderer and interface. The browser renders only what is visible, while fixed simulation steps update agents and resources. Start with a coherent small population and a real foraging/eating loop; expand to social systems, civilization, persistence and offline support in later plans.

**Tech Stack:** TypeScript, Vite, native Canvas 2D, Vitest, GitHub Actions and GitHub Pages. No runtime framework, remote assets, server or paid API.

**Spec:** `docs/superpowers/specs/2026-11-27-gloomd-living-world-design.md`

## Global Constraints

- A full-window, top-down 2D world map is the primary experience; the map remains visible and dominant.
- The new application is a clean rebuild. Do not reuse the rejected prototype's interface, CSS, JavaScript simulation, or visual layout.
- Use simple custom sprites/shapes and subtle terrain variation; no elaborate 3D, heavy lighting, decorative animation, enormous UI cards, or dashboard-first layout.
- The simulation engine is authoritative. Rendering and UI only display its state.
- Actions must alter the authoritative world state: gathering reduces resource nodes and adds inventory; eating consumes food and changes hunger.
- The simulation runs locally in the user's browser. No continuously running server, cloud simulation, external AI API or paid service is required.
- The simulation runs only while the app is open and visible/active. When closed or hidden, simulation time pauses.
- Rendering and simulation use separate clocks: rendering follows the browser animation frame; simulation advances in controlled fixed steps and speed settings.
- Build for a modest PC: visible-area rendering, simple sprites, spatial lookup for nearby agents/resources, and detail levels based on zoom.
- First population target: approximately 30–50 agents. Increase only after actual performance measurements.
- All runtime assets are bundled with the app; do not depend on remote images, fonts or services for normal play.
- The repository is public. Do not enable paid services, larger paid runners, paid APIs, cloud servers or billing-dependent features.
- Develop directly on `main`, as explicitly requested. Create separate branches only for a named experiment or a saved implementation that needs protection.

## Review Focus

- An impossible or isolated food target: agents must not walk through water/obstacles or claim to have collected food they cannot reach.
- A depleted food node: multiple agents must not consume more units than exist, and inventory totals must remain non-negative.
- A world generated from the same seed: terrain, resources and initial agent placement must be reproducible.
- A browser tab becoming hidden or the simulation being paused: simulation ticks must stop; returning must not cause a burst of catch-up ticks.
- A tiny viewport, high-DPI display or extreme zoom: camera math and drawing must stay correct without allocating an unbounded canvas or attempting to draw the entire world every frame.

---

### Task 1: Establish the new application and automated checks

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `vite.config.ts`
- Create: `vitest.config.ts`
- Create: `.gitignore`
- Create: `index.html`
- Create: `src/main.ts`
- Create: `src/app/version.ts`
- Create: `tests/unit/version.test.ts`
- Create: `.github/workflows/ci.yml`

**Interfaces:**
- Produces: Vite development/build scripts; `npm run typecheck`, `npm run test`, and `npm run build`; browser entry point `src/main.ts`.
- CI must run install, typecheck, tests and production build for pushes to `main` and pull requests.

- [x] **Step 1: Add the project manifest and strict TypeScript configuration**

  Add Vite, TypeScript and Vitest as development dependencies, pin compatible stable versions in `package.json`, and define scripts `dev`, `typecheck`, `test`, and `build`. Configure strict TypeScript checking with browser DOM types and ES module output.

- [x] **Step 2: Add the smallest app entry point and a version test**

  Add `APP_VERSION = "0.1.0"` in `src/app/version.ts`, import it from `src/main.ts`, and test its exported value in `tests/unit/version.test.ts`.

- [x] **Step 3: Configure Vite for the repository's GitHub Pages address**

  Set the Vite public base path to `/Gloomd/`. The app must work both in Vite preview and under the repository subpath on GitHub Pages.

- [x] **Step 4: Run the initial checks in GitHub Actions**

  Add `.github/workflows/ci.yml` using a standard GitHub-hosted runner and Node LTS. Run dependency installation, `npm run typecheck`, `npm run test`, and `npm run build`.

  Expected: all four commands complete successfully on a clean runner.

- [x] **Step 5: Commit the project foundation**

  Commit the manifest, configuration, starter page, version test and CI workflow to `main`.

### Task 2: Build a reproducible world model

**Files:**
- Create: `src/core/types.ts`
- Create: `src/core/random.ts`
- Create: `src/core/world-generation.ts`
- Create: `src/core/resources.ts`
- Test: `tests/unit/random.test.ts`
- Test: `tests/unit/world-generation.test.ts`
- Test: `tests/unit/resources.test.ts`

**Interfaces:**
- Produces: `WorldState`, `Tile`, `ResourceNode`, `Agent`, `WorldEvent`, `GridPoint`.
- Produces: `createRandom(seed: number): RandomSource`, with `next(): number` and `int(min: number, max: number): number`.
- Produces: `createWorld(seed: number, options?: WorldOptions): WorldState`.
- Produces: `getTile(world: WorldState, x: number, y: number): Tile | undefined` and `isWalkable(world: WorldState, x: number, y: number): boolean`.
- Produces: `takeResource(world: WorldState, resourceId: string, amount: number): number`.

- [x] **Step 1: Write failing tests for seeded randomness and world generation**

  Test that two random sources with seed `12345` produce the same first 10 values. Test that two calls to `createWorld(12345)` produce identical terrain/resource data, that out-of-bounds tile lookup returns `undefined`, and that water/mountain tiles are not walkable.

- [x] **Step 2: Run the tests and confirm they fail**

  Run: `npm run test -- tests/unit/random.test.ts tests/unit/world-generation.test.ts`

  Expected: FAIL because the random and world-generation modules do not exist yet.

- [x] **Step 3: Implement deterministic random and world generation**

  Implement a seedable pseudo-random generator and a default map of 128 × 96 tiles. Generate readable coastlines, at least one river or lake, grassland, forest, hills and mountains. Generate a controlled distribution of edible resource patches. Store the seed and all generated data in plain serializable values.

- [x] **Step 4: Write and run resource-accounting tests**

  Test that taking an available amount reduces the resource quantity by exactly that amount, taking more than remains never returns more than remains, and quantities never become negative.

  Run: `npm run test -- tests/unit/random.test.ts tests/unit/world-generation.test.ts tests/unit/resources.test.ts`

  Expected: all tests PASS.

- [x] **Step 5: Commit the deterministic world model**

  Commit the core types, seeded generator, map generation, resource accounting and tests.

### Task 3: Implement reachable movement and consequential agent actions

**Files:**
- Create: `src/core/pathfinding.ts`
- Create: `src/core/agents.ts`
- Create: `src/core/simulation.ts`
- Test: `tests/unit/pathfinding.test.ts`
- Test: `tests/unit/simulation.test.ts`

**Interfaces:**
- Consumes: Task 2 `WorldState`, `GridPoint`, `isWalkable`, `RandomSource`, and `takeResource`.
- Produces: `findPath(world: WorldState, start: GridPoint, goal: GridPoint): GridPoint[] | null`.
- Produces: `createStarterAgents(world: WorldState, count: number): Agent[]`.
- Produces: `stepWorld(world: WorldState, ticks?: number): WorldEvent[]`.
- An `Agent` has a stable ID/name, age, location, basic personality/traits, health, hunger, energy, a small inventory and a current action/goal. Initial agents use a population of 30.

- [x] **Step 1: Write failing pathfinding tests**

  Test a reachable path, an unreachable target, an out-of-bounds target, and a route around a wall of impassable tiles. Assert no returned step is impassable and the path ends at the requested target.

- [x] **Step 2: Run the pathfinding tests and confirm they fail**

  Run: `npm run test -- tests/unit/pathfinding.test.ts`

  Expected: FAIL because `findPath` is not implemented.

- [x] **Step 3: Implement deterministic grid pathfinding**

  Implement A* on the four-way tile grid with a consistent tie-break order. Return `null` when no route exists; do not move agents through blocked tiles.

- [x] **Step 4: Write failing tests for agent spawning and real food actions**

  Test that starter agents spawn only on walkable, unoccupied tiles; a hungry agent can travel to reachable food; gathering reduces the node and increases carried food by the same amount; eating consumes carried food and reduces hunger; and two agents cannot consume more than a node contains.

- [x] **Step 5: Run the simulation tests and confirm they fail**

  Run: `npm run test -- tests/unit/simulation.test.ts`

  Expected: FAIL because agent creation and tick progression are not implemented.

- [x] **Step 6: Implement the first real agent decision loop**

  Create 30 agents from the world seed. Each fixed simulation tick updates needs and chooses a sensible action (seek reachable food, gather, eat, rest or explore). Every completed action updates world state and emits a truthful event. All randomness comes from the world's seeded random source. No LLM/API calls.

- [x] **Step 7: Run all core tests**

  Run: `npm run typecheck && npm run test`

  Expected: typecheck and all random, world, resource, pathfinding and simulation tests PASS.

- [x] **Step 8: Commit the first autonomous population**

  Commit agents, pathfinding, simulation rules and tests.

### Task 4: Render the world with a map-first Canvas camera

**Files:**
- Create: `src/render/camera.ts`
- Create: `src/render/geometry.ts`
- Create: `src/render/canvas-renderer.ts`
- Test: `tests/unit/camera.test.ts`
- Test: `tests/unit/geometry.test.ts`

**Interfaces:**
- Consumes: Task 2 `WorldState` and Task 3 `Agent` state.
- Produces: `Camera`, `screenToWorld(camera, point)`, `worldToScreen(camera, point)`, `zoomAt(camera, screenPoint, factor)`, and `getVisibleWorldBounds(camera, viewport)`.
- Produces: `CanvasWorldRenderer.render(world, camera, context, viewport, layers): void`. The renderer is read-only and cannot mutate simulation state.

- [x] **Step 1: Write failing camera and visible-bounds tests**

  Test world/screen coordinate round-trips, zoom anchored under the pointer, pan offsets, and visible bounds clamped to the map.

- [x] **Step 2: Run the camera tests and confirm they fail**

  Run: `npm run test -- tests/unit/camera.test.ts tests/unit/geometry.test.ts`

  Expected: FAIL because camera and geometry functions do not exist.

- [x] **Step 3: Implement camera math and culling bounds**

  Keep camera state independent of rendering. Clamp extreme zoom, support high-DPI resizing, and compute the visible world rectangle before drawing.

- [x] **Step 4: Implement Canvas 2D rendering**

  Draw terrain, water/coast, rivers, vegetation, resource patches and small agent sprites. Use a restrained map palette and clear silhouettes. Draw the visible region plus a small margin, not every map tile. Reduce object detail when zoomed out. Never issue simulation actions from rendering code.

- [x] **Step 5: Run the rendering-utility tests and full checks**

  Run: `npm run typecheck && npm run test && npm run build`

  Expected: all tests PASS and Vite creates a production build.

- [x] **Step 6: Commit the map renderer**

  Commit camera, geometry, renderer and tests.

### Task 5: Add the compact observer interface and connect the playable loop

**Files:**
- Create: `src/ui/app-shell.ts`
- Create: `src/ui/hud.ts`
- Create: `src/ui/agent-inspector.ts`
- Create: `src/ui/event-log.ts`
- Create: `src/ui/map-input.ts`
- Create: `src/app/app.ts`
- Create: `src/styles.css`
- Modify: `index.html`, `src/main.ts`
- Test: `tests/unit/visibility-pause.test.ts`

**Interfaces:**
- Consumes: `createWorld`, `createStarterAgents`, `stepWorld`, `CanvasWorldRenderer.render`, and camera functions from earlier tasks.
- Produces: `startApp(root: HTMLElement): void`.
- UI state includes selected agent ID, camera state, play/pause, simulation speed and visible map layers.
- The HUD shows world time, living population and a few relevant resource totals without covering the map.

- [ ] **Step 1: Write a failing test for pause/visibility timing**

  Test that a paused or hidden app does not advance simulation ticks, and that returning from a hidden state does not apply offline catch-up ticks.

- [ ] **Step 2: Run the timing test and confirm it fails**

  Run: `npm run test -- tests/unit/visibility-pause.test.ts`

  Expected: FAIL because the app clock controller is not implemented.

- [ ] **Step 3: Implement the fixed-step simulation clock**

  Separate rendering frames from simulation ticks. Pause on document visibility loss; resume without catch-up. Provide pause/resume and a small set of speed controls. Prevent multiple overlapping timers.

- [ ] **Step 4: Build the full-screen observer UI**

  Keep the map full-window. Add compact top indicators, unobtrusive playback controls, zoom controls, map-layer toggles, a small agent inspector overlay and a compact event feed. Clicking an agent selects it; closing the inspector leaves the map visible. No large permanent sidebar.

- [ ] **Step 5: Connect app startup and verify real UI wiring**

  Initialize a seeded world and 30 agents, draw the map, start/stop fixed simulation ticks, and refresh indicators from authoritative state. Ensure the app remains usable on small screens and with keyboard focus.

- [ ] **Step 6: Run all checks and commit the observer interface**

  Run: `npm run typecheck && npm run test && npm run build`

  Expected: all tests PASS and production build succeeds. Commit the app shell, UI and integration.

### Task 6: Publish the new build through GitHub Pages

**Files:**
- Create: `.github/workflows/deploy.yml`
- Modify: `README.md`

**Interfaces:**
- Consumes: successful Task 1 CI and Vite production output in `dist/`.
- Produces: a static GitHub Pages deployment at `https://muzanjacson12345.github.io/Gloomd/`.

- [x] **Step 1: Add the Pages deployment workflow**

  Deploy only after CI succeeds for pushes to `main`. Use standard GitHub-hosted runners, Node LTS, install dependencies, run typecheck/tests/build, upload only `dist/`, and deploy with the official Pages actions. Grant only `contents: read`, `pages: write` and `id-token: write`. Do not use paid runners or external hosting.

- [x] **Step 2: Document how to run and publish the app**

  Document that the simulation runs locally in the browser, Pages only serves static files, and no paid API/server is used. Include the live URL, controls, and current implemented-versus-planned features.

- [x] **Step 3: Commit the deployment workflow and documentation**

  Commit to `main`. If GitHub Pages still has its source set to branch deployment, change it once to **GitHub Actions** in repository Settings → Pages before expecting the workflow to publish the Vite build.

- [x] **Step 4: Verify the deployment from GitHub Actions**

  Inspect the actual workflow run and job results. Expected: CI succeeds, the Pages deploy job succeeds, and the published page loads at the stated URL. Do not call the deployment complete based only on a commit or workflow being created.

## Later plans (not part of this first playable milestone)

The following requirements remain part of the approved design and are not dropped. They will receive their own focused implementation plans after the first playable world is verified:

1. Richer needs, occupations, skills, routines and production chains.
2. Personal memory, perception, relationships, families, communication and shared knowledge.
3. Settlement growth, storage, trade, migration, governance, conflict, technology and culture.
4. IndexedDB autosave, explicit save/load, portable export/import and versioned migrations.
5. Offline-first PWA caching, safe app updates and installability.
6. Performance benchmarks on the user's actual PC and evidence-based scaling beyond the initial 30-agent population.

## Execution notes

- Work directly on `main`, as the user explicitly requested. Do not create a feature branch for this ordinary rebuild.
- Keep the previously committed design and this plan in Git history. The removed prototype source files are not to be restored.
- Work through each task in order. Use test-first development for simulation, geometry, timing and other pure logic.
- Use GitHub Actions as the remote test/build environment. Do not claim commands passed until their fresh workflow output has been inspected.
- Use a frequent, task-sized commit after each verified task.
- The first deliverable is a playable, visually coherent world with real resource consequences—not a static mockup or a claim that the later civilization systems already exist.


## Interface details and implementation rulings

These details make the contracts above unambiguous for the implementer:

- `WorldState` contains `seed: number`, `randomState: number`, `width: number`, `height: number`, `tiles: Tile[][]`, `resources: ResourceNode[]`, `agents: Agent[]`, `tick: number`, and `events: WorldEvent[]`.
- `Tile` contains `terrain: "water" | "beach" | "grassland" | "forest" | "hill" | "mountain" | "river"`, `elevation: number`, `moisture: number`, and `walkable: boolean`. Terrain rendering reads these values; walkability is authoritative for movement.
- `ResourceNode` contains `id: string`, `kind: "wild_food" | "wood" | "stone"`, `x: number`, `y: number`, `quantity: number`, `maxQuantity: number`, and `regrowEveryTicks: number | null`.
- `Agent` contains `id`, `name`, `ageYears`, `x`, `y`, `traits`, `needs: { hunger: number; thirst: number; energy: number; health: number }`, `inventory: { food: number; wood: number; stone: number }`, `role: "forager"`, `currentGoal: "seek_food" | "gather" | "eat" | "rest" | "explore"`, `perceptionRadius: number`, and `alive: boolean`. Need values are bounded 0–100; hunger and thirst rise with time, while energy falls with exertion and recovers through rest.
- `WorldEvent` contains `id: string`, `tick: number`, `agentId: string | null`, `kind: string`, and `message: string`. Event messages are added only when the corresponding state change actually occurs.
- `RandomSource` exposes `next(): number` and `int(min: number, max: number): number`. `WorldState.randomState` is updated after generation and each simulation tick so that the evolving world is serializable and reproducible.
- `WorldOptions` permits optional width and height for tests; defaults are exactly 128 × 96. Reject dimensions below 16 or above 512 to prevent accidental oversized allocations in this first version.
- A* paths exclude the start tile and include the goal tile. Agents inspect only resources within their `perceptionRadius` (initially 12 tiles); they cannot select a resource they have not perceived. If no food is perceived, they explore rather than receiving omniscient map knowledge.
- The first renderer draws simple, readable miniature character silhouettes (head/body/legs and restrained role colors), not plain colored dots. At distant zoom levels, use compact population clusters/counts. The selected agent has a restrained outline.
- `Camera` stores world-space camera position and zoom; coordinate conversion is tested in both directions. `getVisibleWorldBounds` returns `{ left, top, right, bottom }` in tile coordinates, clamped to the world.
- `FixedStepClock.advance(elapsedMs: number, canAdvance: boolean, onTick: () => void): number` runs bounded fixed steps and returns the number executed. When `canAdvance` is false it clears accumulated time. The app resets its previous-frame timestamp on visibility loss, so the first frame after returning does not advance time.
- The first milestone contains only real map layers that exist: terrain, resources and agents. Do not add inert toggles for future roads, settlements or territories.
- The GitHub Pages path is `/Gloomd/`. The deployment workflow uses GitHub Actions Pages deployment; the repository Pages source may need the one-time setting changed to **GitHub Actions** in Settings → Pages. The deployment workflow must wait for successful checks and publish only the Vite `dist/` output.
- CI and deployment use standard GitHub-hosted runners only. The workflows use `npm install --no-audit --no-fund` for the initial dependency install; package versions in `package.json` are pinned to exact versions. Commit a generated npm lockfile once it can be generated and verified by the remote build workflow.



## Review-focus test mapping (checked during plan self-review)

- **Unreachable food / impassable terrain:** Task 3's simulation tests must include a food node isolated by water and assert the agent does not move through it, gather from it, or emit a successful gathering event.
- **Resource exhaustion / competing agents:** Task 2's resource tests and Task 3's two-agent simulation test assert that the total amount consumed never exceeds the node quantity and no inventory/resource value becomes negative.
- **Same seed / reproducibility:** Task 2 tests compare terrain, resources and the initial random state for two worlds created from the same seed.
- **Hidden tab / pause:** Task 5 tests advance the fixed-step clock, mark it paused/hidden for a long elapsed interval, resume, and assert there is no accumulated-time burst.
- **Small viewport / high DPI / zoom limits:** Task 4 tests camera coordinate conversion and visible bounds at a 320 × 568 viewport and a 3840 × 2160 viewport, and assert zoom remains within configured limits. Canvas backing resolution must cap device-pixel ratio at 2.



## First-milestone need loop clarification

The first playable slice must make both hunger and thirst meaningful rather than showing a thirst meter that has no supporting action:

- Extend `Tile` with `waterKind: "none" | "ocean" | "freshwater"`. Both rivers and lakes are freshwater but remain impassable; ocean is impassable and not drinkable.
- Extend `Agent.currentGoal` with `"seek_water" | "drink"`. Thirst is checked before hunger when it crosses 65. An agent seeks a reachable walkable bank tile adjacent to freshwater within its perception radius, then drinks there to reduce thirst. If no freshwater is perceived, it explores.
- Add Task 2 tests proving the generated world includes freshwater and ocean classifications, and that only freshwater is valid for the drink-site search.
- Add Task 3 tests proving an agent can reach a drink site without entering water, drinking reduces thirst, and an isolated freshwater target does not cause a false successful drink event.
- Use thresholds consistently: need values are 0–100; hunger and thirst rise by 1 per simulation tick; at 65 an agent seeks the relevant resource; a successful food action reduces hunger by 35; a successful drink action reduces thirst by 45. Rest increases energy by 20. These are tuning constants, not permanent design limits.

