# GLOOMD

**A living world, viewed from above.**

GLOOMD is a local-first, browser-based artificial-life simulation. You observe a small population exploring a procedurally generated landscape and making choices that change the world.

## Open the world

The site is published through GitHub Actions and is available at:

<https://muzanjacson12345.github.io/Gloomd/>

GitHub Pages serves the static application files. The simulation itself runs in your browser; it does not run on a server.

## Current playable slice

The first playable build includes:

- A procedurally generated 128 × 96 top-down landscape with ocean, freshwater, rivers, beaches, grassland, forests, hills and mountains.
- A world-creation screen with a 5–30 person selector (12 people by default), a generated terrain preview, a clickable starting-area marker and a New Terrain action. Starting people are placed on unique walkable tiles near the selected area. Roles are assigned deterministically: builders, haulers and foragers.
- Deterministic world generation and simulation randomness from the world seed.
- Local perception and reachable movement using grid pathfinding.
- Real gathering, eating, drinking, resting and exploration actions. Haulers gather wood and stone from reachable resource nodes, carry materials back to the communal stockpile and deposit exact amounts; the source nodes and carrying inventories update as they go.
- A full-window Canvas 2D map with visible-area drawing, zoom-dependent detail, people clusters when zoomed out and individual silhouettes when zoomed in. The map opens focused on the chosen settlement at a close, readable zoom; Reset View returns to that start area.
- A shared supply-and-building loop: the central stockpile holds up to 120 wood and 120 stone, and builders withdraw 5 wood + 2 stone from it to start a shelter. Construction takes 12 work ticks, can be interrupted by urgent survival needs and later resumed, and assigns the completed shelter as the builder's home. Shelters and the stockpile occupy map tiles and block movement.
- Camera pan and zoom, Land / Resources / People / Homes / Stockpile layers, click-to-select, an inhabitant inspector with home status, and follow mode. A live roster shows every living inhabitant's name, role and current task without requiring individual selection. Selecting a roster row centres the map and opens the detailed inspector. The HUD displays both resources found in nature and materials held in the communal stockpile.
- Pause, 1× / 2× / 4× speed controls, and a simulation clock that pauses when the page is hidden.
- A New World action from the active simulation. The world is held in memory and paused while the creation screen is open; Back to Current World returns to it. Creating a replacement discards the current unsaved world.

The current build is the foundation, not the final civilization simulator. Shared storage and physical hauling are now implemented, while food remains personal. Agents do not yet have long-term personal memories, families, farming, production chains, trade, villages, governance or culture.

## Controls

| Action | How |
| --- | --- |
| Pan the map | Drag with the primary mouse button |
| Zoom | Mouse wheel or the + / − buttons |
| Reset view | Select the home button to centre on the chosen settlement |
| Create a world | Set the population (5–30, default 12) and click the terrain preview to choose the starting area, then select Create World |
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

- The design specification is in [docs/superpowers/specs](docs/superpowers/specs/2026-11-27-gloomd-living-world-design.md).
- The staged implementation plan is in [docs/superpowers/plans](docs/superpowers/plans/2026-11-27-first-playable-world.md).
- Work is performed directly on the `main` branch, as requested.

GLOOMD is a free, experimental project. It uses standard GitHub-hosted Actions runners and GitHub Pages for static hosting.
