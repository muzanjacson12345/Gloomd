# GLOOMD — project roadmap and durable decisions

**Last reviewed:** 2026-11-27  
**Status:** Living project plan; update as milestones are delivered.  
**Main repository:** https://github.com/muzanjacson12345/Gloomd  
**Live site:** https://muzanjacson12345.github.io/Gloomd/

This file exists so future sessions do not forget the user's approved direction. Read it before proposing changes. The current code and tests determine what is actually implemented; this roadmap describes the intended future.

## Product vision

Build a believable artificial civilization that can be watched at world, settlement and individual scale. The user is an observer of an autonomous world. The world should change because agents act within it: they find resources, travel, gather, carry, eat, build, cooperate, exhaust local supplies, adapt, migrate and establish new settlements.

The visual style should take strong inspiration from the compact, map-first presentation of @AgentArenaAI: restrained top-down 2D geography, small readable agents and structures, a large uninterrupted map, meaningful movement, and only enough interface to understand what is happening. Keep the simulation much deeper than the graphics suggest.

## User-approved experience

### Map and observation

- Full-window top-down 2D map is the main experience.
- Smooth pan and zoom; no dashboard-first layout or small map in a giant panel.
- World zoom: geography, resource regions, camps and population clusters.
- Settlement zoom: buildings, paths, groups, local resources and work activity.
- Close zoom: individual NPCs, smooth movement, carrying, gathering, working and resting.
- Camera controls should include fit-world, focus-settlement, focus-agent and follow-agent.
- Offer a hide-interface/cinematic observation mode. It should hide panels while leaving an easy way to restore them.
- Provide a small minimap with the current camera rectangle and click-to-jump navigation.
- Keep a compact event ticker for important actual world events.
- Map layers should be optional and should remember their preferences.

### Movement and selection

- NPCs must visibly travel between tile centres; do not teleport from tile to tile.
- Keep grid pathfinding/collision as the authoritative movement system. Interpolate the visual position between grid steps.
- Walking, carrying a load, working and resting should have recognisable but lightweight animation. Carrying weight, fatigue and difficult terrain may slow movement.
- Smooth visuals must not allow an NPC to cross blocked tiles, collect resources before arrival or bypass world rules.
- Default map interaction is OBSERVE: clicking selects/inspects one NPC; dragging pans the camera.
- Group selection is a separate, explicit SELECT PEOPLE mode, activated by a visible button. In that mode, dragging a rectangle selects all living NPCs in the area. Escape or toggling the button exits selection mode. Normal clicks and camera panning must not be accidentally hijacked.
- Support individual, multiple-agent and selected-area observation. An area selection can be used to inspect the people and activities contained in that area.
- Optional overlays, filterable by selected NPCs, group, area, settlement or all NPCs:
  - planned route to current destination;
  - recent travel trail;
  - vision / line of sight;
  - current destination/target;
  - work/activity area;
  - later settlement boundaries and territories.
- Distinguish actual line-of-sight from the larger radius used to search for resources. Obstacles should block vision when that system is implemented.
- Overlay layers should be disabled by default unless the user enables them. Avoid drawing every agent's path at once.

### Survival and ecology

- Hunger, thirst, energy, health, exposure and shelter should have real consequences.
- Starvation/dehydration should damage health over time and can eventually cause death; death must have a recorded cause.
- Age should advance. Birth and population growth should only occur when social conditions and resources support it.
- Resources exist at locations and have actual quantities. Wild-food and forest-timber patches now use independent recovery timers that restart after harvesting; stone remains non-renewable in this version.
- Forests should be reduced by harvesting and recover through slow regrowth. Wood must not simply reappear immediately.
- Wild food/plants are seasonal or habitat-dependent.
- Fish populations and wildlife herds should reproduce, migrate and decline under overharvesting.
- Stone, clay and ores are finite deposits.
- Seasons, weather, soil, moisture and climate should influence production and travel.
- Local depletion should force longer journeys, changing jobs, trade, migration or settlement splits.

### Economy and work

Every resource should follow a real lifecycle:

**Natural source → harvesting → carrying → storage → processing → production → consumption or construction.**

Planned systems include:
- farming, planting, crop growth, harvesting and storage;
- hunting and fishing with real populations;
- cooking and food preservation/spoilage;
- wood processing, planks, tools, clay processing and crafting;
- carrying capacities, transport time and multiple stockpiles;
- storage capacity, food spoilage and stock management;
- trading between people and settlements;
- tools that wear out and improve productivity.

Jobs should not be arbitrary permanent labels. Agents should develop skills through experience and adapt work when the settlement needs something different.

### Social life and civilization

Build progressively toward:
- individual memory grounded in observed events;
- relationships, families and households;
- cooperation, food sharing, teaching and communication;
- migration, camp founding and settlement splits;
- trade, leadership, shared rules and conflict;
- technology, traditions and culture.

These should emerge from needs, knowledge, geography, resource pressure and relationships. Do not simulate social complexity with fake labels or scripted events disconnected from world state.

## Technical constraints and architecture

- TypeScript + Vite, with native Canvas 2D as the current renderer.
- Browser executes the simulation locally. GitHub Pages only serves static files.
- No continuously running external server, paid AI/API, paid database or cloud simulation worker.
- Simulation advances only while app is open/active. No offline catch-up.
- Separate fixed simulation time from visual frame rendering.
- Save/load/autosave should use versioned browser-local storage (IndexedDB recommended) and validated portable export/import.
- Offline-first PWA should cache the app after first successful online visit.
- Render only visible map regions; use zoom-based detail, simple sprites and bounded overlays.
- Start with 30–50 meaningful agents. Increase toward 100–200 only after measurements on the user's actual PC. Never promise millions without benchmark evidence.
- No external remote assets required for normal play.

## Current implementation baseline (verified by source audit on 2026-11-27)

Already implemented:
- deterministic seeded terrain generation and configurable map sizes;
- coast, ocean, freshwater, lakes, rivers, grassland, forests, hills and mountains;
- four-direction grid pathfinding and blocked terrain/buildings;
- agents with hunger, thirst, energy, health, traits, inventories and simple roles;
- wild food gathering/eating, freshwater drinking and resting;
- finite wood/stone resource nodes and regenerating wild-food nodes;
- haulers that physically gather wood/stone and deliver them to one communal stockpile;
- one shelter recipe (5 wood + 2 stone) and construction work over 12 ticks;
- full-window Canvas 2D map, camera pan/zoom, zoom-dependent map detail and visible-region drawing;
- terrain/resource/people/buildings/stockpile layers;
- individual NPC click/inspector, follow mode and live activity roster;
- pause, 1x/2x/4x speed and stop simulation time when the tab is hidden;
- GitHub Pages static hosting.

Implemented in source in the current work session (fresh build/browser verification still pending):
- smooth visual interpolation between authoritative grid steps and lightweight walking bob/leg motion;
- button-activated SELECT PEOPLE mode, rectangle selection, group highlights and Escape-to-exit;
- optional selected-agent planned-route, recent-trail, destination and obstacle-aware line-of-sight overlays;
- separate sightRadius and resource-search perceptionRadius;
- minimap with camera viewport, click-to-jump, fit-world and a wider opening zoom;
- Hide UI / restore interface mode;
- versioned world-save format v1, validated JSON export/import, IndexedDB rolling autosave, 15-second active-tab checkpoints, save on pause/hidden, and auto-resume on startup;
- web-app manifest, SVG icon and service worker for offline app-shell caching.

Still not implemented:
- directional walking, distinct carrying/work/rest animations and movement speed changes for heavy loads or difficult terrain;
- work/activity-area overlays, resource density view, settlement boundaries and territory overlays;
- named save slots, save history and schema migrations beyond version 1; the PWA offline cache is in source but still needs browser verification;
- ageing, birth and population growth;
- full forest ecology with visible tree/sapling populations, fish and wildlife populations;
- fishing, hunting, farming, cooking, crafting, food preservation/spoilage and multi-stage production;
- adaptive jobs/skills, memories, relationships, families, communication or social learning;
- multiple settlements, stockpiles, migration/splitting, trade, governance, conflict, technology or culture.

## Development order

### Stage 1 — observer experience and movement

**Progress:** initial implementation added to source on 2026-11-27; fresh build/browser verification pending.

1. [x] Smooth visual interpolation between authoritative grid steps and lightweight walking motion.
2. [x] Button-activated rectangle selection, group highlight and Escape-to-exit.
3. [x] Selective routes, trails, destination markers and obstacle-aware vision overlay for selected agents.
4. [x] Minimap, fit-world, wider opening zoom and cinematic hide-UI mode.
5. [ ] Verify at 1x/2x/4x and ensure animation does not skip or desynchronise when multiple simulation ticks run in one display frame.
6. [ ] Add facing direction, carrying posture and load/terrain speed effects after the base movement is verified.

**Acceptance:** the user can watch a villager walk continuously between tiles; select one or a group without interfering with normal panning; switch overlays on/off; inspect routes and vision; navigate between whole-world and local views; hide the UI. Do not mark complete until browser testing confirms it.

### Stage 2 — reliable world persistence

**Progress:** initial implementation added to source on 2026-11-27; fresh GitHub Actions and browser verification pending.

1. [x] Versioned save model and JSON round-trip tests added.
2. [x] IndexedDB rolling autosave, 15-second active-tab checkpoints, save-on-pause/hidden, and auto-resume added.
3. [x] Manual Save Now / Load Last Save controls added.
4. [x] Portable JSON export/import with schema validation and a 50 MB import limit added.
5. [ ] Named save slots, save management and future schema migrations beyond version 1.
6. [ ] PWA shell caching and safe update behaviour.

**Acceptance:** close/reopen the app and restore the same world, time, map, agents, needs, inventories, buildings, resource quantities, events and starting point. Export/import reproduces the same world. Confirm this in an actual browser and verify all checks before marking this stage complete.

### Stage 3 — survival pressure and resource ecology

**Progress:** first survival consequences and patch-local recovery timers added to source on 2026-11-27; fresh build/browser verification pending.

1. [x] Critical hunger/thirst tracking, grace periods and health damage.
2. [x] Death events identify starvation or dehydration; carried inventory is dropped at the death location.
3. [x] Food patches recover slowly after harvest; timber recovers on a multi-day schedule; stone is finite.
4. [ ] Full per-agent daily nutrition/water budgets, illness, shelter exposure and recovery.
5. [ ] Forest biomass and sapling regrowth, fish populations, wildlife herds, carrying capacity and habitat.
6. [ ] Seasonal/weather influence and local resource depletion tests.
7. [ ] Tune survival and resource rates against actual population scenarios.

**Acceptance:** controlled tests prove that empty settlements deteriorate, agents can die for understandable reasons, overharvesting affects local resources, and natural regeneration is slow and habitat-dependent rather than a fixed global timer.

### Stage 4 — jobs, logistics and production chains
1. Goal selection and adaptive job allocation.
2. Farming, fishing and hunting.
3. Food storage, cooking, spoilage and preservation.
4. Crafting and tool durability.
5. Multiple stockpiles, transport routes and storage capacity.

**Acceptance:** every input/output can be accounted for; production only occurs with materials and labour; the settlement's work priorities respond to shortages.

### Stage 5 — society and emergent settlements
1. Experience-based skills and personal memory.
2. Relationships, households, families and cooperation.
3. Information sharing, teaching and trade.
4. New camps, migration and settlement splits.
5. Leadership, collective rules, conflict, technology and culture.

**Acceptance:** scenarios with resource pressure can produce believable adaptation, cooperation or migration without hard-coded outcomes.

### Stage 6 — performance, balancing and release quality
1. Measure frame rate, simulation ticks per second, memory and input latency.
2. Optimise using spatial indexing, update scheduling, culling and level-of-detail.
3. Benchmark on the user's modest PC.
4. Tune resource rates, need rates, population and production cycles.
5. Test saves, offline operation, browser resize, pause and high simulation speed.

## Development protocol

- Keep this roadmap current and record major decisions in Git.
- Before each new feature, inspect the code and relevant design spec.
- Write tests before implementation for simulation logic, movement, selection, overlays and persistence.
- Only describe features as implemented when code and tests demonstrate them.
- When research is incomplete, label assumptions and recommendations instead of pretending they were verified.
