# GLOOMD — First Autonomous Farming Loop

**Status:** Initial implementation scope, 2026-11-28  
**Branch:** main

## Purpose

Give farmers meaningful recurring work and create a food source that grows in the settlement's landscape. Farming is authoritative world state: preparing a plot, planting, growing, tending and harvesting all take simulation time and move real quantities.

## First playable slice

- A new farmer role and farming skill give some inhabitants a stable occupation.
- New worlds begin with six seeds in a small seed reserve. Seeds are spent one per prepared plot.
- Farmers choose empty, walkable grassland with sufficient soil moisture near the communal stockpile. They do not replace live resource nodes, buildings, other inhabitants or the stockpile.
- Preparing a field creates a persistent plot without creating food.
- Planting consumes exactly one seed and moves the plot to the growing stage.
- Crops grow gradually. Growth rate is derived from the tile's existing moisture.
- A farmer can tend a growing crop after a 90-minute interval to add a limited growth bonus.
- A ripe crop yields four food units to the farmer's carried inventory and returns one seed to the reserve. Harvesting resets the plot for another planting cycle.
- Harvest only when the shared food reserve is below its existing target. Carried harvest is delivered through the existing physical stockpile loop.

## Observation

- Draw prepared soil, growing crops and ripe crops as distinct marks in the existing Canvas renderer.
- Show seed reserve and field count in the existing stockpile status.
- Activity labels distinguish field preparation, planting, tending, harvesting and waiting for crops.

## Limits and next steps

This is not yet a complete agricultural simulation. There are no seasons, crop varieties, irrigation, soil fertility, ploughs, crop disease, spoilage, cooking or seed selection. Crop growth uses existing terrain moisture as a simple first climate signal.

## Accounting invariants

- Preparing a plot spends no seed and creates no food.
- Planting spends exactly one seed.
- Growing plots create no food until they reach the ready stage.
- Harvesting a non-ready crop returns zero and changes nothing.
- Harvesting a ready crop returns exactly four food and one seed, and resets the plot to prepared.
- Unsuitable tiles and tiles occupied by live resources or structures cannot be prepared.
- Farming state survives save/load, including old version-one save migration.
