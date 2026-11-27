# GLOOMD Procedural World and Settlement Construction Plan

**Goal:** Add genuinely randomized lakes, rivers and coastlines; choose map dimensions and water coverage; and make basic shelter construction visible and dependable.

**Work branch:** main directly, as requested.

**Spec:** docs/superpowers/specs/2026-11-27-procedural-worlds-and-settlement-construction.md

## Constraints

- Small: 64×48; Standard: 128×96; Large: 192×144; Huge: 256×192.
- Maximum generated area: 65,536 tiles.
- Water coverage: 25–55%, default 38%.
- Same seed/options must be deterministic.
- Preserve population 5–30 and existing local simulation; no runtime dependencies.
- Shelters still cost 5 wood +2 stone and 12 work ticks.
- Hauler carry cap is three material units per trip; do not exceed outstanding recipe amount.

## Task 1 — Test-first terrain and map-size APIs

**Files:** src/core/types.ts, src/core/world-generation.ts, tests/unit/world-generation.test.ts, src/ui/world-setup.ts, tests/unit/world-setup.test.ts.

- [x] Add failing tests for seed variation, multiple freshwater bodies, deterministic same-seed worlds, water coverage differences, safe total map area, and moving the stockpile near a chosen start.
- [x] Add failing tests for map-size presets and water-coverage clamping.
- [x] Verify RED in GitHub CI.
- [x] Implement deterministic multi-octave elevation/moisture noise, random coastlines, inland lake basins and downhill rivers.
- [x] Enforce 65,536 total tiles; optimize stockpile placement to avoid an O(tiles × resources) scan.
- [x] Add the map size and water coverage options to WorldOptions and the world-creator UI.
- [x] Make New Terrain choose a new random seed. Show the numeric seed. Reuse the same seed/options for the preview and launched world.
- [x] Relocate the stockpile beside the selected starting tile; keep it off resource nodes and off the population spawn tile.
- [x] Verify all tests, typecheck and build.

## Task 2 — Dependable shared construction loop

**Files:** src/core/types.ts, src/core/agents.ts, src/core/simulation.ts, src/ui/agent-activity.ts, tests/unit/simulation.test.ts, tests/unit/agent-activity.test.ts.

- [x] Add failing tests for multi-unit hauler loads, exact remaining recipe amounts, builder waiting/site-search goals, and a full generated-style builder/hauler integration that completes a shelter without prefilled stockpile.
- [x] Verify RED in CI.
- [x] Raise hauler perception radius to 24 tiles; leave other roles at 12.
- [x] Haul at most three units per trip and never gather more than the outstanding amount for the current shelter recipe.
- [x] Add explicit search_resources, wait_for_materials, and find_build_site activity goals.
- [x] Builders continue exploring for a viable site but correctly report why they are not constructing. Keep atomic material withdrawal, safe site checks and survival priority.
- [x] Verify construction integration, interruptions, all tests, typecheck and build.

## Task 3 — Documentation, review and deployment

**Files:** README.md, plan, progress ledger.

- [x] Document map presets, water coverage, seed reproducibility, and the current one-building-type limitation.
- [x] Review generator complexity at every supported map size, stockpile relocation, water walkability and construction accounting.
- [x] Self-review all changed code (no independent reviewer tool is available); record limitations honestly.
- [x] Verify CI and GitHub Pages point to the final main commit.

## Final acceptance

- Each New Terrain action generates a distinctly different, reproducible-on-seed landscape with ocean, lakes and rivers.
- Users can choose map size and water coverage.
- The selected population and stockpile start together.
- Haulers bring meaningful loads and builders visibly wait, find sites and build.
- The first shelter completes automatically without preloaded materials.
- Full CI, strict typecheck, production build and deployment succeed.
