# SDD ledger — plan: docs/superpowers/plans/2026-11-27-shared-settlement-logistics.md

## Execution setup
- Mode: inline implementation through GitHub Git-data APIs and GitHub Actions remote verification.
- Branch: `main`, directly as previously requested; no separate branch or worktree.
- Starting HEAD: `0a7486d8b0334e631b302ee0911d5062dc9e9f7d`.
- Previous deployed milestone: individual shelters, six builders, HOMES layer and 52 passing tests.
- User instruction "ok lets keep going" continued the established implementation method and delegated choices to best judgment.
- No subagent execution/review tool was available, so the final review was an author self-review using the code-review checklist, not an independent second review.

## Task 1 — physical stockpile model and accounting
- [x] Added `Stockpile` and shared wood/stone inventory to world state.
- [x] Each generated world now has an initially empty stockpile with a per-material capacity of 120.
- [x] Stockpile placement is deterministic: nearest resource-free walkable tile to map centre, with row-major tie-breaking.
- [x] Stockpile tile is blocked by general world walkability and A*, and excluded from starter-agent spawning.
- [x] Added safe partial deposit and withdrawal functions and an atomic material-bundle withdrawal operation.
- [x] Role assignment for the default 30 agents is deterministic: six builders, six haulers, eighteen foragers.

## Task 2 — physical hauling and shared shelter supply
- [x] Haulers select the needed material using the 5:2 shelter recipe balance, counting shared and carried building materials.
- [x] Haulers gather actual wood/stone nodes one unit at a time, carrying the material in their inventory.
- [x] Haulers physically return to a reachable adjacent tile beside the stockpile before depositing.
- [x] Deposits are capped by available capacity; exact accepted quantities leave the carrier and enter shared storage.
- [x] Haulers preserve cargo when the store is unreachable or full; no delivery event is emitted without an actual transfer.
- [x] Urgent thirst interrupts a loaded hauler without losing the cargo; survival needs remain higher priority.
- [x] Builders no longer rely on personal building materials. They atomically withdraw 5 wood + 2 stone only after finding a safe shelter site.
- [x] Multiple builders cannot spend the same final recipe; insufficient stock or an invalid site leaves stockpile balances unchanged.
- [x] Existing 12-tick construction, survival interruption/resumption and completed-home assignment remain intact.

## Task 3 — visible stockpile and HUD
- [x] Added a zoom-aware, visible-bounds-culled Canvas stockpile marker.
- [x] Added the independent STOCKPILE map layer.
- [x] Added a stockpile HUD readout, separate from natural resource-node totals.
- [x] Preserved the map-first full-window layout and added medium-width HUD compaction so the new readout does not crowd the controls.
- [x] Updated README controls, role counts, hauling and shared construction behavior.

## Test-first and verification record
- The tests-first commit `04007ffa90a782f7fc3d274fbd9931e382c47baf` produced the expected red run (GLOOMD CI #80): missing stockpile model, hauler role, physical deliveries and stockpile blocking were exposed.
- Stockpile model tests and world/pathfinding checks passed after Task 1; the core hauling and shared-construction tests passed in CI #82 before map integration.
- The renderer stockpile test was added before the renderer code. It first failed as expected because the stockpile was not drawn. A later Homes-layer test failure was traced to the test counting the newly visible stockpile; the Homes test now explicitly disables the stockpile layer to test each layer independently.
- Added regression coverage for stockpile tile walkability and thirst interrupting a hauler carrying materials.
- **Final implementation HEAD before documentation update:** `ba593e802ba696043aa8d0872bfb668a37c504a2`.
- **GLOOMD CI #86:** succeeded. 64 tests passed across 13 test files; `npm run typecheck` passed; `npm run build` passed.
- **GitHub Pages deployment #28:** succeeded for the implementation commit.
- CI run: https://github.com/muzanjacson12345/Gloomd/actions/runs/46067631414
- Pages deployment run: https://github.com/muzanjacson12345/Gloomd/actions/runs/46067631502
- Published URL reported by GitHub Pages: `https://muzanjacson12345.github.io/Gloomd/`.

## Self-review
- Reviewed shared inventory transfer boundaries, whole-unit/capacity limits, atomic bundle withdrawal, stockpile placement, A* and freshwater blocking, starter spawn exclusion, deterministic material selection, hauler delivery and interruptions, builder site checks, Canvas culling and read-only rendering, HUD/layer wiring, responsive styling, and README claims.
- No critical or important implementation issues identified in this self-review. The only test failure during UI integration was an isolation issue in the Homes renderer test; it was corrected by explicitly disabling the independent Stockpile layer in that test.
- No runtime dependency, paid API, remote simulation service, LLM agent call or backend was added.
- Food is still personal. This stage does not add multiple stockpiles, food sharing, roads/carts, farming, production chains, trade, families, long-term memory, save/load or offline PWA caching.
- The app still runs only while the browser page is open and visible; it does not run in the background or preserve state across reloads.

## Suggested next milestone
Introduce a first shared food system and simple communal meal distribution, or begin household/family relationships once the shared supply system has been observed in the browser. Food sharing should remain separate from building-material logistics and should include starvation/supply-shortage tests before release.
