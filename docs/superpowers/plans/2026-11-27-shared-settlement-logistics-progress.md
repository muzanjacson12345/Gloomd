# SDD ledger — plan: docs/superpowers/plans/2026-11-27-shared-settlement-logistics.md

## Execution setup
- Mode: inline implementation through GitHub Git-data APIs and GitHub Actions remote verification.
- Branch: `main`, as previously requested; no separate branch or worktree.
- Starting HEAD: `0a7486d8b0334e631b302ee0911d5062dc9e9f7d`.
- Previous milestone deployed successfully: personal shelters, HOMES layer and 52 passing tests.
- User instruction "ok lets keep going" continues the established inline, best-judgment implementation method.
- No subagent tool is available; final review will be an author self-review, not an independent second reviewer.

## Design decisions
- Add one communal stockpile at a deterministic, resource-free tile near the map centre.
- Assign six dedicated haulers, six builders and eighteen foragers in the default 30-person population.
- Haulers carry one unit at a time and deposit exact accepted amounts; builders withdraw the shelter recipe atomically from shared storage.
- Stockpile capacity is 120 units per material; food remains personal.
