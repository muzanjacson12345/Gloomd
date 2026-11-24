# GLOOMD

A self-contained living-world simulation. You are the observer: the world advances in ticks while its inhabitants make their own decisions.

## Run it

Open `index.html` in a modern browser. To publish it as a website with GitHub Pages:

1. Open this repository's **Settings**.
2. Choose **Pages**.
3. Under **Build and deployment**, choose **Deploy from a branch**.
4. Select branch **main** and folder **/ (root)**, then save.

## First playable prototype

- Procedural 48 × 32 tile map with grassland, sand, and ocean.
- Berry bushes as the first food resource.
- Place two Glooms on land, or choose random spawn locations.
- Ocean and occupied tiles are invalid spawn locations.
- Individual health, hunger, energy, speed, stamina, intelligence, and strength stats.
- Basic autonomous behavior: explore, seek berries, eat, and rest.
- Observer panel, event log, pause/resume, and single-tick stepping.
- All simulation logic runs locally in the browser. No external AI service is used.

## Planned systems

Individual memory, ambitions, teaching and shared knowledge, relationships, reproduction, genetic inheritance, positive and negative mutations, crafting, building, and civilization development.

The systems in the planned list are future work; they are not implemented in this first prototype.