# GLOOMD — instructions for future contributors

Before changing this project, read these files in this order:

1. [Project roadmap](docs/PROJECT_ROADMAP.md) — enduring goals, constraints and stage order.
2. [AgentArenaAI reference research](docs/research/AGENTARENAAI_REFERENCE.md) — source-checked inspiration and evidence limits.
3. The most recent relevant design in [docs/superpowers/specs](docs/superpowers/specs/).
4. The implementation plan that matches the task in [docs/superpowers/plans](docs/superpowers/plans/).

These documents are the durable source of truth for GLOOMD. Update them when the user changes direction or a feature is delivered. Do not silently replace the project's vision with a generic game template.

## Product identity

GLOOMD is a minimalist, top-down 2D artificial-life/civilization simulation. It should feel like observing a living world, not operating a dashboard or controlling a conventional RTS army. The map must dominate the screen. Keep UI compact, legible and hidden until useful. Prioritise coherent world behaviour and visible consequences over decorative effects.

Use AgentArenaAI as the main visual and simulation reference, but distinguish channel-confirmed facts from our interpretations and recommendations. Do not invent claims about what the creator implemented.

## Non-negotiable constraints

- Keep the app browser-based, local-first and free to host/use.
- The simulation runs only while the app is open and active; hidden/closed tabs do not accrue simulation time.
- Do not add paid APIs, subscriptions, cloud simulation servers, paid databases or features that require a credit card.
- The user's PC is modest. Measure before increasing agent counts or switching renderers.
- Prefer TypeScript, Vite and the existing native Canvas 2D renderer unless profiling demonstrates a real need to change.
- Preserve the full-window map, pan/zoom and unobtrusive inspection.
- Simulation state is authoritative. Rendering may interpolate visuals, but must not invent movement, resources or actions.
- Grid pathfinding and collision remain authoritative even when visual movement is smooth.
- All actions that gather, consume, carry, craft or build must update actual world quantities.
- Save/load must preserve the complete simulation state. Save format v1 and IndexedDB autosave are now in source; do not claim they are verified until fresh tests and browser checks pass.
- The web-app manifest and offline service worker are now in source; do not claim offline behaviour is verified until tested after a successful first online visit.
- Survival timers, starvation/dehydration damage, gradual health recovery, death records, inventory drops, local resource recovery timers, visible forest clearings/saplings and the initial freshwater-bank fishing loop are now in source; keep tuning evidence-based and test all state changes.
- One simulation tick is one displayed world minute. Current initial need rates are hunger +0.08/minute and thirst +0.12/minute; these are tuning values, not universal truths.
- Fish resources are local patches, not full moving animal populations. Fishing/catching/eating is implemented; cooking, boats, fisheries management and ecosystem reproduction remain future work.

## Development rules

- Inspect the relevant files and current implementation before editing.
- Use test-driven development for behaviour changes: write a test, verify it fails for the intended reason, implement, then run the focused test and full suite.
- Keep changes small enough to review. Use the existing GitHub Actions checks for typecheck, tests and build; do not claim they passed without inspecting a fresh run.
- Never add UI toggles that do nothing. Clearly mark planned features as planned, not implemented.
- Preserve the user's explicit preference to work directly on the repository's `main` branch. Do not change visibility, Pages settings, billing or external account settings.
- Keep docs/research and docs/roadmap in sync with the actual implementation.
- Never expose keys, tokens, private user data or other credentials.
- Explain progress in simple language. The user does not need to edit source code manually.

## Current development priority

See [docs/PROJECT_ROADMAP.md](docs/PROJECT_ROADMAP.md). The observer, local persistence, PWA app shell and first survival/resource-pressure mechanics now have initial implementations; verify them before extending them. Next priorities are full ecology (trees, fish populations and wildlife), farming/hunting/cooking, production chains and emergent settlement behaviour.
