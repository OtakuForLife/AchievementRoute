# Achievement Route

A local page that turns the achievements you pick into one short list of actions. Shared work is done once.

No game is included. Put one JSON file per game in `data/`.

The planner **groups achievements into as few cycles as possible**, then merges steps inside each cycle. See [docs/algorithm.md](docs/algorithm.md).

## Run

```bash
docker compose up --build
```

Open http://localhost:5173. Game files in `data/` are on your machine, so a new JSON file shows up without rebuilding the image.

Without Docker: `npm install` then `npm run dev`. `npm run check` runs the planner checks. `npm run build` writes `dist/`.

## Game file

```json
{
  "id": "game-id",
  "name": "Game Name",
  "areas": [{ "id": "hub", "name": "Hub" }],
  "enemies": [{ "id": "rat", "name": "Rat" }],
  "results": [{ "id": "door-open", "name": "Door open" }],
  "items": [{ "id": "key", "name": "Key", "type": "key", "persist": true }],
  "actions": [
    {
      "id": "take-key",
      "type": "collect",
      "description": "Pick up the key",
      "area": "hub",
      "gives": [{ "item": "key", "amount": 1 }]
    },
    {
      "id": "open-door",
      "type": "interact",
      "description": "Open the door",
      "area": "hub",
      "requires": [{ "type": "inventory", "item": "key", "amount": 1 }],
      "sets": [{ "type": "result", "id": "door-open" }]
    }
  ],
  "achievements": [
    {
      "id": "opened",
      "name": "Opened",
      "description": "The door is open.",
      "conditions": [{ "type": "action", "id": "open-door" }]
    }
  ]
}
```

### Declared objects

All cross-references use **ids**. Names are for display only.

- `areas`, `enemies`, `results`, `items`, `actions`, `achievements`
- Item `type` is one of: `key`, `weapon`, `consumable`, `material`, `spell`, `soul`
- Item / result `persist: true` — survives a `newRun` action (default `false`)

### Actions

Types: `collect`, `interact`, `fight`, `go`, `farm`.

- `collect` and `farm` must `gives` at least one item
- `farm` needs `source: { "type": "enemy", "id" }`
- `requires`: `action` (must be in `done` this cycle), `inventory`, or `result`
- `before`: if both actions are needed, this one comes first; if the later action is already done this cycle, a reset is required
- `gives` / `consumes`: `{ "item", "amount" }`
- `sets` / `clears`: `{ "type": "result", "id" }` only
- `repeatable: true`: may appear more than once in the same cycle (`farm` is always repeatable)
- `newRun: true`: after this step, clear cycle progress — `done` clears; inventory/results keep only `persist: true` entries; once-only actions may be done again

### Achievements

Conditions must all hold (checked against actions ever performed):

- `{ "type": "action", "id" }`
- `{ "type": "any", "of": [ ... ] }`
- `{ "type": "achievement", "id" }` (nested; used for meta achievements like “complete everything”)

### Route display

The planner returns one flat step list. Each step has a `run` index (bumped by `newRun`). The UI can show **All steps** or **By run**.

A file that fails these rules is named and skipped. Unknown keys are ignored.
