# GLOOMD

**A living world, viewed from above.**

GLOOMD is a local-first, browser-based artificial-life simulation. You observe a small population exploring a procedurally generated landscape and making choices that change the world.

## Open the world

The site is published through GitHub Actions and is available at:

<https://muzanjacson12345.github.io/Gloomd/>

GitHub Pages serves the static application files. The simulation itself runs in your browser; it does not run on a server.

## Current playable slice

The first playable build includes:

- Seeded multi-scale procedural landscapes with irregular coastlines, ocean, multiple inland freshwater lakes, branching rivers, beaches, grassland, forests, hills and mountains. Each new experiment gets a new numeric seed; reusing a seed and settings reproduces the same terrain.
- An advanced world-creation screen with a 5–30 person selector (12 by default), map presets (Small 64×48, Standard 128×96, Large 192×144, Huge 256×192), adjustable water coverage (25–55%, default 38%), an editable numeric seed, a clickable terrain preview and a New Terrain action. The same preview world is used when the experiment starts. Starting inhabitants and the communal stockpile are placed close to the selected walkable location. The generated map is limited to 65,536 tiles.
- Deterministic world generation and simulation randomness from the world seed.
- Local perception and reachable movement using grid pathfinding.
- Real gathering, eating, drinking, resting and exploration actions. Haulers search within a larger local radius, collect up to three units per trip (capped at the exact outstanding shelter recipe), physically return to the nearby communal stockpile and deposit them. Source nodes and carrying inventories update as they go.
- A full-window Canvas 2D map with visible-area drawing, zoom-dependent detail, people clusters when zoomed out and individual silhouettes when zoomed in. The map opens focused on the chosen settlement at a close, readable zoom; Reset View returns to that start area.
- A shared supply-and-building loop: the stockpile holds up to 120 wood and 120 stone, and builders withdraw 5 wood + 2 stone to start a shelter. Builders visibly report whether they are waiting for supplies, finding a site or constructing. Construction takes 12 work ticks, can be interrupted by urgent survival needs and later resumed, and assigns the completed shelter as the builder's home. Shelters and the stockpile occupy map tiles and block movement. A tested empty-stockpile builder/hauler settlement can gather its first recipe and complete a shelter automatically.
- Camera pan and zoom, Land / Resources / People / Homes / Stockpile layers, click-to-select, an inhabitant inspector with home status, and follow mode. A live roster shows every living inhabitant's name, role and current task without requiring individual selection. Selecting a roster row centres the map and opens the detailed inspector. The HUD displays both resources found in nature and materials held in the communal stockpile.
- Continuous visual interpolation between the actual grid steps selected by pathfinding. The world still owns integer tile positions; the renderer animates those real moves and never changes collision or action rules.
- An explicit **SELECT PEOPLE** mode: normal map dragging still pans and ordinary clicks inspect an inhabitant; only while selection mode is active does a drag draw a rectangle to select multiple inhabitants. Escape exits the mode.
- An **OBSERVE** panel with optional route, recent travel trail, vision and destination overlays for selected inhabitants. Vision is calculated separately from resource-search radius and blocked by impassable map tiles and buildings. Overlays are off by default.
- A minimap showing terrain, inhabitants, the stockpile and current camera view; click it to navigate. **Fit world** frames the whole map, and **Hide UI** provides a cinematic view with a restore button.
- Pause, 1× / 2× / 4× speed controls, and a simulation clock that pauses when the page is hidden.
- A New World action from the active simulation. The world is held in memory and paused while the creation screen is open; Back to Current World returns to it. Creating a replacement discards the current unsaved world.

The current build is the foundation, not the final civilization simulator. Only shelters are buildable so far; there are no advanced building types, roads or multi-store logistics yet. Shared storage and physical hauling are implemented, while food remains personal. Agents do not yet have long-term personal memories, families, farming, production chains, trade, villages, governance or culture.

## Controls

| Action | How |
| --- | --- |
| Pan the map | Drag with the primary mouse button while not in SELECT PEOPLE mode |
| Select multiple inhabitants | Press **SELECT PEOPLE**, then drag a rectangle around them. Press Escape or **DONE SELECTING** to return to observation. |
| Toggle observation overlays | Open **OBSERVE** and select routes, trails, vision or destinations. Overlays are drawn for selected inhabitants only. |
| Navigate with the minimap | Click a location on the minimap to centre the main camera there. |
| Fit the whole world | Select the fit-world map button (square icon). |
| Hide or restore the interface | Select **HIDE UI** or press Escape / **SHOW INTERFACE**. |
| Zoom | Mouse wheel or the + / − buttons |
| Reset view | Select the home button to centre on the chosen settlement |
| Create a world | Set the population (5–30, default 12), select Small / Standard / Large / Huge, set water coverage (25–55%), choose or enter a seed, and click the preview to pick the starting area; then select Create World |
| Regenerate terrain | Select **New Terrain** for a new random seed; copy the numeric seed to reproduce that world |
| Change the map | Select a map preset: 64×48, 128×96, 192×144 or 256×192 |
| Create a different world | Select **New World**; select **Back to Current World** to return to the paused in-memory world |
| Observe everyone | Read the live People roster; each living person has a current task label |
| Inspect an inhabitant | Select a person in the roster or click them on the map |
| Follow an inhabitant | Open the inspector and select **Follow** |
| Pause / resume | Use the playback control |
| Change speed | Select 1×, 2× or 4× |
| Show or hide a map layer | Select Land, Resources, People, Homes or Stockpile |

## Local development

Requirements: Node.js 22.12 or newer and npm.

```sh
npm install
npm run dev
```

Checks used by continuous integration:

```sh
npm run test
npm run typecheck
npm run build
```

## Runtime and privacy

- The simulation runs locally in the open browser tab.
- It pauses when the page is hidden or closed. There is no offline catch-up.
- No paid APIs, per-agent LLM calls, remote simulation server or cloud database are used.
- The renderer uses the browser's built-in Canvas 2D API.
- The production page embeds its JavaScript and CSS directly into the HTML file, avoiding separate entry-script and stylesheet requests on GitHub Pages.
- After opening the hosted site, the app requires no continuously running backend.
- The app displays a readable startup error if its entry module fails or initialization does not complete within 12 seconds. The exact browser-side issue that previously left the loading message on screen could not be reproduced in the connected browser during development.
- There is no save/load or autosave yet. Reloading or closing the tab starts a new experiment.
- The continuous movement, selection and overlay features have been added to the codebase, but their full typecheck, test-suite and browser verification still need to be confirmed by a fresh GitHub Actions run.

## Planned work

The approved design includes further stages that are not yet implemented:

1. More complete agent needs, skills, work roles and daily routines.
2. Personal memories, relationships, communication, families and cooperation.
3. Food sharing, multiple stockpiles, cooperative building, farming, hunting, crafting, production chains and trade.
4. Migration, governance, conflict, technology and culture.
5. Local autosave, save/load, portable export/import and versioned save migrations.
6. Offline-first PWA caching and safe app updates.
7. Performance testing on real hardware before increasing the population beyond the current 30-person cap.

These features will only be described as complete after they are built and tested.

## Project notes

- Read [AGENTS.md](AGENTS.md) before changing the project.
- The enduring vision and staged priorities are in [docs/PROJECT_ROADMAP.md](docs/PROJECT_ROADMAP.md).
- The channel evidence and interpretation are recorded in [docs/research/AGENTARENAAI_REFERENCE.md](docs/research/AGENTARENAAI_REFERENCE.md).
- The original world design is in [docs/superpowers/specs/2026-11-27-gloomd-living-world-design.md](docs/superpowers/specs/2026-11-27-gloomd-living-world-design.md).
- Movement and observer controls are specified in [docs/superpowers/specs/2026-11-27-observation-and-movement-design.md](docs/superpowers/specs/2026-11-27-observation-and-movement-design.md).
- Their implementation plan is in [docs/superpowers/plans/2026-11-27-observation-movement-plan.md](docs/superpowers/plans/2026-11-27-observation-movement-plan.md).
- The original playable-world implementation plan is in [docs/superpowers/plans/2026-11-27-first-playable-world.md](docs/superpowers/plans/2026-11-27-first-playable-world.md).
- Work is performed directly on the `main` branch, as requested.

GLOOMD is a free, experimental project. It uses standard GitHub-hosted Actions runners and GitHub Pages for static hosting.
