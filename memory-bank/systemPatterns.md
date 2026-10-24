# System patterns

`src/loadGames.js` globs `data/*.json` and keeps files that pass `validateGame`.

`src/route.js` uses **group-and-merge**: solo greedy plans → conflict graph (cannot share one cycle) → min coloring (runs) → greedy merge per group → `newRun` between groups. World state is `done` / `results` / `inventory` / `everDone`; persist is per item/result. See `docs/algorithm.md`.

`src/route.check.js` holds planner fixtures. The app does not import it.

`src/App.jsx` is the whole UI: picker + route panel. Persistence is one `localStorage` blob keyed by game. Planning runs in `plan.worker.js` via `planAsync.js` so the UI stays responsive.

`scripts/build-dsr.js` authors the Dark Souls Remastered data file (per-item/result `persist` flags for NG+).
