# Product context

Hunters pick a game, mark one or more achievements, and press Generate Route. The page writes what to do, in order, with the achievement name on the line that earns it. Display can be one continuous list or grouped by run.

The UI is a field-guide tool: search and select achievements, sticky Generate, check off steps while playing, and copy the route as plain text. Game, picks, display mode, and checked steps persist in localStorage.

An empty `data/` folder shows no games. A bad file is named and skipped. Selecting nothing asks for at least one achievement. Regenerating keeps checkmarks that still match the new step list.

The list is the product. Shared work is done once. Extra runs appear as normal steps (including `newRun` actions) in the same route.
