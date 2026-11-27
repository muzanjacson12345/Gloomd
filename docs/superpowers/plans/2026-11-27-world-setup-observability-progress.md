# SDD ledger — plan: docs/superpowers/plans/2026-11-27-world-setup-observability.md

Base: 56bf971ab62225b41c7624569a607ad9dff5c6e1
Execution: inline on main as previously requested; no subagent tool is available.

- [x] Root-cause investigation: app entry is unguarded; HTML has a static placeholder and no boot watchdog. Local browser reproduction is unavailable because the connected browser has no GLOOMD tab. Exact browser-side module failure is not confirmed.
- [x] Design and plan saved.
- [x] Task 1: spawn placement — RED CI 46069220720 (4 expected failures / 64 passed); GREEN CI 46069355950 (68/68 tests; typecheck and build passed). Commit 33518d7.
- [ ] Task 2: world setup screen
- [ ] Task 3: activity roster and startup diagnostics
- [ ] Task 4: docs, CI, Pages and final self-review

Review note: final review must be an author self-review unless an independent reviewer becomes available.

Task 1 ruling: a dedicated `tests/unit/agent-spawn.test.ts` was used instead of adding spawn-location tests to `simulation.test.ts`; start placement is population-generation behavior and deserves an isolated test module. Cost if wrong: one extra test file, with no production behavior change.
