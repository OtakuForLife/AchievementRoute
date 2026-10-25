# Active context

Planner counts scarce once-only copies, packs every other achievement into the fullest legal run, then orders that run along achievement chains. Per-item/result `persist` on `newRun`. UI: dark field-guide, game select above Route and Data tabs, worker planning, search, checkoffs, copy, localStorage, collapsible runs.

Data tab edits the selected game and saves `data/<file>` through the Vite `PUT /api/games` plugin. Invalid drafts are not written. A save rewrites the file as two-space JSON.

`data/demo.json` is Ashen Keep. `data/dark-souls-remastered.json` comes from `node scripts/build-dsr.js` — keys/Lordvessel/embers do not persist; weapons/spells/materials/souls/estus and covenant results do. `begin-next-cycle` is a `newRun` with no achievement, used when a later cycle is not an ending the player selected.

Assumptions for DSR: offline only; Rhea-style missables use `before`; stats are description/dummy actions.
