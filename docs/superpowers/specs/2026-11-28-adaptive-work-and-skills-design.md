# GLOOMD — Adaptive Work and Skill Development

**Status:** Design for the next implementation milestone
**Date:** 2026-11-28

## Goal

Villagers should have a current occupation that can change when the settlement's needs change. Occupations must direct actual actions and resource flows; they are not cosmetic labels. Work experience should gradually improve relevant skills and influence who is chosen for each task.

## Core distinction

- **Role/job:** the current work assignment (forager, fisher, hauler, builder). It may change.
- **Goal/task:** the immediate action (walk to food, gather, deliver, collect a meal, build, rest, drink). It changes as the agent acts.
- **Skill:** learned competence in a type of work. It persists when the agent changes jobs.

## Settlement demand signals

Job reviews use real world state:

- food deficit: communal food and fish reserve compared with one ration per living inhabitant;
- material deficit: the outstanding wood/stone needed for a shelter recipe, including material already carried by living haulers;
- construction demand: number of unhoused inhabitants and available shelter materials/sites;
- worker condition: living status, hunger, thirst, energy and health;
- access and capability: reachable resources and the villager's skills.

Survival decisions stay above job allocation. Thirst, urgent hunger and exhaustion can interrupt work at any time.

## Allocation rules

- Reassess periodically, not every tick. A job should last long enough to be meaningful.
- Keep builders assigned to active construction until the building is complete or the project becomes impossible.
- When the food reserve is low, allocate enough healthy available workers to forage/fish. Fishers are chosen only when reachable fish patches exist; others forage.
- When food is adequately stocked but shelters are still needed, release excess food workers and allocate haulers/builders according to real material and construction deficits.
- When required shelter materials are already committed, stop sending additional haulers for that recipe.
- When there is no meaningful job shortage, workers can explore/rest rather than perform fake work.
- Choose workers using skill fit, diligence and accessibility, while preserving assignments when candidates are similarly suitable.
- Emit a clear job-change event with the reason so the user can understand why a villager changed occupation.

## Skills

Each inhabitant has persistent 0–100 skill ratings for foraging, fishing, hauling and building. A skill grows only after its corresponding real action succeeds or real work is completed. It never grows from merely being assigned a job. Skills influence allocation and may later influence carrying amounts or work speed once those effects are tested and balanced.

Starter roles receive a small, deterministic head start in their initial specialty. Other skills can still develop through practice. Traits remain separate from skills.

## Stability

- Job reviews occur at a fixed world-time interval.
- Avoid switching when the current assignment is still useful and the alternative is only marginally better.
- Use hysteresis around reserve thresholds and a minimum assignment duration for ordinary changes.
- Emergency need-seeking is never delayed by job stability rules.

## Persistence and determinism

- Skills and role-change timing are part of the saved world state.
- Older version-one saves gain safe default skill values and role timing during migration.
- The same world seed and state must produce the same assignments and events.

## Non-goals for the first version

- No LLM calls, paid services or remote agents.
- No personality-based social simulation, family roles, professions requiring crafting, farming/hunting or trade until those actual production systems exist.
- Do not add jobs that have no real corresponding simulation action.
- Do not simulate productivity boosts until their input/output accounting is tested.

## Acceptance

1. In a controlled food shortage, available workers move from non-urgent work into gathering/delivery.
2. When food reserves recover and shelter materials are missing, some workers change to hauling/building.
3. When the shelter recipe is satisfied, redundant haulers stop gathering materials.
4. Skills rise only from completed actions and make later assignments measurably more appropriate.
5. No job change makes resources appear, disappear or move without a real agent action.
6. Jobs do not flap continuously, and urgent survival behavior always takes precedence.
7. Save/load preserves skills and assignments; previous saves migrate safely.