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
- Thirty starter inhabitants with individual identities, basic traits, needs and inventories; six are builders and the rest are foragers.
- Deterministic world generation and simulation randomness from the world seed.
- Local perception and reachable movement using grid pathfinding.
- Real gathering, eating, drinking, resting and exploration actions. Builders gather wood and stone from reachable resource nodes, consuming those nodes and updating their inventories.
- A full-window Canvas 2D map with visible-area drawing, zoom-dependent detail, people clusters when zoomed out and individual silhouettes when zoomed in.
- A real shelter-building loop: a builder spends 5 wood and 2 stone, works for 12 simulation ticks, and receives a home when the shelter is complete. Shelters occupy map tiles and block movement; construction can be interrupted by survival needs and later resumed.
- Camera pan and zoom, Land / Resources / People / Homes layers, click-to-select, an inhabitant inspector with home status, and follow mode.
- Pause, 1× / 2× / 4× speed controls, and a simulation clock that pauses when the page is hidden.

The current build is the foundation, not the final civilization simulator. This stage adds six builder roles and individual shelters. Agents do not yet have long-term personal memories, families, shared storage, farms, production chains, trade, villages, governance or culture.

## Controls

| Action | How |
| --- | --- |
| Pan the map | Drag with the primary mouse button |
| Zoom | Mouse wheel or the + / − buttons |
| Reset view | Select the home button |
| Inspect an inhabitant | Click a person on the map |
| Follow an inhabitant | Open the inspector and select **Follow** |
| Pause / resume | Use the playback control |
| Change speed | Select 1×, 2× or 4× |
| Show or hide a map layer | Select Land, Resources, People or Homes |

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
- After opening the hosted site, the app requires no continuously running backend.

## Planned work

The approved design includes further stages that are not yet implemented:

1. More complete agent needs, skills, work roles and daily routines.
2. Personal memories, relationships, communication, families and cooperation.
3. Shared storage, cooperative building, farming, hunting, crafting, production chains and trade.
4. Migration, governance, conflict, technology and culture.
5. Local autosave, save/load, portable export/import and versioned save migrations.
6. Offline-first PWA caching and safe app updates.
7. Performance testing on real hardware before increasing the population.

These features will only be described as complete after they are built and tested.

## Project notes

- The design specification is in [docs/superpowers/specs](docs/superpowers/specs/2026-11-27-gloomd-living-world-design.md).
- The staged implementation plan is in [docs/superpowers/plans](docs/superpowers/plans/2026-11-27-first-playable-world.md).
- Work is performed directly on the `main` branch, as requested.

GLOOMD is a free, experimental project. It uses standard GitHub-hosted Actions runners and GitHub Pages for static hosting.
