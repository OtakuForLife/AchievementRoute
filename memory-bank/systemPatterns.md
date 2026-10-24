# System patterns

`src/loadGames.js` globs `data/*.json` and keeps files that pass `validateGame`.

`src/route.js` builds a route by ensuring achievement conditions (including nested achievements and `any` branches). State tracks inventory, results, done-this-run, and run index. Once-only actions can be scheduled again after a `newRun` step. Farms/`repeatable` can repeat in the same run. Results are set/cleared by actions and required like inventory. On `newRun`, results clear and inventory is filtered by `persistItemTypes`.

`src/route.check.js` holds planner fixtures. The app does not import it.

`scripts/build-dsr.js` authors the Dark Souls Remastered data file.
