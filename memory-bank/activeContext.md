# Active context

Planner is group-and-merge (solo resolve → conflict coloring → merge per run) with per-item/result `persist` on `newRun`. UI: dark field-guide, worker planning, search, checkoffs, copy, localStorage, collapsible runs.

`data/ashen-keep` via `demo.json`. `data/dark-souls-remastered.json` from `node scripts/build-dsr.js` — keys/Lordvessel/embers do not persist; weapons/spells/materials/souls/estus and covenant results do.

Assumptions for DSR: offline only; Rhea-style missables use `before`; stats are description/dummy actions.
