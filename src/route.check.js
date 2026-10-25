import assert from 'node:assert/strict'
import { planRoute, validateGame } from './route.js'

const area = { id: 'here', name: 'Here' }
const there = { id: 'there', name: 'There' }

function game(partial) {
  return {
    id: 'fixture',
    name: 'Fixture',
    areas: [area, there],
    enemies: partial.enemies ?? [],
    results: partial.results ?? [],
    items: partial.items ?? [{ id: 'token', name: 'Token', type: 'key', persist: true }],
    actions: partial.actions,
    achievements: partial.achievements,
  }
}

function ids(result) {
  assert.equal(result.ok, true, result.message)
  return result.steps.map((step) => step.id)
}

let passed = 0

function check(name, fn) {
  fn()
  passed += 1
  console.log(`ok ${name}`)
}

check('validate rejects area sets and accepts farm source ids', () => {
  const bad = game({
    actions: [
      {
        id: 'x',
        type: 'interact',
        description: 'X',
        area: 'here',
        sets: [{ type: 'area', id: 'there' }],
      },
    ],
    achievements: [{ id: 'a', name: 'A', description: 'A', conditions: [{ type: 'action', id: 'x' }] }],
  })
  assert.match(validateGame(bad), /unknown set/i)

  const good = game({
    enemies: [{ id: 'rat', name: 'Rat' }],
    items: [{ id: 'tooth', name: 'Tooth', type: 'material' }],
    actions: [
      {
        id: 'farm',
        type: 'farm',
        description: 'Farm',
        area: 'here',
        source: { type: 'enemy', id: 'rat' },
        gives: [{ item: 'tooth', amount: 1 }],
      },
    ],
    achievements: [{ id: 'a', name: 'A', description: 'A', conditions: [{ type: 'action', id: 'farm' }] }],
  })
  assert.equal(validateGame(good), null)
})

check('key is taken before the door and is not consumed', () => {
  const result = planRoute(
    game({
      actions: [
        { id: 'take', type: 'collect', description: 'Take the key', area: 'here', gives: [{ item: 'token', amount: 1 }] },
        {
          id: 'door-a',
          type: 'interact',
          description: 'Open the first door',
          area: 'here',
          requires: [{ type: 'inventory', item: 'token', amount: 1 }],
        },
        {
          id: 'door-b',
          type: 'interact',
          description: 'Open the second door',
          area: 'here',
          requires: [{ type: 'inventory', item: 'token', amount: 1 }],
        },
      ],
      achievements: [
        { id: 'a', name: 'First', description: 'First door', conditions: [{ type: 'action', id: 'door-a' }] },
        { id: 'b', name: 'Second', description: 'Second door', conditions: [{ type: 'action', id: 'door-b' }] },
      ],
    }),
    ['a', 'b'],
  )
  assert.deepEqual(ids(result), ['take', 'door-a', 'door-b'])
})

check('one potion cannot pay for two drinks', () => {
  const result = planRoute(
    game({
      actions: [
        { id: 'brew', type: 'collect', description: 'Brew', area: 'here', gives: [{ item: 'token', amount: 1 }] },
        {
          id: 'drink',
          type: 'interact',
          description: 'Drink',
          area: 'here',
          consumes: [{ item: 'token', amount: 1 }],
        },
        {
          id: 'drink-more',
          type: 'interact',
          description: 'Drink again',
          area: 'here',
          consumes: [{ item: 'token', amount: 1 }],
        },
      ],
      achievements: [
        { id: 'once', name: 'Sip', description: 'Drink', conditions: [{ type: 'action', id: 'drink' }] },
        { id: 'twice', name: 'Another', description: 'Drink again', conditions: [{ type: 'action', id: 'drink-more' }] },
      ],
    }),
    ['once', 'twice'],
  )
  assert.equal(result.ok, false)
  assert.match(result.message, /No route|Token|token|new run/i)
})

check('a second brew covers a second drink', () => {
  const result = planRoute(
    game({
      actions: [
        { id: 'brew', type: 'collect', description: 'Brew', area: 'here', gives: [{ item: 'token', amount: 1 }] },
        {
          id: 'brew-again',
          type: 'collect',
          description: 'Brew another',
          area: 'here',
          gives: [{ item: 'token', amount: 1 }],
        },
        {
          id: 'drink',
          type: 'interact',
          description: 'Drink',
          area: 'here',
          consumes: [{ item: 'token', amount: 1 }],
        },
        {
          id: 'drink-more',
          type: 'interact',
          description: 'Drink again',
          area: 'here',
          consumes: [{ item: 'token', amount: 1 }],
        },
      ],
      achievements: [
        { id: 'once', name: 'Sip', description: 'Drink', conditions: [{ type: 'action', id: 'drink' }] },
        { id: 'twice', name: 'Another', description: 'Drink again', conditions: [{ type: 'action', id: 'drink-more' }] },
      ],
    }),
    ['once', 'twice'],
  )
  const steps = ids(result)
  assert.ok(steps.includes('brew') && steps.includes('brew-again'))
  assert.equal(steps.length, 4)
})

check('shared grant replaces a private one when both achievements are selected', () => {
  const shared = game({
    actions: [
      { id: 'pickup-a', type: 'collect', description: 'Private token', area: 'here', gives: [{ item: 'token', amount: 1 }] },
      { id: 'pickup-b', type: 'collect', description: 'Shared token', area: 'here', gives: [{ item: 'token', amount: 1 }] },
      {
        id: 'finish',
        type: 'interact',
        description: 'Spend the token',
        area: 'here',
        requires: [{ type: 'inventory', item: 'token', amount: 1 }],
      },
    ],
    achievements: [
      { id: 'done', name: 'Done', description: 'Finish', conditions: [{ type: 'action', id: 'finish' }] },
      { id: 'picked', name: 'Picked', description: 'Shared pickup', conditions: [{ type: 'action', id: 'pickup-b' }] },
    ],
  })
  assert.deepEqual(ids(planRoute(shared, ['done'])), ['pickup-a', 'finish'])
  assert.deepEqual(ids(planRoute(shared, ['done', 'picked'])), ['pickup-b', 'finish'])
})

check('action requirement is included and ordered first', () => {
  const result = planRoute(
    game({
      items: [],
      actions: [
        { id: 'take', type: 'interact', description: 'Take', area: 'here' },
        { id: 'open', type: 'interact', description: 'Open', area: 'here', requires: [{ type: 'action', id: 'take' }] },
        { id: 'ring', type: 'interact', description: 'Ring', area: 'here', requires: [{ type: 'action', id: 'open' }] },
        { id: 'unrelated', type: 'fight', description: 'Fight something else', area: 'there' },
      ],
      achievements: [{ id: 'bell', name: 'Bell', description: 'Ring it', conditions: [{ type: 'action', id: 'ring' }] }],
    }),
    ['bell'],
  )
  assert.deepEqual(ids(result), ['take', 'open', 'ring'])
  assert.deepEqual(result.steps.at(-1).achievements, ['Bell'])
})

check('before orders a missable action first', () => {
  const missable = game({
    items: [],
    actions: [
      { id: 'kill', type: 'fight', description: 'Kill the speaker', area: 'here' },
      { id: 'talk', type: 'interact', description: 'Talk first', area: 'here', before: ['kill'] },
    ],
    achievements: [
      { id: 'talker', name: 'Talker', description: 'Talk', conditions: [{ type: 'action', id: 'talk' }] },
      { id: 'killer', name: 'Killer', description: 'Kill', conditions: [{ type: 'action', id: 'kill' }] },
    ],
  })
  assert.deepEqual(ids(planRoute(missable, ['talker'])), ['talk'])
  assert.deepEqual(ids(planRoute(missable, ['talker', 'killer'])), ['talk', 'kill'])
})

check('results can be set required and cleared', () => {
  const fixture = game({
    results: [{ id: 'down', name: 'Down' }],
    items: [{ id: 'soul', name: 'Soul', type: 'soul' }],
    actions: [
      { id: 'break', type: 'interact', description: 'Break', area: 'here', sets: [{ type: 'result', id: 'down' }] },
      {
        id: 'loot',
        type: 'collect',
        description: 'Loot',
        area: 'here',
        requires: [{ type: 'result', id: 'down' }],
        gives: [{ item: 'soul', amount: 1 }],
      },
      {
        id: 'fix',
        type: 'interact',
        description: 'Fix',
        area: 'here',
        requires: [
          { type: 'result', id: 'down' },
          { type: 'inventory', item: 'soul', amount: 1 },
        ],
        consumes: [{ item: 'soul', amount: 1 }],
        clears: [{ type: 'result', id: 'down' }],
      },
    ],
    achievements: [{ id: 'fixed', name: 'Fixed', description: 'Fix it', conditions: [{ type: 'action', id: 'fix' }] }],
  })
  assert.deepEqual(ids(planRoute(fixture, ['fixed'])), ['break', 'loot', 'fix'])
})

check('farm grants items and exposes sourceName', () => {
  const fixture = game({
    enemies: [{ id: 'rat', name: 'Ash Rat' }],
    items: [{ id: 'tooth', name: 'Tooth', type: 'material' }],
    actions: [
      {
        id: 'farm-rat',
        type: 'farm',
        description: 'Farm rats',
        area: 'here',
        source: { type: 'enemy', id: 'rat' },
        gives: [{ item: 'tooth', amount: 1 }],
      },
      {
        id: 'use-tooth',
        type: 'interact',
        description: 'Use tooth',
        area: 'here',
        consumes: [{ item: 'tooth', amount: 1 }],
      },
    ],
    achievements: [{ id: 'used', name: 'Used', description: 'Use', conditions: [{ type: 'action', id: 'use-tooth' }] }],
  })
  const result = planRoute(fixture, ['used'])
  assert.deepEqual(ids(result), ['farm-rat', 'use-tooth'])
  assert.equal(result.steps[0].sourceName, 'Ash Rat')
})

check('meta achievement pulls nested achievements', () => {
  const fixture = game({
    items: [],
    actions: [
      { id: 'one', type: 'interact', description: 'One', area: 'here' },
      { id: 'two', type: 'interact', description: 'Two', area: 'here' },
    ],
    achievements: [
      { id: 'a', name: 'A', description: 'A', conditions: [{ type: 'action', id: 'one' }] },
      { id: 'b', name: 'B', description: 'B', conditions: [{ type: 'action', id: 'two' }] },
      {
        id: 'all',
        name: 'All',
        description: 'All',
        conditions: [
          { type: 'achievement', id: 'a' },
          { type: 'achievement', id: 'b' },
        ],
      },
    ],
  })
  assert.deepEqual(ids(planRoute(fixture, ['all'])).sort(), ['one', 'two'])
})

check('newRun lets a once-only boss grant a second soul', () => {
  const fixture = game({
    items: [
      { id: 'boss-soul', name: 'Boss Soul', type: 'soul', persist: true },
      { id: 'junk', name: 'Junk', type: 'consumable' },
    ],
    actions: [
      { id: 'pick-junk', type: 'collect', description: 'Junk', area: 'here', gives: [{ item: 'junk', amount: 1 }] },
      {
        id: 'fight-boss',
        type: 'fight',
        description: 'Fight boss',
        area: 'here',
        gives: [{ item: 'boss-soul', amount: 1 }],
      },
      {
        id: 'forge-a',
        type: 'interact',
        description: 'Forge A',
        area: 'here',
        consumes: [{ item: 'boss-soul', amount: 1 }],
      },
      {
        id: 'forge-b',
        type: 'interact',
        description: 'Forge B',
        area: 'here',
        consumes: [{ item: 'boss-soul', amount: 1 }],
      },
      {
        id: 'enter-ng',
        type: 'interact',
        description: 'Enter NG+',
        area: 'here',
        newRun: true,
      },
    ],
    achievements: [
      { id: 'a', name: 'A', description: 'A', conditions: [{ type: 'action', id: 'forge-a' }] },
      { id: 'b', name: 'B', description: 'B', conditions: [{ type: 'action', id: 'forge-b' }] },
    ],
  })
  const result = planRoute(fixture, ['a', 'b'])
  assert.equal(result.ok, true, result.message)
  const steps = ids(result)
  assert.equal(steps.filter((id) => id === 'fight-boss').length, 2)
  assert.ok(steps.includes('enter-ng'))
  const ng = result.steps.find((step) => step.id === 'enter-ng')
  const secondFight = result.steps.filter((step) => step.id === 'fight-boss')[1]
  assert.ok(ng.run < secondFight.run)
})

check('newRun redoes action requirements in the next run', () => {
  const fixture = game({
    results: [{ id: 'boss-down', name: 'Boss down' }],
    items: [{ id: 'boss-soul', name: 'Boss Soul', type: 'soul', persist: true }],
    actions: [
      { id: 'prep', type: 'interact', description: 'Reach the boss', area: 'here' },
      {
        id: 'fight-boss',
        type: 'fight',
        description: 'Fight boss',
        area: 'here',
        gives: [{ item: 'boss-soul', amount: 1 }],
        requires: [{ type: 'action', id: 'prep' }],
        sets: [{ type: 'result', id: 'boss-down' }],
      },
      {
        id: 'forge-a',
        type: 'interact',
        description: 'Forge A',
        area: 'here',
        consumes: [{ item: 'boss-soul', amount: 1 }],
      },
      {
        id: 'forge-b',
        type: 'interact',
        description: 'Forge B',
        area: 'here',
        consumes: [{ item: 'boss-soul', amount: 1 }],
      },
      {
        id: 'enter-ng',
        type: 'interact',
        description: 'Enter NG+',
        area: 'here',
        requires: [{ type: 'result', id: 'boss-down' }],
        newRun: true,
      },
    ],
    achievements: [
      { id: 'a', name: 'A', description: 'A', conditions: [{ type: 'action', id: 'forge-a' }] },
      { id: 'b', name: 'B', description: 'B', conditions: [{ type: 'action', id: 'forge-b' }] },
    ],
  })
  const result = planRoute(fixture, ['a', 'b'])
  assert.equal(result.ok, true, result.message)
  const steps = ids(result)
  assert.equal(steps.filter((id) => id === 'prep').length, 2, 'prep must be redone after newRun')
  assert.equal(steps.filter((id) => id === 'fight-boss').length, 2)
  const ng = result.steps.find((step) => step.id === 'enter-ng')
  const secondPrep = result.steps.filter((step) => step.id === 'prep')[1]
  const secondFight = result.steps.filter((step) => step.id === 'fight-boss')[1]
  assert.ok(ng.run < secondPrep.run)
  assert.equal(secondPrep.run, secondFight.run)
  assert.ok(secondPrep.number < secondFight.number, 'prep before boss in NG+')
})

check('packs other achievements into the current run before newRun', () => {
  const fixture = game({
    items: [{ id: 'boss-soul', name: 'Boss Soul', type: 'soul', persist: true }],
    actions: [
      {
        id: 'fight-boss',
        type: 'fight',
        description: 'Fight boss',
        area: 'here',
        gives: [{ item: 'boss-soul', amount: 1 }],
      },
      {
        id: 'forge-a',
        type: 'interact',
        description: 'Forge A',
        area: 'here',
        consumes: [{ item: 'boss-soul', amount: 1 }],
      },
      {
        id: 'forge-b',
        type: 'interact',
        description: 'Forge B',
        area: 'here',
        consumes: [{ item: 'boss-soul', amount: 1 }],
      },
      {
        id: 'side-quest',
        type: 'interact',
        description: 'Side quest that fits before NG+',
        area: 'here',
      },
      {
        id: 'enter-ng',
        type: 'interact',
        description: 'Enter NG+',
        area: 'here',
        newRun: true,
      },
    ],
    achievements: [
      { id: 'a', name: 'A', description: 'A', conditions: [{ type: 'action', id: 'forge-a' }] },
      { id: 'b', name: 'B', description: 'B', conditions: [{ type: 'action', id: 'forge-b' }] },
      { id: 'side', name: 'Side', description: 'Side', conditions: [{ type: 'action', id: 'side-quest' }] },
    ],
  })
  const result = planRoute(fixture, ['a', 'b', 'side'])
  assert.equal(result.ok, true, result.message)
  const ng = result.steps.find((step) => step.id === 'enter-ng')
  const side = result.steps.find((step) => step.id === 'side-quest')
  assert.ok(ng, 'expected a newRun step')
  assert.ok(side, 'expected side quest')
  assert.equal(side.run, ng.run, 'side quest should finish in the same run that ends')
  assert.ok(side.number < ng.number, 'side quest should be packed before the ending')
})

check('repeatable farm can grant twice in one run', () => {
  const fixture = game({
    enemies: [{ id: 'rat', name: 'Rat' }],
    items: [{ id: 'tooth', name: 'Tooth', type: 'material' }],
    actions: [
      {
        id: 'farm-rat',
        type: 'farm',
        description: 'Farm',
        area: 'here',
        source: { type: 'enemy', id: 'rat' },
        gives: [{ item: 'tooth', amount: 1 }],
      },
      {
        id: 'spend-a',
        type: 'interact',
        description: 'Spend A',
        area: 'here',
        consumes: [{ item: 'tooth', amount: 1 }],
      },
      {
        id: 'spend-b',
        type: 'interact',
        description: 'Spend B',
        area: 'here',
        consumes: [{ item: 'tooth', amount: 1 }],
      },
    ],
    achievements: [
      { id: 'a', name: 'A', description: 'A', conditions: [{ type: 'action', id: 'spend-a' }] },
      { id: 'b', name: 'B', description: 'B', conditions: [{ type: 'action', id: 'spend-b' }] },
    ],
  })
  const steps = ids(planRoute(fixture, ['a', 'b']))
  assert.equal(steps.filter((id) => id === 'farm-rat').length, 2)
  assert.ok(!steps.includes('enter-ng'))
  assert.equal(planRoute(fixture, ['a', 'b']).steps.every((step) => step.run === 1), true)
})

check('item persist false drops on newRun', () => {
  const fixture = game({
    items: [
      { id: 'boss-soul', name: 'Boss Soul', type: 'soul', persist: true },
      { id: 'herb', name: 'Herb', type: 'consumable', persist: false },
    ],
    actions: [
      { id: 'take-herb', type: 'collect', description: 'Herb', area: 'here', gives: [{ item: 'herb', amount: 1 }] },
      {
        id: 'fight-boss',
        type: 'fight',
        description: 'Boss',
        area: 'here',
        gives: [{ item: 'boss-soul', amount: 1 }],
      },
      {
        id: 'use-soul',
        type: 'interact',
        description: 'Use soul while holding a herb',
        area: 'here',
        requires: [{ type: 'inventory', item: 'herb', amount: 1 }],
        consumes: [{ item: 'boss-soul', amount: 1 }],
      },
      {
        id: 'use-soul-again',
        type: 'interact',
        description: 'Use soul again',
        area: 'here',
        consumes: [{ item: 'boss-soul', amount: 1 }],
      },
      {
        id: 'need-herb-late',
        type: 'interact',
        description: 'Spend the herb after NG',
        area: 'here',
        requires: [{ type: 'action', id: 'use-soul-again' }],
        consumes: [{ item: 'herb', amount: 1 }],
      },
      { id: 'enter-ng', type: 'interact', description: 'NG', area: 'here', newRun: true },
    ],
    achievements: [
      { id: 'a', name: 'A', description: 'A', conditions: [{ type: 'action', id: 'use-soul' }] },
      { id: 'b', name: 'B', description: 'B', conditions: [{ type: 'action', id: 'need-herb-late' }] },
    ],
  })
  const result = planRoute(fixture, ['a', 'b'])
  assert.equal(result.ok, true, result.message)
  const steps = ids(result)
  assert.ok(steps.includes('enter-ng'))
  const ng = result.steps.find((step) => step.id === 'enter-ng')
  const late = result.steps.find((step) => step.id === 'need-herb-late')
  const herbBeforeLate = result.steps.filter(
    (step) => step.id === 'take-herb' && step.number > ng.number && step.number < late.number,
  )
  assert.ok(herbBeforeLate.length >= 1, 'non-persist herb must be reacquired after newRun before spending it')
})

check('subset run count never exceeds the full selection', () => {
  const fixture = game({
    results: [{ id: 'boss-down', name: 'Boss down' }],
    items: [{ id: 'boss-soul', name: 'Boss Soul', type: 'soul', persist: true }],
    actions: [
      { id: 'talk', type: 'interact', description: 'Talk first', area: 'here', before: ['kill'] },
      { id: 'kill', type: 'fight', description: 'Kill', area: 'here', sets: [{ type: 'result', id: 'boss-down' }] },
      {
        id: 'fight-boss',
        type: 'fight',
        description: 'Fight boss',
        area: 'here',
        gives: [{ item: 'boss-soul', amount: 1 }],
      },
      {
        id: 'forge-a',
        type: 'interact',
        description: 'Forge A',
        area: 'here',
        consumes: [{ item: 'boss-soul', amount: 1 }],
      },
      {
        id: 'forge-b',
        type: 'interact',
        description: 'Forge B',
        area: 'here',
        consumes: [{ item: 'boss-soul', amount: 1 }],
      },
      { id: 'side-quest', type: 'interact', description: 'Side', area: 'here' },
      {
        id: 'enter-ng',
        type: 'interact',
        description: 'NG',
        area: 'here',
        requires: [{ type: 'result', id: 'boss-down' }],
        newRun: true,
      },
    ],
    achievements: [
      { id: 'talker', name: 'Talker', description: 'Talk', conditions: [{ type: 'action', id: 'talk' }] },
      { id: 'ending', name: 'Ending', description: 'End', conditions: [{ type: 'action', id: 'enter-ng' }] },
      { id: 'a', name: 'A', description: 'A', conditions: [{ type: 'action', id: 'forge-a' }] },
      { id: 'b', name: 'B', description: 'B', conditions: [{ type: 'action', id: 'forge-b' }] },
      { id: 'side', name: 'Side', description: 'Side', conditions: [{ type: 'action', id: 'side-quest' }] },
    ],
  })
  const runCount = (picked) => {
    const result = planRoute(fixture, picked)
    assert.equal(result.ok, true, `${result.message} (${picked.join(',')})`)
    return Math.max(...result.steps.map((step) => step.run))
  }

  assert.equal(runCount(['talker', 'ending']), 1)
  assert.ok(runCount(['a', 'b']) > runCount(['a']))

  const full = ['talker', 'ending', 'a', 'b', 'side']
  const fullRuns = runCount(full)
  for (let mask = 1; mask < 1 << full.length; mask++) {
    const subset = full.filter((_, index) => (mask >> index) & 1)
    const count = runCount(subset)
    assert.ok(count <= fullRuns, `${subset.join(',')} needs ${count} runs, full selection needs ${fullRuns}`)
  }

  const both = planRoute(fixture, full)
  const firstForge = both.steps.find((step) => step.id === 'forge-a')
  const side = both.steps.find((step) => step.id === 'side-quest')
  assert.equal(side.run, firstForge.run)
  assert.ok(side.number < both.steps.find((step) => step.id === 'enter-ng').number)
})

console.log(`${passed} checks passed`)
