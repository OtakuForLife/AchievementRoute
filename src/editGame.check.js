import assert from 'node:assert/strict'
import { blankAction, uniqueId, writeAction } from './editGame.js'

const farm = writeAction({
  id: 'f',
  type: 'farm',
  description: 'd',
  area: 'a',
  gives: [{ item: 'x', amount: 1 }],
  repeatable: true,
  note: 'keep',
})
assert.equal(farm.repeatable, undefined)
assert.deepEqual(farm.source, { type: 'enemy', id: '' })
assert.equal(farm.note, 'keep')
assert.deepEqual(farm.gives, [{ item: 'x', amount: 1 }])

const plain = writeAction({
  id: 'p',
  type: 'go',
  description: 'd',
  area: 'a',
  gives: [],
  source: { type: 'enemy', id: 'e' },
  newRun: false,
})
assert.equal(plain.gives, undefined)
assert.equal(plain.source, undefined)
assert.equal(plain.newRun, undefined)

const again = writeAction({
  id: 'n',
  type: 'interact',
  description: 'd',
  area: 'a',
  newRun: true,
  repeatable: true,
})
assert.equal(again.newRun, true)
assert.equal(again.repeatable, true)

assert.equal(uniqueId([{ id: 'area-1' }], 'area'), 'area-2')
assert.equal(uniqueId([{ id: 'area-1' }, { id: 'area-2' }], 'area'), 'area-3')
assert.equal(blankAction([], 'yard').area, 'yard')
assert.equal(blankAction([{ id: 'action-1' }], 'yard').id, 'action-2')

console.log('editGame checks passed')
