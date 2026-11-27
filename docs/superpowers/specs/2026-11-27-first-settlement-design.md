# GLOOMD — First Settlement Design

**Status:** Approved next-stage scope, selected under the user's delegated direction
**Date:** 2026-11-27
**Repository:** `muzanjacson12345/Gloomd`
**Working branch:** `main`

## Intent

The first playable foundation is complete. The next visible step is to make inhabitants turn the map's wood and stone into real homes. This is a small, complete settlement-building loop, not a decorative building layer.

## Goals

- Give a deliberate minority of the initial population the builder role (one in five; six of the initial thirty).
- Let builders perceive, reach and gather wood and stone from actual resource nodes.
- Make gathering change both node quantity and the builder's inventory by the same amount.
- Require five wood and two stone to start one shelter.
- Place a shelter site on a free, walkable tile beside its builder. A tile containing a live resource, another living agent or any building is not a valid site.
- Consume the materials when construction begins. Construction then takes twelve builder-work ticks; urgent thirst and hunger remain higher priority and can interrupt work without losing the site.
- On completion, assign the shelter as that builder's home and emit a truthful completion event.
- Make both construction sites and completed shelters occupy their tile for navigation, and display them on the map.
- Add a Homes layer, a completed-shelter count and a home status in the selected-agent inspector.
- Label resource totals as resources found in nature, clearly distinct from agent inventories.

## Non-goals for this stage

No shared stockpile, cooperative multi-builder work, household capacity, families, relationships, player-placed buildings, farms, crafting, trade, autosave, save/load or PWA work. Those remain later stages. A builder creates at most one personal shelter in this stage.

## Behaviour and data decisions

- Roles: `forager` or `builder`. Starter-agent order is deterministic; every fifth agent is a builder.
- Material-gathering goals are `gather_wood` and `gather_stone`; construction goal is `build_shelter`.
- Builders gather one unit per successful resource action. They choose the nearest reachable matching node inside their perception radius, tie-breaking by resource ID. If none is visible and reachable, they explore.
- Survival retains priority: water first, then food, then energy recovery; building work happens only when those urgent needs do not take precedence.
- Shelter material cost: 5 wood + 2 stone. Work required: 12 eligible simulation ticks.
- A shelter tile is blocked as soon as its site is placed. The builder remains on a neighbouring tile; no agent may path through the site.
- Site placement checks adjacent tiles in the fixed order east, south, west, north. If none is valid, the builder keeps its materials and explores.
- A completed shelter has one owner/home link. No other inhabitant can claim it yet.
- All new decisions remain deterministic and use the existing world state/randomness model. No new runtime dependency, API, server or paid service is introduced.

## Approaches considered

1. **Decorative houses:** easy to draw, but does not solve the user's complaint because buildings would not consume resources or result from agent actions. Rejected.
2. **Individual builder-to-shelter loop (chosen):** a few builders gather their own materials, create a real construction site and complete a home. It is testable, local and fits the current per-agent inventory model.
3. **Full communal settlement with stockpiles and households:** better long-term architecture, but needs shared logistics, ownership, cooperation and storage together. Too broad for the next independently shippable step.

## Constraints

Keep the full-screen map-first interface, compact controls, visible-area Canvas renderer, seeded simulation, fixed-step clock, hidden-tab pause, 30-agent initial population, browser-local execution and free GitHub Pages hosting. No cloud simulation or per-agent LLM calls.
