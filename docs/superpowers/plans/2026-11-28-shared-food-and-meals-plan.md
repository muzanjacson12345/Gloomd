# GLOOMD Shared Food Reserve Implementation Plan

**Spec:** docs/superpowers/specs/2026-11-28-shared-food-and-meals-design.md  
**Execution:** direct on main, as requested; use GitHub Actions for remote verification.

## Task 1 — model and safe transfers
- Add food and fish to stockpile inventory without changing MaterialBundle semantics.
- Add exact whole-unit deposit/withdraw helpers for stored meals.
- Initialise all new worlds with zero shared food/fish.
- Add stockpile tests for partial capacity, exact withdrawal, invalid quantities and no negative balances.

## Task 2 — simulation lifecycle
- Let foragers and fishers replenish a communal reserve when below one ration per living person.
- Physically deliver gathered food/fish to a reachable stockpile access tile.
- Let hungry inhabitants withdraw one ration from shared storage by walking to the stockpile.
- Keep water priority, carried-food priority, survival damage, pathfinding and inventory conservation intact.
- Test depletion contention, unreachable/full stockpile, competing meals, personal meal priority and actual events.

## Task 3 — UI and observability
- Show communal food/fish separately from natural resources and building materials.
- Add readable task labels for gathering-to-store, delivering food and collecting a ration.
- Keep map rendering lightweight and expose stockpile contents without obscuring the map.

## Task 4 — persistence and documentation
- Extend save validation and version-one migration for old stockpiles without food/fish fields.
- Add round-trip and legacy-save regression tests.
- Update README and PROJECT_ROADMAP with implemented/remaining boundaries.

## Verification
- Add tests before behavior changes and inspect the expected red run.
- Require passing full tests, strict typecheck and production build.
- Inspect the fresh GitHub Actions run and Pages deployment; do not claim visual browser verification unless actually performed.
