# SDD ledger — procedural worlds and settlement construction

Base: b8ec2f2a4c115087e6f64e3b393c28f162949f2a
Execution: direct on main.

- [x] Review current terrain, map-size API, stockpile placement and NPC construction code.
- [x] Identify that the generator uses a fixed west ocean, one fixed east lake and one fixed river; map dimensions are only internal API options; UI does not expose them.
- [x] Identify the settlement mismatch: spawn location is user-selected, but stockpile remains near world centre. Haulers carry one unit per trip; builders report Explore when waiting for supplies or a nearby free site.
- [x] Design and plan saved.
- [x] Task 1: randomized terrain, water and selectable map sizes — RED CI 46073032589 (12 expected missing-feature failures); implementation across 68f817c, cd7406b and d72d0ea. Same seed/size/water is deterministic; terrain changes across seeds, standard map has multiple disconnected freshwater bodies, water coverage and tile budget tests pass. UI presets and numeric seed pass.
- [x] Task 2: settlement logistics and visible builder states — RED CI 46073032589; implementation 3092d83. Haulers carry up to three units per trip, only gather the outstanding recipe amount, and see 24 tiles; builders report wait_for_materials / find_build_site. Integration test completes the first shelter from an empty stockpile. Legacy event-count assertions updated in 20868ae.
- [ ] Task 3: docs, self-review and final Pages deployment.

No independent reviewer or live browser test is available; final review must be an author self-review. CI and deployed artifact will be verified before completion.

Verification: final functional CI run 46073661231 passed — 104 tests across 18 files, strict TypeScript check and production build. Pages deploy run 46073661271 is being verified against final main after documentation update.
Author self-review: source reviewed for seeded deterministic generation, lakes/ocean component classification, river walkability, 65,536-tile bounds, stockpile relocation, spawn exclusion, bundle capacity accounting, recipe balance, survival priority and builder status labels. Generator uses multiple deterministic value-noise octaves and BFS/flood fill; max world size is 49,152 tiles. No independent reviewer/subagent tool or live browser UI test was available.
