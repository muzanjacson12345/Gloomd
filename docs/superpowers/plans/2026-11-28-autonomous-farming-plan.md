# GLOOMD Autonomous Farming Implementation Plan

**Spec:** docs/superpowers/specs/2026-11-28-autonomous-farming-design.md  
**Execution:** direct on main, as requested.

## Tasks

1. **State and crop lifecycle**
   - Add farmer role, farming skill and persistent farm plot/seed state.
   - Implement field suitability, preparation, planting, moisture-weighted growth, periodic tending and exact harvest accounting.
   - Preserve older version-one saves by adding empty fields and a starter seed reserve.

2. **Autonomous work**
   - Give farmers real reachable destinations and work actions.
   - Allocate a small farmer workforce when seeds or farm plots exist.
   - Make farmers wait at fields when no action is useful rather than continuously exploring.
   - Keep survival and urgent personal hunger above farming, and use existing physical food delivery.

3. **Observation**
   - Draw prepared, growing and ripe crop plots in Canvas 2D.
   - Show seed reserve and field count in the existing stockpile status.
   - Add clear task labels and readable activity colours.

4. **Regression tests and docs**
   - Test field suitability, seed use, growth, tending, harvest, seed recycling and autonomous harvest.
   - Update implementation boundaries and the roadmap.
   - Require passing tests, strict typecheck and static production build.
