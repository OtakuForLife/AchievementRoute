# Product context

Hunters pick a game, mark one or more achievements, and press Generate Route. The page writes what to do, in order, with the achievement name on the line that earns it. Display can be one continuous list or grouped by run.

The game picker stays above two tabs. Route is the field-guide: search and select achievements, sticky Generate, check off steps while playing, and copy the route as plain text. Data edits the selected game (areas, items, enemies, results, actions, achievements) and writes the JSON file back. Game, picks, display mode, and checked steps persist in localStorage. The open tab persists in sessionStorage.

An empty `data/` folder shows no games. A bad file is named and skipped. Selecting nothing asks for at least one achievement. Regenerating keeps checkmarks that still match the new step list. A data edit that does not validate is not written.

The list is the product. Shared work is done once. Extra cycles appear when a `newRun` action resets world progress (with per-item/result persist exceptions).
