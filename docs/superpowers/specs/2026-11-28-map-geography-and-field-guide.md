# GLOOMD — map geography and field guide

**Status:** Approved implementation scope, 2026-11-28  
**Repository:** `muzanjacson12345/Gloomd`  
**Target branch:** `main`

## Purpose

Make the existing world map easier to read and more rewarding to observe without replacing the map-first layout or changing the authoritative simulation. The generator already creates ocean, freshwater, rivers, inland lakes, beaches, grassland, forests, hills and mountains. This pass improves how those existing features look and how the observer understands them.

## Scope

1. **Deterministic terrain presentation**
   - Let moisture subtly distinguish dry, ordinary and wet grassland.
   - Let elevation subtly distinguish lower hills and higher mountain terrain.
   - Give ocean, inland freshwater and rivers distinct surface colours.
   - Draw subtle grass, sand, shoreline, water-ripple, hill-contour and mountain-peak details at suitable zoom levels.
   - Give forest trees more than one silhouette and keep harvested clearings/saplings grounded in real wood stock.
   - Derive decorative variation from tile coordinates. Rendering must not consume simulation RNG or mutate save data.

2. **Map field guide**
   - Add a compact, dismissible key for terrain, resource markers, inhabitants, buildings and the stockpile.
   - Keep it near map controls rather than creating a permanent dashboard.
   - Escape and Hide UI dismiss it.

3. **World-creation preview**
   - Show actual generated land/water/forest/highland proportions.
   - Display the selected starting tile's terrain and nearby resource-patch/freshwater context.
   - Preserve map size, water coverage, seed, population and click-to-select behaviour.

4. **Minimap**
   - Use the same terrain palette as the main map.
   - Distinguish complete and under-construction buildings at minimap scale.

## Constraints

- No new terrain categories or world-state fields.
- No simulation-rate, resource, survival or pathfinding changes.
- No remote assets, paid services or renderer migration.
- Preserve visible-region culling and gate detail by zoom.
- All decorative variation is a pure function of coordinates and tile data.

## Acceptance checks

- Re-rendering the same tile at the same coordinates produces the same appearance.
- Moisture/elevation and water-kind differences produce distinct base colours.
- Main map and minimap use the same terrain palette.
- Shoreline details mark actual water/land boundaries.
- World setup reports actual terrain proportions and actual nearby-resource/water information.
- The map key opens, closes, dismisses with Escape and is hidden with the rest of the UI.
- CI tests, type-check and production build pass. Browser review at whole-world, settlement and close zoom remains a release check.
