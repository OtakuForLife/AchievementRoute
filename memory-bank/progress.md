# Progress

Works:

- A\* route planner (world state, persist flags, newRun reset); see `docs/algorithm.md`.
- Game select, achievement search/toggles, Generate Route, all-steps / by-run, checkoffs, copy, localStorage.
- Data tab: edit the selected game and save it back to `data/`.
- Farms, results, repeatable, meta achievements, missable `before`.
- `npm run check` passes (15 planner + editGame).
- Demo `data/demo.json` (Ashen Keep).
- Offline DSR JSON (41 achievements); Link Fire + Dark Lord replays Asylum→Lordvessel after ending.

Not built:

- Area travel cost / roads.
- Attribute/stat requires.
- Exact “before N of a set” missable counters.
- Online / co-op route mode.
- Weighted / timed routes (action count only).
