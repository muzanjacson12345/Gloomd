# GLOOMD Adaptive Work and Skills Implementation Plan

**Spec:** docs/superpowers/specs/2026-11-28-adaptive-work-and-skills-design.md

## Task 1 — agent data and save migration
- Add persistent foraging, fishing, hauling and building skills with validated 0–100 values.
- Add the tick of the last ordinary job reassignment.
- Give new villagers a seeded specialty advantage based on their starting role.
- Migrate existing version-one saves without losing current roles or world progress.

## Task 2 — measurable skill gain
- Award experience only when gathering, fishing, depositing, or construction work actually succeeds.
- Clamp skill values; do not award skill for movement, waiting, failed actions or exploration.
- Cover deterministic skill progression and caps with tests.

## Task 3 — workforce demand review
- Add a deterministic periodic review using shared food reserve, material commitment, housing demand and reachable resources.
- Keep workers on active building projects.
- Assign food workers while the communal reserve is below target; use fisher only when reachable fish exists.
- Assign haulers for a real shelter-material deficit and builders when the recipe and site are available.
- Preserve useful current assignments to avoid unnecessary churn; emit reasoned job-change events.

## Task 4 — UI and observability
- Keep current occupation visible in the roster and inspector.
- Explain job changes in the event feed.
- Never display a job the simulation cannot perform.

## Task 5 — verification and balancing
- Add scenario tests for shortage response, switching away after a shortage, building/material demand, skill gain, cooldown, survival override and save migration.
- Run full tests, typecheck and production build.
- Measure the review cost with the current 30-person population and keep the allocator bounded for modest PCs.
- Update README and roadmap only after the checks demonstrate the feature.

## Execution order
1. Read latest design and source implementation.
2. Add failing deterministic tests.
3. Implement data/migration and experience.
4. Implement role review and events.
5. Verify on GitHub Actions before browser testing.