# @AgentArenaAI — reference research for GLOOMD

**Research date:** 2026-11-27  
**Primary source:** https://www.youtube.com/channel/UC7MIVsLvY3kySLg83_S_x_Q/about  
**Channel name:** Agent Arena  
**Handle:** @AgentArenaAI

This is a durable research summary, not a claim that every video has been watched frame-by-frame. Use evidence labels:
- **A — directly shown:** visible in a video, screenshot, transcript or source repository.
- **B — creator-described:** stated by the channel/creator but not independently measured.
- **C — interpretation:** a reasonable reading of public material, not confirmed implementation detail.
- **D — GLOOMD recommendation:** our design decision, which need not match the channel's internal implementation.

## Channel identity and stated focus

The official channel is titled **Agent Arena**, handle **@AgentArenaAI**. Its public channel description frames the project as two stories: what the simulated inhabitants do, and how the engine is built. The description explicitly mentions agents fishing, cooking, hauling clay, running out of wood and splitting into new camps. **[A: channel description]**

Official channel:
https://www.youtube.com/channel/UC7MIVsLvY3kySLg83_S_x_Q/about

The channel description/indexing reported approximately 287 subscribers and 29 videos at the research snapshot. These counts are time-sensitive and should not be treated as current. **[A: snapshot of channel metadata]**

## Relevant indexed videos and claims

The following titles/URLs surfaced in the public research index:
- “This isn't reinforcement learning. It's something newer.” — https://www.youtube.com/shorts/aH-EkmahQTM
- “150 to 10,000 AI agents in one afternoon” — https://www.youtube.com/shorts/oT3JshHdCGA

The second title/description says the engine has been tested with 20 million agents. This is a creator claim, not an independent benchmark. **[B: creator description]**

The channel's public descriptions and indexed clips describe or depict:
- agents fishing and cooking;
- hauling clay and other resources;
- local shortages, including wood running out;
- a large colony splitting into multiple camps when nearby supplies become scarce;
- development of the simulation engine, including compute-shader and performance work.

Where full transcripts or complete video playback are unavailable to a future research session, do not invent more detailed algorithms, exact rates or UI controls. A previous research pass described an example of a 150-agent colony splitting into four camps, but should be treated as a publicly indexed/demo example rather than a proven general mechanic. **[B/C depending on video source and clip context]**

## What makes the reference world compelling

The durable lessons are not merely "use tiny characters" or "make a map look busy". The meaningful ingredients are:
1. Agents have needs and jobs that are connected to actual world state.
2. Resources have physical locations, quantities and a lifecycle.
3. Gathering, hauling, cooking and building take actions and time.
4. Consumption and overharvesting can create real shortages.
5. Local shortages can change agent behaviour and settlement geography.
6. The map lets an observer understand activity at multiple scales.
7. Engine performance is treated as a design constraint, not an afterthought.

These are design interpretations based on the public channel framing and demonstrations. **[C]**

## What GLOOMD should borrow — and what it should not assume

### Borrow the experience
- Large, quiet, top-down map with restrained graphics.
- Smooth camera pan/zoom and useful world/settlement/local scales.
- Tiny but legible people with continuous travel and understandable tasks.
- Visually traceable movement and transport when an observer asks to see them.
- Natural resource areas that change as agents use them.
- Settlements whose shape and location respond to resources, terrain and population.
- A minimal event feed and selective information layers rather than a permanent complex dashboard.

### Do not claim without evidence
- That AgentArenaAI uses a specific pathfinding algorithm, line-of-sight algorithm, ECS, WebGPU API, GPU kernel or data layout unless a source directly states it.
- That it provides rectangle selection, selectable path histories, a minimap, or specific observer controls if these are not visible in the relevant video.
- That its 20-million-agent claim is reproducible on ordinary computers or comparable with a browser-based simulation.

GLOOMD's group selection, path overlays, vision overlays and minimap are **our user-approved recommendations**, not assumed AgentArenaAI features. **[D]**

## Lessons applied to GLOOMD

### Smooth movement
GLOOMD's current simulation uses integer grid coordinates and updates an agent's tile immediately. The renderer draws the integer location, which looks like teleporting. Keep the grid for collision/pathfinding but interpolate the displayed character between tile centres. Visual interpolation must not make a gathering action happen before arrival or permit movement across blocked terrain. **[D]**

### Observer tools
Provide two distinct interaction modes:
- **OBSERVE (default):** click an inhabitant to inspect; drag to pan.
- **SELECT PEOPLE:** press the button first; then drag a rectangle to select multiple inhabitants. Escape exits selection mode. This prevents accidental conflicts with normal map movement. **[D]**

Make overlays optional and filtered:
- planned route to the current target;
- recent travel trail;
- target/destination marker;
- actual line-of-sight/vision area, not simply the resource-search radius;
- work/activity areas;
- later resource-density and settlement/territory overlays.

Do not display every path by default. Avoid heavy per-frame route and visibility calculations for every NPC. Cache or refresh overlays only when selected agents, positions or relevant world geometry change. **[D]**

### Scale-aware observation
- Whole-world view: terrain, rivers, forests, resource regions and settlement/population clusters.
- Settlement view: individual workers, buildings, stockpiles, routes and local activity.
- Close view: continuous walking, carrying, gathering, working, eating and resting.
- Provide a small minimap with camera rectangle, fit-world, focus-settlement, follow-agent and optional cinematic hide-UI mode. **[D]**

### Survival and ecology
A settlement should be constrained by food, water, shelter and useful materials. Trees, fish, wildlife, crops and mineral deposits should have different resource rules. A forest should not regenerate like a berry patch; a fish population should recover based on population and habitat; stone and clay should be finite. Scarcity should cause behaviour changes, travel, trade or migration. **[D]**

### Social emergence
Agent memory should be grounded in experiences and information received. Work specialisation, cooperation, families, trade, leadership, migration and culture should be layered after survival and resource accounting become reliable. **[D]**

## Independent research used as supporting references

These are not substitutes for the channel. They support specific design choices:

- **Generative Agents: Interactive Simulacra of Human Behavior** (Park et al., 2023): memory, retrieval, planning and reflection for believable agents.
  https://arxiv.org/abs/2304.03442
- **Project Sid: Many-agent simulations toward AI civilization** (2024): multi-agent societies, professions, collective rules and culture.
  https://arxiv.org/abs/2411.00114
- **Survival Games: Human-LLM Strategic Showdowns under Severe Resource Scarcity** (2025): food scarcity, health consequences and death as simulation state.
  https://arxiv.org/abs/2505.17937
- **Canvas 2D API** documentation: drawing paths, transformed map layers, clipping and dashed routes can be implemented using the browser's built-in rendering API without adding a paid service.
  https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D

## Source limitations and follow-up research

The available research pass retrieved the official channel description, indexed video titles/descriptions and selected public academic/technical sources. Full transcripts, complete time-coded observations for every video, the creator's private source code and independent verification of performance claims were not available in that pass. Future research should continue from the official channel and inspect individual videos, timestamps, descriptions and any creator-linked repositories. Update this file with new evidence, URLs, dates and the A/B/C/D label.
