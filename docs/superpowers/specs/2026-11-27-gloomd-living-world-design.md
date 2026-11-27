# GLOOMD — Living World Design

**Status:** Approved for implementation by the user on 2026-11-27  
**Date:** 2026-11-27  
**Repository:** `muzanjacson12345/Gloomd`  
**Working branch:** `main` (the user explicitly asked to work directly on main)

## 1. Purpose

GLOOMD is a browser-based artificial-life and civilization simulation. The player is an observer of a living world. The map is visually quiet and compact; the simulation underneath is detailed. Agents must make decisions that change the authoritative world state. They are not decorative dots that move while the interface merely reports fictional activities.

The new application is a clean rebuild. The previous prototype has been rejected and removed from the current branch. Do not reuse its interface, CSS, JavaScript simulation, or visual layout.

## 2. Product experience

### Main screen

- A full-window, top-down 2D world map is the primary experience.
- The map remains visible and dominant. Avoid a dashboard, a large permanent sidebar, or a small map inside a frame.
- The world has readable geography: coastlines, rivers, lakes, forests, grassland, hills/mountains, paths, resource patches and settlements as they emerge.
- Agents and important objects are visible at useful zoom levels. The map should look like a coherent world, not a field of anonymous red/green dots.
- Camera supports smooth pan and zoom. Zoomed out: geography, settlements, territories and groups. Zoomed in: individual agents, buildings, work and local activity.
- Selecting an agent opens a compact inspector over the map. Closing it restores the unobstructed map. A follow-agent action is useful.
- Compact controls include play/pause, simulation speed, world time, population and a few useful world indicators.
- Optional map layers expose resources, population, roads, settlements and territory. Event history is available without taking over the screen.

### Visual direction

Minimalist, restrained, map-first and legible, inspired by the compact visual language of AgentArenaAI. Use simple custom sprites/shapes and subtle terrain variation. Do not use elaborate 3D, heavy lighting, decorative animation, enormous UI cards, or a dashboard-first layout. Visual simplicity must not mean shallow simulation.

## 3. Simulation requirements

### World and nature

- Seeded procedural world generation so a saved world can be reproduced and its seed recorded.
- Terrain and geography include water, rivers/lakes, coast, grassland, forest, hills/mountains and fertile land.
- Walkability and obstacles are part of the world model, not just visual decoration.
- Resources have quantities and rules: food, wood, stone and other materials can be collected, stored, consumed and regenerated where appropriate.
- Weather and seasons can influence growth, food availability and travel as later systems.

### Agents

Every agent has persistent identity and state, including:
- needs such as hunger, thirst, energy, health, safety and social contact;
- personality/traits and skills;
- a home, current location, occupation or work role;
- inventory and carried goods;
- current goal/action and a short plan;
- personal memories grounded in events the agent actually experienced or learned about;
- relationships such as family, friendship, trust and rivalry as those systems are introduced.

Agents have bounded perception. They must not know the entire map or other agents' private experiences. Information can spread through observation and communication.

### Decisions and real consequences

- Routine behaviour uses efficient local simulation rules (for example, need-based utility scoring and action/state machines), not a paid LLM call for every agent.
- Agents choose goals, find reachable targets, navigate around obstacles and complete actions over time.
- Actions must alter the authoritative world state: gathering reduces resource nodes and adds inventory; eating consumes food and changes hunger; crafting consumes inputs and creates outputs; building consumes materials and creates a building; trade transfers goods.
- Failed, interrupted and impossible actions must be represented honestly in state and event history.
- The simulation engine is authoritative. Rendering and UI only display its state.

### Social life and civilization

Build toward cooperation, division of labour, households/families, shared knowledge, trade, migration, settlements, leadership/governance, conflict, technology and culture. These should emerge from agent needs, resources, relationships and collective actions rather than simply being scripted milestone labels.

## 4. Runtime, performance and offline use

- The simulation runs locally in the user's browser. No continuously running server, cloud simulation, external AI API or paid service is required.
- It runs only while the app is open and visible/active. When closed or hidden, simulation time pauses. Returning restores the saved state; there is no offline catch-up.
- Rendering and simulation use separate clocks: rendering follows the browser animation frame; simulation advances in controlled fixed steps and speed settings.
- Build for a modest PC: visible-area rendering, simple sprites, batched draw work, spatial lookup for nearby agents/resources, and detail levels based on zoom. Off-screen agents still simulate at an appropriately efficient rate; hiding them must not freeze their world effects.
- First target: a meaningful population of approximately 30–50 agents. Increase toward 100–200 only after actual performance measurements; do not promise millions of agents.
- All runtime assets are bundled with the app; do not depend on remote images, fonts or services for normal play.
- Offline-first PWA: after the first successful online visit, cache the app shell and assets so the world can be opened offline. App updates require an internet connection.

## 5. Saving and restoring

- Use browser-local IndexedDB for versioned world saves.
- Save the world seed, simulation clock, terrain/world state, agents, needs, skills, goals, inventories, buildings, resource quantities, relationships, memories, events and relevant settings.
- Autosave periodically and on pause. Use safe/atomic save handling so a partial write does not silently replace the last good save.
- Provide explicit Save, Load, Export and Import controls. Export/import uses a portable, validated save file.
- Loading restores the saved simulation state. It does not recreate the world from appearance-only data and does not advance time while the app was closed.
- Include save schema versions and migrations for future app updates.

## 6. Proposed technical approach

### Rendering alternatives considered

1. **Native Canvas 2D (recommended):** built into the browser, no separate graphics-engine dependency, simple deployment and direct control over drawing/culling. It requires us to implement our own lightweight scene organisation and batching.
2. **PixiJS:** provides a dedicated 2D scene/rendering system and useful scaling tools, but adds a graphics dependency and renderer-specific complexity. Its Canvas fallback does not support every feature, while its WebGL path requires capability testing.

**Proposed choice:** start with native Canvas 2D. Keep the renderer behind a small interface and keep simulation state independent from rendering so that a later WebGL/PixiJS experiment remains possible if measured performance requires it.

### Application architecture

- TypeScript modules for the world model, deterministic simulation rules, agent decisions, pathfinding, persistence, UI state and rendering.
- Vite for a reproducible static production build suitable for GitHub Pages.
- Native Canvas 2D for the map renderer.
- IndexedDB for local saves; a versioned JSON export/import format.
- A small service worker for offline caching and safe app updates.
- Automated tests for simulation rules, resource accounting, pathfinding, save/load round trips and pause/resume behaviour.
- GitHub Actions on standard runners for automated test/build checks; publish the static build to GitHub Pages after checks pass.
- Develop directly on `main` as requested. Only create a separate branch when there is a real, named experiment or a saved implementation that needs protection.

## 7. Free-service constraints

The repository remains public. Use GitHub Pages for static files and standard GitHub-hosted runners for public-repository testing/builds. Do not enable larger paid runners, private paid hosting, paid databases, paid APIs, cloud servers or billing-dependent services. If any proposed feature would introduce a possible charge, stop and get the user's explicit approval before enabling it.

GitHub Pages serves the application files only; it does not run the simulation. The user's browser runs the world.

## 8. Delivery stages

1. **Foundation:** set up the new project structure and automated checks; implement the map-first screen, camera, terrain layers and compact controls. No old prototype code or UI is carried over.
2. **World model:** seeded map, terrain, obstacles, resources, time and weather foundations.
3. **Agent simulation:** initial population, needs, identities, inventories, goals, jobs, perception and navigation.
4. **Consequential actions:** gathering, eating, resting, farming/hunting, crafting, storage and building, each with tested state changes.
5. **Social systems:** memories, relationships, communication, families and cooperation.
6. **Emergent settlement/civilization:** production chains, trade, migration, governance, technology and culture.
7. **Persistence and offline:** autosave, save/load, export/import, PWA caching and update handling.
8. **Performance and release:** benchmark on the user's PC, optimize based on measurements, run the complete test suite and publish.

The first useful playable milestone must be more than a visual mockup: agents must perform a small but coherent set of real actions whose outcomes change food, inventory, needs and the world. Later civilization systems are delivered in explicit stages and must not be claimed as finished before they exist.

## 9. Explicit non-goals and anti-goals

- No 3D world or expensive 3D engine in the initial release.
- No server that runs continuously and no simulation progress while the app is closed.
- No paid LLM/API calls or per-agent cloud reasoning.
- No requirement for the user to install programming tools or edit source code manually.
- No reuse of the rejected prototype's visual layout, two-creature simulation or code.
- No fake agent reports: an activity is only shown as completed when the simulation state records its actual effects.
- No claims of high population capacity without repeatable performance measurements.

## 10. Approval gate

This is a proposed design, not a declaration that the application has been built. The user approved implementation on 2026-11-27. Execute the detailed plan in tested, reviewable stages; routine implementation decisions do not require further approval.
