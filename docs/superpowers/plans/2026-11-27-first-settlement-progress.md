# SDD ledger — plan: docs/superpowers/plans/2026-11-27-first-settlement.md

## Execution setup
- Mode: inline implementation through GitHub Git-data APIs and GitHub Actions remote verification.
- Branch: `main`, as explicitly requested; no separate branch or worktree.
- Prior approved foundation plan: Tasks 1–6 complete.
- Starting HEAD for this milestone: `55c2200a8c82ce574b0606dc42efe73bb5860ad5`.
- Scope selected under the user's instruction to continue and use best judgment: individual builders and personal shelters first; shared settlement logistics are deferred.
- No subagent tool was available; the final code review was an author self-review rather than an independent subagent review.

## Task 1 — deterministic gathering and shelter construction
- [x] Added `AgentRole`, builder goals, building status/data, agent home/project links and an empty building collection on new worlds.
- [x] Deterministically assigned one in five starter inhabitants to the builder role (six builders in the thirty-person starting population).
- [x] Builders select nearest reachable wood and stone deposits within perception, gather one unit per successful action, and transfer the exact amount from the source node into inventory.
- [x] Added safe shelter placement in deterministic east/south/west/north order. Live resources, occupied tiles, terrain obstacles and existing buildings prevent placement. Materials remain with the builder when no safe site exists.
- [x] Shelters cost exactly 5 wood and 2 stone. The material cost is consumed once when a site is placed. The site blocks movement immediately.
- [x] Construction takes 12 eligible work ticks. Urgent hunger/thirst and rest interrupt work without deleting the site; builders can return to an adjacent work tile and resume.
- [x] Completion assigns the shelter as the builder's home and emits a completion event.
- [x] A* pathfinding, exploration, freshwater-bank BFS and the general world walkability helper all treat construction sites and completed shelters as blocked.
- [x] Added regression coverage for resource overdraw, exact inventory accounting, placement conflicts, unfinished/completed building obstacles, blocked freshwater access, and interrupted/resumed work.

## Task 2 — map-first shelter visibility
- [x] Added zoom-aware Canvas drawings for construction sites and completed shelters, with visible-bounds culling and no simulation-state mutation.
- [x] Added the `HOMES` map-layer toggle.
- [x] Added a completed-home count to the top HUD.
- [x] Added `HOME` status to the selected-inhabitant inspector: `NONE`, `UNDER CONSTRUCTION` or `SHELTER`.
- [x] Renamed the world-resource summary label to `IN NATURE` so map deposits are not confused with resources carried by inhabitants.
- [x] Updated README controls and documented what is and is not implemented.

## Test-first and verification record
- Regression tests were committed before implementation. The initial red run (GLOOMD CI #71, commit `cd8d75bd01ad215fd544255f6e9f564358de4143`) showed the missing builder, resource, shelter and building-rendering behavior; 41 existing tests still passed.
- Renderer test was refined to exclude the Canvas background from its draw-call count. CI #73 then failed on the intended missing building drawing assertion.
- The integrated feature first passed all then-existing 49 tests, with strict TypeScript catching one older test fixture that needed the new home fields; that fixture was updated.
- Additional regression checks were added for occupied/resource shelter tiles and freshwater-bank routing through construction sites. The new general walkability test exposed one remaining inconsistency; `isWalkable` was corrected.
- **Final implementation commit:** `2e8203be28616da4d68dbea154086cbcb383f832`.
- **GLOOMD CI #77:** succeeded. 52 tests passed across 12 test files; `npm run typecheck` passed; `npm run build` passed.
- **GitHub Pages deployment #19:** succeeded for the implementation commit. GitHub reported the environment URL as `https://muzanjacson12345.github.io/Gloomd/`.
- CI run: https://github.com/muzanjacson12345/Gloomd/actions/runs/46065936525
- Pages deployment run: https://github.com/muzanjacson12345/Gloomd/actions/runs/46065936593

## Self-review and remaining scope
- Reviewed the domain model, action ordering, resource accounting, site placement, navigation, rendering layer, HUD/inspector wiring, tests and README against the approved design.
- No runtime dependency, paid API, remote simulation service, LLM agent call or backend was added.
- This stage implements personal shelters only. It does not yet implement shared stockpiles, cooperative building, household occupancy/families, farms, crafting, trade, long-term memory, save/load, autosave or offline PWA caching.
- The application still runs only while the browser page is open and visible; this stage does not add background simulation or persistence.

## Suggested next milestone
Implement shared settlement logistics: a communal stockpile and resource delivery jobs, so inhabitants can contribute gathered materials to a common store and builders can construct shared buildings from that store. Add household/family simulation after shared ownership and storage are stable.
