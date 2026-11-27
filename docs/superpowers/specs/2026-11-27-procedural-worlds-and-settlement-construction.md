# GLOOMD — Procedural Worlds, Variable Maps and Working Settlements

## Intent

Turn the world creator into a real experiment setup: different random coastlines, oceans, inland lakes, rivers, terrain and moisture patterns; selectable map sizes; a reproducible seed; and water coverage control. The starting area must become the actual centre of the settlement, including its shared stockpile.

Fix the settlement's visible construction loop. A builder should clearly communicate whether it is waiting for materials, finding a site, or constructing. Haulers should bring useful loads, rather than making one-unit deliveries across long distances. A normal small settlement should be able to complete its first shelter without a lucky pre-filled stockpile.

## Goals

- Generate deterministic multi-scale terrain from the world seed, not a fixed west-coast/east-lake template.
- Generate irregular coasts and several separate freshwater lakes per map. Generate rivers that follow downhill routes into water.
- Expose water coverage in the world creator (25–55%, default 38%).
- Offer Small 64×48, Standard 128×96, Large 192×144 and Huge 256×192 maps. Keep the total-cell budget at or below 65,536 for this tested playable slice.
- Choose a random seed for each new experiment and for every New Terrain action. Show the seed so users can reproduce a world.
- Preserve deterministic reproduction: same seed, dimensions and water setting must create identical terrain and resource distributions.
- Keep terrain preview and launched world identical.
- Move the communal stockpile to a clear tile close to the chosen starting point, and spawn the population around that point.
- Increase hauler load from one material unit to a useful bundle (up to three units per trip), without overfilling the settlement's 5 wood : 2 stone shelter recipe for the current project.
- Increase hauler search radius without making every agent perform world-wide expensive searches.
- Give builders readable Waiting for building supplies and Finding a building site states instead of misleadingly reporting Exploring.
- Ensure a generated settlement can gather the first 5 wood + 2 stone, start a shelter and complete it under ordinary simulation conditions.
- Keep survival needs higher priority than hauling and construction.
- Preserve local-only deterministic simulation, pause-when-hidden, Canvas renderer, no server, no paid services and no extra browser runtime libraries.

## Map generation design

- Use seeded smooth value noise with multiple octaves for elevation and moisture.
- Apply an edge falloff so water boundaries and coastlines vary with the seed.
- Select the water area using the water coverage setting.
- Carve irregular inland lake basins away from the ocean. Water components not connected to the map edge are freshwater.
- Trace a small set of downhill channels from high terrain toward water to form rivers.
- Convert nearby walkable grassland to beach, while preserving forest and highland terrain.
- Continue to place food, wood and stone on eligible land; guarantee at least one node of each type for small maps.
- Use a total tile budget rather than allowing unsupported combinations such as 512×512 to freeze generation or pathfinding.

## Settlement logistics design

- Keep the current shelter recipe and 12-work-tick construction stage.
- Haulers carry up to three units of a material and stop at the exact outstanding amount for the current recipe. They still physically return and deposit at the stockpile.
- The stockpile moves near the selected start area before people spawn. It remains a physical blocked tile.
- Builders wait explicitly for the shared recipe, and explore for a build site if their immediate surroundings are occupied. Once a safe adjacent site is found and the full recipe is available, materials are withdrawn atomically and construction begins.
- Haulers see further for resource nodes (24 tiles) while foragers and builders retain the existing local perception radius.
- Survival interruptions continue to work; construction resumes once the inhabitant is safe.

## Non-goals

- Raising the 30-person cap in this milestone.
- Adding farms, crafting chains, markets, roads, multi-store logistics, families, governance, or multiple building types.
- Save/load, autosave, offline catch-up, servers or LLM agents.
- Promising support for maps larger than Huge before performance tests.

## Acceptance

- Different seeds visibly change water bodies, shoreline and terrain.
- At least two separate freshwater bodies appear in a standard generated map.
- The same seed/options reproduce exactly.
- Low and high water settings produce different water coverage.
- Each map preset launches at its advertised dimensions.
- The selected start is walkable, the stockpile is nearby and no agent spawns on it.
- The activity roster reports clear building and waiting states.
- A complete shelter is built by a normal builder/hauler pair with no pre-filled stockpile in the integration test.
- All unit tests, type-check, production build and Pages deployment pass.
