# SDD ledger — procedural worlds and settlement construction

Base: b8ec2f2a4c115087e6f64e3b393c28f162949f2a
Execution: direct on main.

- [x] Review current terrain, map-size API, stockpile placement and NPC construction code.
- [x] Identify that the generator uses a fixed west ocean, one fixed east lake and one fixed river; map dimensions are only internal API options; UI does not expose them.
- [x] Identify the settlement mismatch: spawn location is user-selected, but stockpile remains near world centre. Haulers carry one unit per trip; builders report Explore when waiting for supplies or a nearby free site.
- [x] Design and plan saved.
- [ ] Task 1: randomized terrain, water and selectable map sizes.
- [ ] Task 2: settlement logistics and visible builder states.
- [ ] Task 3: docs, self-review and Pages deployment.

No independent reviewer or live browser test is available; final review must be an author self-review. CI and deployed artifact will be verified before completion.
