# Active context

Planner supports farms, live result states, repeatable actions, `newRun` + `persistItemTypes`, and achievement-as-condition. UI toggles all-steps vs by-run.

`data/ashen-keep.json` is the small demo. `data/dark-souls-remastered.json` is a full offline 41-achievement graph (regenerate with `node scripts/build-dsr.js`).

Assumptions for DSR: offline only; Rhea-style “N of set” missables use conservative `before` ordering; stats are description/dummy actions.
