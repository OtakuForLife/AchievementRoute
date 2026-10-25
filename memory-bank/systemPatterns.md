# System patterns

`src/loadGames.js` globs `data/*.json` and keeps files that pass `validateGame`. It also records each game's filename.

`src/route.js` uses **group-and-merge**: solo greedy plans → conflict graph (cannot share one cycle) → min coloring (runs) → greedy merge per group → `newRun` between groups. World state is `done` / `results` / `inventory` / `everDone`; persist is per item/result. See `docs/algorithm.md`.

`src/route.check.js` holds planner fixtures. The app does not import it.

`src/App.jsx` is the route UI. The game select sits above two tabs: Route (picker + route panel) and Data (`src/Editor.jsx`). Persistence of picks is one `localStorage` blob keyed by game. The open tab is `sessionStorage`. Planning runs in `plan.worker.js` via `planAsync.js` so the UI stays responsive.

`src/Editor.jsx` edits the selected game in memory and saves with `PUT /api/games/<file>`. The Vite plugin in `vite.config.js` validates with `validateGame` and writes `data/<file>`. It only overwrites an existing file. Saving rewrites the file with two-space JSON.

`scripts/build-dsr.js` authors the Dark Souls Remastered data file (per-item/result `persist` flags for NG+).
