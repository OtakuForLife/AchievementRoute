# Active context

Planner supports farms, live result states, repeatable actions, `newRun` + `persistItemTypes`, and achievement-as-condition. UI toggles all-steps vs by-run.

UI is a dark field-guide layout (IBM Plex): achievement search, selected count/clear, sticky generate, step checkoffs, copy route, localStorage session restore. Lists scroll inside the viewport; the page itself does not.

`data/ashen-keep.json` is the small demo. `data/dark-souls-remastered.json` is a full offline 41-achievement graph (regenerate with `node scripts/build-dsr.js`).

Assumptions for DSR: offline only; Rhea-style “N of set” missables use conservative `before` ordering; stats are description/dummy actions.
