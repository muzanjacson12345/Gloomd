# GLOOMD — Shared Food Reserve and Communal Meals

**Status:** Approved implementation direction under the user's standing instruction to continue without routine approval  
**Date:** 2026-11-28  
**Branch:** main

## Intent

Make food part of the settlement economy rather than leaving every meal isolated in personal inventories. Food must be gathered, carried, stored and collected through real movement and exact quantity transfers. This is the first prerequisite for meaningful adaptive job allocation: the settlement can only detect and act on a shared shortage once it has a shared reserve.

## Behaviour

- Extend the existing communal stockpile with separate food and fish balances. Wood and stone remain the construction-material bundle and keep their existing atomic shelter withdrawal rules.
- Every stockpile resource keeps the existing per-resource capacity.
- Foragers proactively collect wild food, and fishers prefer fish while falling back to wild food, whenever the communal food reserve is below one ration per living inhabitant.
- Agents carry gathered food/fish physically in their existing inventory, walk to a reachable tile beside the stockpile, and deposit exact whole units. No remote teleporting or counter-only delivery.
- Food or fish already carried by an agent remains theirs to eat first when hunger becomes urgent. Otherwise, a gathered ration is delivered to shared storage.
- When an inhabitant reaches the normal hunger threshold and has no personal food, they may walk to the stockpile and withdraw one available ration. They eat it on a later simulation tick using the existing food-restoration rule.
- Water remains more urgent than food. An agent must still seek reachable freshwater before collecting a communal meal when thirst crosses its threshold.
- If storage is full or unreachable, the agent keeps the undelivered item; no quantity disappears.
- Emit events only when a real gather, deposit, ration withdrawal or meal occurs.
- Current jobs remain simple starter roles. This milestone does not yet implement skill growth or workforce reassignment; the shared reserve provides the demand signal those systems will need.

## Accounting and balancing

- The target communal reserve is one food unit per living inhabitant, capped by stockpile capacity.
- Food and fish are separate stored items but both count toward that target and both satisfy hunger.
- One unit is one meal; eating removes exactly one carried unit and lowers hunger using the existing configured restore amount.
- Existing resource patch quantities, local regrowth timers and finite-resource rules remain authoritative.
- Proactive gathering stops when the target reserve is reached. Urgent personal hunger can still trigger gathering when no shared ration is reachable.

## Persistence

- Portable world saves must include food and fish in the communal stockpile.
- Existing version-one saves that predate communal food storage migrate by adding zero food and zero fish; no world progress is discarded.
- Save round-trips must preserve stockpile food/fish and every personal inventory exactly.

## Non-goals

- No cooking, recipes, preservation, spoilage, nutrition quality, crops, hunting, trade, multiple stockpiles or household-specific food rights in this milestone.
- No adaptive profession allocator or skill system yet.
- No online service, paid API, new runtime dependency or background simulation.
