# GLOOMD — Occupation, Terrain and Exploration Implementation Plan

**Spec:** docs/superpowers/specs/2026-11-28-occupation-rendering-exploration-design.md

1. Role palette, clothing tint, letter badges, group role markers, roster chips and MAP KEY legend.
2. Cached terrain base raster and lazy detail chunks; active redraw capped at 30 fps and paused redraw idle.
3. Desktop layout overrides for header, map tools, layers, roster, event feed, minimap and playback.
4. Shared farm field access for every farmer.
5. Per-agent and settlement-wide line-of-sight memory, frontier routing and wait state when known ground is exhausted.
6. Save/load validation, legacy version-one defaults and regression tests.
7. Update project documentation and verify GitHub Actions CI and Pages publishing. Keep manual browser and actual hardware checks explicitly separate.
