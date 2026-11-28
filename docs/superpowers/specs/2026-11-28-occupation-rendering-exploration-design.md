# GLOOMD — Occupation Clarity, Terrain Performance and Spatial Exploration

**Date:** 2026-11-28  
**Implementation:** direct on main, following the user's request to improve usability and responsiveness.

## Goals

- Make an inhabitant's current occupation immediately visible without opening the inspector.
- Reduce terrain-layer cost on ordinary desktop hardware.
- Stop repeated idle redraw work while the simulation is paused.
- Place map controls and information panels in non-overlapping desktop regions.
- Let any active farmer work any field in the shared settlement.
- Replace random exploration steps with persistent spatial discovery and purposeful frontier scouting.

## Occupation language

`src/core/role-visuals.ts` is the single role palette. Individual sprites use the role colour for clothing and a letter badge; low-zoom population clusters show role-coloured segments; the roster role chip and occupation section of MAP KEY use the same mapping.

## Rendering strategy

- Generate a one-pixel-per-tile terrain raster once for each generated tile grid.
- Composite the raster as one canvas image rather than issuing a fill operation for every tile on every display frame.
- At close zoom, lazily render 16×16 terrain-detail chunks into small offscreen canvases and reuse them.
- Clear close-detail chunks when the forest timber visual state changes.
- Limit normal active map redraw to 30 frames per second. While paused, map redraw occurs only in response to user input or other explicit UI changes.
- Keep Canvas 2D and avoid new runtime dependencies. This is a rendering optimization, not a claim of a measured frame-rate target; actual PC/browser benchmarking remains outstanding.

## Shared farming

Farm plots are communal settlement assets. Any living agent with the farmer role may path to a prepared, growing or ripe field and perform the corresponding action. No plot is permanently assigned to its creator.

## Spatial map memory

- An agent records the tiles in its actual line of sight after moving to a new tile.
- The settlement also stores a shared explored-tile set so inhabitants do not repeatedly scout ground already discovered by another resident.
- Exploration chooses the nearest reachable walkable tile outside shared known territory and follows a path to that frontier.
- When no reachable unknown tile remains, the inhabitant changes to a visible waiting state instead of randomly wandering.
- Personal and shared explored-tile state, current frontier and completion state are preserved by save/load. Old version-one saves receive empty memory fields and continue normally.

This is spatial map knowledge only. Biographical life memories, conversations, ideas, teaching and social learning remain future systems.

## Verification boundary

Tests cover role/activity labels, farming take-over by a replacement farmer, line-of-sight memory, shared exploration, no-revisit frontier selection and save/load migration. GitHub Actions must pass tests, type-check and production build before the feature is described as ready. Manual canvas visual review and real-device performance measurement remain separate acceptance checks.
