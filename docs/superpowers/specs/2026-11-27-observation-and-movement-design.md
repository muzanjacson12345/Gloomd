# GLOOMD — Smooth movement and observation experience

**Status:** Approved for implementation by the user on 2026-11-27  
**Repository:** muzanjacson12345/Gloomd  
**Primary reference:** docs/research/AGENTARENAAI_REFERENCE.md  
**Roadmap:** docs/PROJECT_ROADMAP.md

## Intent

Make GLOOMD look and feel like an observer window into an active world. NPCs should walk visibly instead of teleporting; the user should be able to select groups safely and inspect what they are doing; the map should remain large and easy to observe at every zoom level.

## User-approved behaviour

- NPCs move continuously between tile centres.
- Grid pathfinding remains responsible for legal movement and collision.
- Walking and loaded movement can use different speeds; animation can later distinguish working/resting.
- Default mode is OBSERVE: click inspects an NPC, drag pans the map.
- A visible SELECT PEOPLE button explicitly activates rectangle selection. Dragging selects agents inside the box. Escape or toggling the mode exits selection. Ordinary panning/inspection remain unchanged outside the mode.
- Overlays are separately switchable: current routes, recent travel trails, destinations/targets, and vision/line of sight.
- Overlays apply to selected NPCs or groups, not all agents by default.
- Vision must eventually differ from resource search radius and be blocked by opaque terrain/objects.
- The view should be easier to observe with fit-world, minimap, follow/focus tools and hide-UI/cinematic mode.
- Map-first visual style and low-PC performance are mandatory.

## Approaches considered

1. **Render-time tweening only:** infer motion from old and new positions inside the renderer. Simple, but simulation may advance multiple times between render frames at 2x/4x or during a delayed frame, losing intermediate moves.
2. **Simulation-to-render movement queue (recommended):** each fixed simulation tick records actual tile transitions; a small visual animator plays those exact transitions at simulation-time speed. This preserves the real path and remains synchronized with 1x/2x/4x. Renderer remains read-only with respect to world state.
3. **Continuous floating-point position as authoritative movement:** precise but requires rewriting pathfinding, occupancy and action timing. Too invasive for this first milestone.

Recommended approach is (2): maintain authoritative integer tile coordinates and enqueue actual completed movement steps for smooth visual interpolation. Animation must not change when an action becomes valid or when a resource gets collected.

## Scope of this implementation slice

- Movement interpolation and short movement-history trail for selected agents.
- Button-activated rectangle selection with Escape-to-exit and group highlight.
- Optional current route/target overlays for selected agents where a reliable current target can be derived.
- Optional vision-area overlay, clearly represented as a visual perception range if accurate occlusion is not yet implemented. Do not claim line-of-sight if it is not computed.
- Compact overlay menu.
- Minimap and camera fit/focus controls where feasible.
- Hide-interface mode with a small restore affordance.
- Add tests for the movement animator, selection geometry and vision logic if implemented.
- Keep native Canvas 2D; use caches and limit overlay calculations to selected agents.

## Non-goals in this slice

- No WebGL/PixiJS migration without profiling evidence.
- No command-issued RTS unit movement; NPCs remain autonomous.
- No full fog-of-war knowledge system or permanent memory of every seen tile.
- No paid services, remote simulation server or LLM calls.
- No changes to world economics/survival rates in the same UI task unless a dedicated, tested survival task is added.

## Acceptance criteria

- At 1x, 2x and 4x, a walking NPC visibly traverses the space between tile centres and arrives at the same legal tile the simulation chose.
- Multiple fixed simulation steps between frames play in order rather than skipping locations.
- When paused/hidden, animation stops and does not catch up while inactive.
- Outside SELECT PEOPLE mode, dragging pans and clicking selects one NPC.
- In SELECT PEOPLE mode, drag-box selects multiple agents and renders the selection rectangle; Escape exits.
- Selected agents remain selected as a group while the user enables/disables overlay toggles.
- Routes/trails/targets are not shown for every agent unless the user explicitly selects all.
- Any overlay is truthful about its meaning. Resource-search radius must not be mislabeled as exact sight.
- Minimap/fit/focus/cinematic controls do not obscure the map or overwhelm low-end hardware.
- Existing world generation, resource, construction and movement tests remain green.
