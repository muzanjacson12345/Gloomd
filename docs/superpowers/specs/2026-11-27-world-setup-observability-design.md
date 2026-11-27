# GLOOMD — World Setup, Observability and Startup Resilience

## Intent

Make GLOOMD understandable to observe before adding more simulation systems. A player should be able to create different experiments, place a small population in a chosen part of the landscape, and understand what every living inhabitant is doing without selecting them individually.

The startup experience must also fail visibly when the JavaScript application does not start; a static initialization message must never remain forever without explanation.

## Goals

- Open on a main world-creation screen, not an automatically launched fixed-size world.
- Allow a starting population from 5 through 30, in whole-person steps. Default to 12 so an experiment begins small. Keep the maximum at 30 until a separate performance-validation milestone supports raising it.
- Show a generated terrain preview. Clicking the preview chooses the settlement's starting point. If the clicked tile is not walkable, snap to the nearest walkable tile and show the resulting coordinates.
- Place the inhabitants around the selected point, using nearby walkable tiles first. Expand the candidate area only when there are not enough free tiles.
- Allow opening the creation screen from an active world. The existing world pauses while the menu is open; the player can return to it or start a replacement world.
- Start the camera centred on the selected settlement area at a close, readable zoom rather than fitting the entire 128 × 96 world to the viewport.
- Keep a live roster of all living inhabitants visible by default. Each row shows the person's name, role, and current goal in ordinary language. Selecting a row centres the map on that person and opens the existing detailed inspector.
- Refresh the roster at least once per simulated second, and restore it when the inspector closes.
- Replace the indefinite startup placeholder with a visible error state when the module fails or does not start within 12 seconds. Catch synchronous startup errors and display their message safely.

## Non-goals

- Saving, loading, autosaving, or resuming a world after closing or reloading the page.
- Changing the underlying survival, gathering, hauling, or construction rules.
- Increasing the tested population limit above 30.
- Adding a server, online multiplayer, remote simulation, paid API, per-agent LLM calls, or new dependencies.
- Adding detailed floating text above every map sprite; the live roster is the readable source of individual activity and avoids covering the map.

## Design calls and approaches considered

### Activity visibility

1. **Text labels above every person:** rejected because labels overlap in a group and obscure the landscape, especially as population increases.
2. **A compact live roster beside the map (chosen):** each person has a persistent name, role, and current task; selecting one follows the existing inspection flow. The map remains the main full-window surface.
3. **A longer event history only:** rejected because an event feed reports what happened, not what each person is doing now.

### World creation

1. **Only choose a population number:** rejected because it does not answer where the group begins.
2. **Named preset regions:** rejected because the current map has no stable semantic region catalogue and the user asked to pick a place.
3. **Clickable terrain preview (chosen):** the same generated world shown in the preview is used after pressing Start; an invalid tile snaps to nearby land, and the spawn algorithm chooses nearby free tiles first.

### Population and map scale

- Default population: 12.
- Minimum: 5; maximum: 30; step: 1.
- Default starting camera zoom: 22 screen pixels per world tile, clamped by the camera's existing zoom limits.
- The reset-view control returns to the original settlement focus and initial zoom. The player may still zoom out to inspect the whole world.

## Architecture

- Keep the simulation model local and deterministic for a given world seed.
- Add a nearest-walkable-tile helper and optional spawn-centre argument to starter-agent creation.
- Add a small DOM-based setup-screen module that owns its preview canvas, controls, map seed, and event listeners.
- Keep the active world object while the setup screen is open so the player can cancel and return without losing the in-memory session.
- Add a dedicated activity-label mapping and roster renderer, reusing the same goal labels in the inspector.
- Add startup error handling in the module entry point and a small inline watchdog in the HTML shell. Use a relative Vite entry path so deployment under the repository subpath remains explicit.
- Use the existing TypeScript, Canvas 2D, Vitest, Vite, and GitHub Pages setup.

## Constraints

- Work directly on `main`, as requested.
- No new dependencies or external runtime services.
- Rendering stays in Canvas 2D with visible-area culling; the setup preview uses the existing renderer.
- The simulation pauses while the page is hidden, as before.
- A new world replaces the current unsaved world only when Start is pressed. The menu makes the no-save limitation explicit.
- A browser-side failure cannot be diagnosed on the user's machine without that browser's console. The implementation will surface the available error or a timeout instead of implying the root cause is known.
