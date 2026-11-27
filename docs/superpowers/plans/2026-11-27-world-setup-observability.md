# GLOOMD World Setup, Observability and Startup Resilience Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let players create a world with a chosen population and start area, observe every inhabitant's current task, see the settlement at a useful zoom, and receive a clear error instead of an endless startup message.

**Architecture:** Add small pure helpers for spawn selection and activity labels, then a dedicated DOM setup-screen module that reuses the existing Canvas renderer. Refactor app startup to switch between the setup screen and an in-memory running world, and add robust boot diagnostics to the HTML/module entry.

**Tech Stack:** TypeScript, Vite, Canvas 2D, DOM APIs, Vitest, GitHub Actions and GitHub Pages.

**Spec:** `docs/superpowers/specs/2026-11-27-world-setup-observability-design.md`

## Global Constraints

- Work directly on `main`.
- Add no runtime dependencies, servers, paid APIs or remote simulation services.
- Population selector range is 5–30, step 1, default 12.
- Spawn on unique walkable tiles nearest the chosen start point first.
- Keep the simulation local, deterministic per seed, and paused while the page is hidden.
- Keep all map rendering in Canvas 2D and preserve visible-area culling.
- Do not implement persistence or claim that a world survives a reload.

## Review Focus

- Clicking water, mountains, the stockpile, or a map edge must choose a valid walkable starting tile or show a clear unavailable state; it must never spawn agents in blocked tiles.
- Population values at the minimum and maximum must remain valid and produce unique starting tiles.
- A selected start point near a coast or obstacle must not prevent the requested population from spawning; the candidate area expands deterministically when needed.
- Returning from the setup screen must preserve the in-memory active world and simulation state; starting a replacement world must not reuse the old world.
- A missing module, module load error, synchronous startup error, or a page that never reaches ready must not leave the user on an indefinite initializing message.

---

### Task 1: Walkable start-point selection and clustered population

**Files:**
- Modify: `src/core/world-generation.ts`
- Modify: `src/core/agents.ts`
- Modify: `tests/unit/world-generation.test.ts`
- Modify: `tests/unit/simulation.test.ts`

**Interfaces:**
- Produce `findNearestWalkablePoint(world: WorldState, target: GridPoint): GridPoint | null`.
- Produce `createStarterAgents(world: WorldState, count: number, options?: { center?: GridPoint }): Agent[]`.
- When `center` is provided, shuffle a nearby candidate pool (up to four times the requested population, capped by all available tiles), ordered by distance then row-major coordinate. Without a centre, preserve the existing world-wide spawn behavior.

- [x] **Step 1: Add failing tests**
  - Test exact walkable target preference.
  - Test snapping from an impassable target to the nearest walkable tile with stable row-major tie-breaking.
  - Test null when no walkable tile exists.
  - Test that a centred population gets the requested count, distinct IDs and distinct positions, and spawns near the requested centre.

- [x] **Step 2: Verify RED**
  - Run the focused world-generation and simulation tests in CI.
  - Expected: the new helper/API assertions fail because the helper and spawn options are not implemented.

- [x] **Step 3: Implement the helpers**
  - Add deterministic nearest-walkable selection.
  - Add the optional centre to starter-agent creation without changing role assignment or no-centre behavior.

- [x] **Step 4: Verify GREEN**
  - Run the full test suite, typecheck and production build.
  - Expected: all unit tests, strict typecheck and Vite build pass.

- [x] **Step 5: Commit**
  - Commit as `feat: support chosen settlement starting locations`.

### Task 2: Main world-creation screen and settlement-focused camera

**Files:**
- Create: `src/ui/world-setup.ts`
- Modify: `src/app/app.ts`
- Modify: `src/ui/app-shell.ts`
- Modify: `src/render/canvas-renderer.ts`
- Modify: `src/styles.css`
- Test: `tests/unit/world-setup.test.ts`
- Modify: `tests/unit/canvas-renderer.test.ts`

**Interfaces:**
- Population constants: minimum 5, maximum 30, default 12.
- Produce `clampStartingPopulation(value: number): number` for range validation.
- Setup callback returns `{ world: WorldState; population: number; startingPoint: GridPoint }`.
- The same preview world and seed are used when Start is pressed.
- The active world pauses while setup is open; an optional Back action returns to that same world.

- [x] **Step 1: Add failing tests**
  - Test population clamping at 5 and 30, including non-integer inputs.
  - Test a visible start marker in the preview renderer when enabled and no marker when omitted.

- [x] **Step 2: Verify RED**
  - Expected: the population helper and starting-marker behavior are missing.

- [x] **Step 3: Implement the setup module**
  - Render a large terrain preview and click-to-select location.
  - Snap clicks to the nearest walkable location and show resulting map coordinates.
  - Add the 5–30 population slider (default 12), New Terrain and Start World controls.
  - Show a Back to Current World action only when there is an active in-memory world.
  - State clearly that starting a replacement world discards the current unsaved world.

- [x] **Step 4: Wire app lifecycle and camera**
  - Initial load opens setup.
  - Start creates the selected population around the chosen point and focuses the camera at zoom 22.
  - Add a New World action in the live world UI.
  - Reset View returns to the original start area and initial zoom.
  - Back from setup resumes the existing in-memory world.

- [x] **Step 5: Verify GREEN**
  - Run all tests, typecheck and build.
  - Expected: all pass and no new runtime dependencies are added.

- [x] **Step 6: Commit**
  - Commit as `feat: add configurable world creation screen`.

### Task 3: Live population activity roster and startup failure diagnostics

**Files:**
- Create: `src/ui/agent-activity.ts`
- Modify: `src/ui/agent-inspector.ts`
- Modify: `src/ui/app-shell.ts`
- Modify: `src/app/app.ts`
- Modify: `src/main.ts`
- Modify: `index.html`
- Modify: `src/styles.css`
- Test: `tests/unit/agent-activity.test.ts`

**Interfaces:**
- Produce `formatAgentGoal(goal: AgentGoal): string` for every current goal.
- Produce a roster renderer that lists every living agent by name, role and current activity.
- The roster refreshes every four simulation ticks (one simulated second).
- Clicking a roster row selects the person, centres the camera on them and shows the detailed inspector; closing the inspector restores the roster.

- [x] **Step 1: Add failing activity-label tests**
  - Cover all goal values, including food search/gather/eat, water search/drink, rest, explore, wood/stone hauling and construction.

- [x] **Step 2: Verify RED**
  - Expected: the shared formatter is missing.

- [x] **Step 3: Implement shared activity labels and roster**
  - Reuse the formatter in the inspector.
  - Add live activity rows and alive/role counts to the app shell.
  - Keep all inhabitants visible in a scrollable panel; do not replace the roster with a last-events feed.

- [x] **Step 4: Add startup diagnostics**
  - Use a relative module entry path.
  - Catch synchronous entry/startup errors and show readable text safely.
  - Add a 12-second watchdog in the HTML shell so a module that never starts produces a visible failure message.

- [x] **Step 5: Verify GREEN**
  - Run all tests, typecheck and build.
  - Verify CI and Pages deployment for the final commit.

- [x] **Step 6: Commit**
  - Commit as `feat: show live inhabitant activity and startup errors`.

### Task 4: Documentation and final review

**Files:**
- Modify: `README.md`
- Modify: this plan and its progress ledger.

- [x] Update controls and describe the population slider, preview selection, roster, zoom and unsaved-world limitation.
- [ ] Run final CI and verify the Pages deployment points at the final `main` commit.
- [ ] Review the full change against the spec. With no independent reviewer available, record a separate author self-review and disclose that limitation.
- [ ] Mark completed plan steps and update the progress ledger.

## Final acceptance

- The first screen is the world-creation menu.
- Population is adjustable from 5 to 30 and defaults to 12.
- The player can click the terrain preview to pick the group start area.
- The selected world is the world that launches.
- New World and Back to Current World both work without silently replacing the existing in-memory session.
- The simulation view opens centred on the settlement at a close initial zoom.
- The player can read every living inhabitant's current role and goal without selecting them on the map.
- Startup failures become visible instead of leaving the placeholder forever.
- Full tests, strict typecheck, production build, CI and Pages deployment succeed.
