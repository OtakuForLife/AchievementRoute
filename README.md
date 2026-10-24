# Achievement Route

A local page that turns the achievements you pick into one short list of actions. Shared work is done once.

No game is included. Put one JSON file per game in `data/`.

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
  "persistItemTypes": ["key", "weapon", "material", "spell", "soul"],
  "areas": [{ "id": "hub", "name": "Hub" }],
  "enemies": [{ "id": "rat", "name": "Rat" }],
  "results": [{ "id": "door-open", "name": "Door open" }],
  "items": [{ "id": "key", "name": "Key", "type": "key" }],
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
- `persistItemTypes` lists which item types survive a `newRun` action (world results always clear)

### Actions

Types: `collect`, `interact`, `fight`, `go`, `farm`.

- `collect` and `farm` must `gives` at least one item
- `farm` needs `source: { "type": "enemy", "id" }`
- `requires`: `action`, `inventory`, or `result` (result must already be set)
- `before`: if both actions are on the list, this one comes first; if the later action is already done this run, the planner starts a new run when needed
- `gives` / `consumes`: `{ "item", "amount" }`
- `sets` / `clears`: `{ "type": "result", "id" }` only
- `repeatable: true`: may appear more than once in the same run (`farm` is always repeatable)
- `newRun: true`: after this step, a new run begins — once-only actions may be done again; inventory keeps only `persistItemTypes`

### Achievements

Conditions must all hold:

- `{ "type": "action", "id" }`
- `{ "type": "any", "of": [ ... ] }`
- `{ "type": "achievement", "id" }` (nested; used for meta achievements like “complete everything”)

### Route display

The planner returns one flat step list. Each step has a `run` index. The UI can show **All steps** or **By run**.

A file that fails these rules is named and skipped. Unknown keys are ignored.
