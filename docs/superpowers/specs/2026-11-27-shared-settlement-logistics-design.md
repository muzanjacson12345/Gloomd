# GLOOMD — Shared Settlement Logistics Design

**Status:** Next approved milestone, selected under the user's instruction to continue and use best judgment
**Date:** 2026-11-27
**Repository:** `muzanjacson12345/Gloomd`
**Working branch:** `main`

## Intent

Turn individual resource gathering into a shared settlement economy. Inhabitants should physically deliver building materials to one communal store, and builders should use those shared materials to construct shelters. This creates a visible supply-and-construction loop without introducing a server or complex economy prematurely.

## Approaches considered

1. **A number-only shared counter:** easiest to code, but inhabitants would not travel or deliver anything, so it would not be a real logistics system. Rejected.
2. **A physical central stockpile with deterministic hauler jobs (chosen):** one visible store occupies a tile; haulers gather local resources, carry one unit at a time, navigate back and deposit; builders atomically withdraw shelter costs. It uses the existing pathfinding and agent inventory model and is testable.
3. **A full multi-store warehouse and road network:** richer, but requires storage ownership, capacity routing, transport scheduling and settlement geography. Deferred until the first shared supply loop works.

## Goals

- Add one communal stockpile to each newly generated world, empty at start, with a capacity of 120 wood and 120 stone.
- Place it on a resource-free, walkable tile nearest the map centre, with deterministic tie-breaking. The stockpile tile is occupied and blocks all movement.
- Assign six of the thirty starter inhabitants as haulers and six as builders, using deterministic role assignment; the remaining eighteen remain foragers.
- Haulers identify the shared material the settlement most needs, using the 5:2 wood-to-stone shelter recipe as the target ratio and counting both stored resources and materials already carried by inhabitants.
- Haulers gather one reachable unit of wood or stone, carry it in their inventory, find a reachable tile beside the stockpile and physically return. They deposit only the quantity accepted by the store's remaining capacity.
- Deliveries reduce carried inventory and increase shared inventory by the exact same amount. Emit delivery events only for actual transfers.
- Builders no longer collect personal shelter materials. They start a shelter only when the communal store can pay the full 5 wood + 2 stone cost and a safe adjacent site is available. The cost is withdrawn atomically, once.
- If the store has insufficient materials, or no safe construction site exists, do not withdraw anything.
- Keep food personal in this stage. Survival needs continue to take priority over hauling and construction.
- Show the stockpile on the map with a separate STOCKPILE layer and display stored wood/stone in the HUD.
- Keep the simulation deterministic, local and lightweight, with no new dependencies, paid services, remote API or background server.

## Non-goals

No food sharing, personal accounts, multiple warehouses, carts, roads, supply-priority UI, trade, shared farms, crafting, cooperative work progress, household/family systems, save/load or PWA work in this milestone.

## Behavior and data decisions

- Shared stockpile data: stable ID, x/y tile, `inventory: { wood, stone }`, and `capacityPerResource: 120`.
- Stockpile creation scans walkable cells by Manhattan distance from the map centre; ties retain first row-major coordinate. A live resource node cannot be overwritten.
- New role values: `forager`, `hauler`, `builder`. Starter agent numbers divisible by five are builders; numbers congruent to two modulo five are haulers; other agents are foragers.
- Shared inventory operations live in `src/core/stockpile.ts`: safe partial deposit, safe partial withdrawal, and all-or-nothing material-bundle withdrawal. Invalid/non-positive amounts transfer zero.
- Haulers use existing perception and A* pathfinding to select the nearest reachable resource node of the needed type. They carry one unit at a time and return to one of the four adjacent stockpile-access tiles in deterministic east/south/west/north order.
- When a stored material is at capacity, haulers stop collecting it and choose the other material if room remains.
- Builders pay the shelter recipe from the shared stockpile only after finding a valid adjacent construction tile. Existing 12-tick construction and personal home ownership remain unchanged.
- The stockpile is a blocked tile for A*, exploration, freshwater-bank search and starter-agent placement.

## Constraints

Keep the existing full-screen Canvas 2D map, zoom/pan, compact HUD, seed-based deterministic simulation, 30-person population, fixed-step clock, hidden-tab pause, GitHub Pages hosting and local browser runtime. Work directly on `main`, as previously requested.
