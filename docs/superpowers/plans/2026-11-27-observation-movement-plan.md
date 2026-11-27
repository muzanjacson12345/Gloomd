# GLOOMD Observation and Movement Upgrade Implementation Plan

> **For agentic workers:** execute task-by-task with the connected repository tools. Every behaviour change requires a test-first cycle. Keep a progress ledger in this document or a linked progress file.

**Goal:** Give GLOOMD continuous NPC travel and a selectable, map-first observation experience without weakening the simulation or harming modest-PC performance.

**Architecture:** Keep integer grid positions authoritative. Record each real movement step during fixed simulation ticks and animate the queued steps on the render clock. Implement selection as a dedicated input mode and render optional overlays only for selected agents.

**Tech Stack:** Existing TypeScript, Vite, native Canvas 2D, Vitest; no new runtime dependency.

**Spec:** docs/superpowers/specs/2026-11-27-observation-and-movement-design.md

## Global constraints

- Map fills the viewport and remains dominant.
- Browser-local simulation only; no paid API, server or external database.
- Pausing or hiding the tab stops both simulation and presentation catch-up.
- Preserve current map generation, pathfinding and authoritative action timing.
- Use native Canvas 2D unless a measured bottleneck justifies a renderer change.
- Avoid displaying overlays for all NPCs by default.
- Keep existing main branch workflow and run GitHub Actions checks.

## Review focus

- 4x speed or delayed render frame where several tile moves happen before one frame; every step must be queued in order.
- Pause/visibility loss; animations must not continue or jump ahead.
- Selection drag initiated over controls; it must not begin map selection.
- Empty-area selection; clear selection and return to pan/inspect behaviour correctly.
- Hidden selected agent or agent death; selection, follow and overlay data must not reference removed/dead agents.

## Task 1: Movement animation queue

**Files:**
- Create `src/render/motion.ts`
- Create `tests/unit/motion.test.ts`
- Modify `src/app/app.ts`
- Modify `src/render/canvas-renderer.ts`

**Interfaces:**
- `AgentMotionAnimator.enqueue(agentId, from, to)`
- `AgentMotionAnimator.advance(simulationElapsedMs)`
- `AgentMotionAnimator.getPosition(agentId, fallback)`
- `AgentMotionAnimator.getTrail(agentId)`
- Renderer accepts a motion animator and reads interpolated positions; it never mutates world state.

Steps:
1. Test a movement at 50% progress, arrival at 100%, sequential queued movement and recent trail retention.
2. Run focused test and confirm missing API failure.
3. Implement bounded per-agent movement queues with smooth interpolation and short trail history.
4. In each fixed tick, snapshot integer positions before `stepWorld`, compare after and enqueue each legal one-tile transition in deterministic order.
5. Advance the animator by simulation elapsed time (including speed multiplier) only when simulation can advance.
6. Render NPCs and follow camera using interpolated positions; keep click-selection grounded in authoritative tile or interpolated visual position consistently.
7. Run typecheck, tests and build.

## Task 2: Selection mode and group selection

**Files:**
- Modify `src/ui/app-shell.ts`
- Modify `src/ui/map-input.ts`
- Modify `src/app/app.ts`
- Modify `src/render/canvas-renderer.ts`
- Modify `src/styles.css`
- Create `tests/unit/selection.test.ts`

**Interfaces:**
- `selectAgentsInWorldRect(agents, rect)` returns living agent IDs inside a normalised world-space rectangle.
- Map input supports a selection-mode callback, selection preview and completed rectangle callback.
- App maintains primary selected agent plus a set/list of selected group IDs.

Steps:
1. Test normalised selection rectangle, inclusion edges, dead agents and empty selection.
2. Verify failure before implementation.
3. Implement pure rectangle-selection helper.
4. Add explicit SELECT PEOPLE button and selection box; only consume drag as group selection while mode is active.
5. Escape exits selection mode; in OBSERVE mode existing click-to-inspect and drag-to-pan are preserved.
6. Draw selection rings for all selected agents and show a compact selection count/summary.
7. Run typecheck, tests and build.

## Task 3: Optional observation overlays

**Files:**
- Create `src/render/overlays.ts`
- Modify `src/render/canvas-renderer.ts`
- Modify `src/ui/app-shell.ts`
- Modify `src/app/app.ts`
- Modify `src/styles.css`
- Create `tests/unit/vision.test.ts`

**Interfaces:**
- Overlay configuration for routes, trails, targets and vision, all off by default.
- Compute line-of-sight tiles only for selected agents and cache by agent tile and relevant map revision.
- Overlay target/path selection must be derived from actual current goal or explicit active target; never invent a route to unrelated resource.
- Draw routes with distinct, subdued dashed strokes and destination marker; draw movement trail with fading segments.
- The initial vision overlay must be clearly labelled as a radius if it does not implement occlusion. If adding line-of-sight, test blocking by impassable terrain/buildings.

Steps:
1. Test vision bounds and obstacle blocking (when line-of-sight is implemented).
2. Verify failure.
3. Implement efficient local visibility calculation for selected agents.
4. Add compact overlay settings with individual checkboxes and a scope filter.
5. Add route, trail, target and vision drawing at appropriate zoom levels.
6. Run typecheck, tests and build.

## Task 4: Easier map observation

**Files:**
- Modify `src/ui/app-shell.ts`
- Modify `src/app/app.ts`
- Modify `src/render/canvas-renderer.ts`
- Modify `src/styles.css`
- Create `src/render/minimap.ts`
- Create `tests/unit/minimap.test.ts` if coordinate conversion is extracted

Steps:
1. Test world-to-minimap and minimap-to-world coordinate conversion.
2. Verify test failure.
3. Implement a small minimap with the current camera rectangle and click-to-centre.
4. Add fit-world and home/start-settlement focus.
5. Add hide-UI/cinematic mode and one unobtrusive way to restore controls (keyboard shortcut and small button).
6. Verify responsive behaviour at 320×568, 1366×768 and 1920×1080; ensure minimap overlays do not intercept map interaction except on their own surface.
7. Run typecheck, tests and build.

## Task 5: Persist the reference and roadmap

**Files:**
- Create `AGENTS.md`
- Create `docs/PROJECT_ROADMAP.md`
- Create `docs/research/AGENTARENAAI_REFERENCE.md`
- Create `docs/superpowers/specs/2026-11-27-observation-and-movement-design.md`

Steps:
1. Check that documents clearly distinguish implemented, planned and research-inferred features.
2. Add links from README.
3. Verify all links/paths and keep roadmap current.

## Final verification

- Run `npm run typecheck`.
- Run `npm run test`.
- Run `npm run build`.
- Inspect the fresh GitHub Actions run, not only the commit response.
- Inspect the changed file list and deployed application after successful Pages deployment.
- Record any unavailable verification honestly.
