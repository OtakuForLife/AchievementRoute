// Achievement Route planner
//
// 1. Run count K is how many times a once-only reward must be produced,
//    and how many demanded newRun actions each end a cycle.
// 2. Seed each run with one conflicting piece, then pack every other
//    achievement into the fullest run it can legally join.
// 3. Order steps inside a run along achievement chains. Farms repeat
//    until the run's consumers are paid.

export const ITEM_TYPES = ['key', 'weapon', 'consumable', 'material', 'spell', 'soul']
export const ACTION_TYPES = ['collect', 'interact', 'fight', 'go', 'farm']
const ITEM_TYPE_SET = new Set(ITEM_TYPES)
const ACTION_TYPE_SET = new Set(ACTION_TYPES)
const MAX_STEPS = 5_000
const REPAIR_LIMIT = 8

export function planRoute(game, achievementIds) {
  const ctx = makeContext(game)
  const selected = []
  for (const id of achievementIds ?? []) {
    const achievement = ctx.achievementById.get(id)
    if (!achievement) return fail(`Unknown achievement ${id}.`)
    selected.push(achievement)
  }
  if (selected.length === 0) return fail('Select at least one achievement.')

  const demands = []
  for (const achievement of selected) {
    const actions = collectActions(achievement.conditions, ctx, new Set())
    if (!actions) return fail(`No branch of an any-condition works for ${achievement.id}.`)
    demands.push({ achievement, actions, body: [] })
  }

  const all = new Set()
  for (const demand of demands) for (const id of demand.actions) all.add(id)
  const bound = lowerBound(all, ctx)
  if (bound.error) return fail(bound.error)
  if (bound.K > 1 && ctx.newRunActions.length === 0) {
    return fail('A new run is needed, but this game has no newRun action.')
  }

  const scarceItems = scarceItemSet(all, ctx)
  const scarce = new Set()
  for (const id of all) {
    const action = ctx.byId.get(id)
    if (action.consumes.some((stack) => scarceItems.has(stack.item))) scarce.add(id)
  }
  for (const demand of demands) {
    demand.body = [...demand.actions]
      .filter((id) => !scarce.has(id) && !ctx.byId.get(id).newRun)
      .sort()
  }
  ctx.demanded = all
  indexMissables(ctx)

  let K = bound.K
  const pins = new Map()
  const tried = new Map()
  let last = 'No route fits these achievements.'
  for (let attempt = 0; attempt < REPAIR_LIMIT; attempt++) {
    const built = assemble(selected, demands, scarce, scarceItems, K, pins, ctx)
    if (built.ok) {
      if (built.steps.length > MAX_STEPS) return fail('This route is over the step limit.')
      return formatResult(built.steps, selected, ctx.byId, ctx.enemyById, ctx.areas, ctx.achievementById)
    }
    last = built.message
    if (built.hard) return fail(last)
    const movable = built.action && (scarce.has(built.action) || demands.some((demand) => demand.body.includes(built.action)))
    if (!movable) {
      K += 1
      pins.clear()
      tried.clear()
      continue
    }
    const seen = tried.get(built.action) ?? new Set()
    seen.add(built.runIndex)
    tried.set(built.action, seen)
    let next = -1
    for (let i = 0; i < K; i++) {
      if (!seen.has(i)) {
        next = i
        break
      }
    }
    if (next < 0) {
      // ponytail: growing K is the last resort after every existing run refused the piece.
      // Upgrade path: try another any-branch or giver before opening a run.
      K += 1
      pins.clear()
      tried.clear()
    } else {
      pins.set(built.action, next)
    }
  }
  return fail(last)
}

function assemble(selected, demands, scarce, scarceItems, K, pins, ctx) {
  const runs = Array.from({ length: K }, () => ({ actions: new Set(), members: [], boundary: null }))
  const seeded = seed(runs, demands, scarce, scarceItems, pins, ctx)
  if (!seeded.ok) return seeded

  const seededEntering = enterStates(runs, ctx)
  if (!seededEntering) return soft('A seeded run cannot be ordered.', null, 0)
  const bases = runs.map((run, index) => baseClosure(run, seededEntering[index], ctx))
  const guests = demands
    .filter((demand) => demand.body.length > 0)
    .map((demand) => ({
      demand,
      legal: bases.reduce(
        (count, base, index) => count + (base.ok && fitsClosed(base.set, demand, seededEntering[index], ctx) ? 1 : 0),
        0,
      ),
    }))
    .sort((a, b) => a.legal - b.legal || a.demand.achievement.id.localeCompare(b.demand.achievement.id))

  for (const guest of guests) {
    const forced = pinnedRun(guest.demand.body, pins)
    if (forced === 'split') return soft('A step was pinned to two runs.', guest.demand.body[0], 0)
    let best = null
    for (let i = 0; i < runs.length; i++) {
      if (forced !== null && i !== forced) continue
      if (!bases[i].ok) continue
      const count = runs[i].members.length
      if (best && (count < best.count || (count === best.count && i > best.index))) continue
      if (!fitsClosed(bases[i].set, guest.demand, seededEntering[i], ctx)) continue
      best = { index: i, count }
    }
    if (!best) return soft(`No run fits ${guest.demand.achievement.name}.`, guest.demand.body[0], 0)
    for (const id of guest.demand.body) runs[best.index].actions.add(id)
    addMember(runs[best.index], guest.demand)
    const pending = []
    for (const id of guest.demand.body) {
      if (bases[best.index].set.has(id)) continue
      bases[best.index].set.add(id)
      pending.push(id)
    }
    if (pending.length > 0) {
      const grown = close(bases[best.index].set, seededEntering[best.index], ctx, pending)
      if (!grown.ok) return grown
    }
  }

  const state = emptyState()
  const steps = []
  for (let i = 0; i < runs.length; i++) {
    const ordered = orderRun(runs[i], state, ctx)
    if (!ordered.ok) return { ...ordered, runIndex: i }
    for (const id of ordered.steps) {
      const action = ctx.byId.get(id)
      if (!canPerform(action, state)) {
        return soft(`Cannot perform ${action.id}.`, action.id, i)
      }
      try {
        perform(action, state, steps, ctx)
      } catch (error) {
        if (!error?.planFail) throw error
        return soft(error.message, action.id, i)
      }
    }
  }
  for (const achievement of selected) {
    if (earned(achievement, state.everDone, ctx.achievementById)) continue
    const demand = demands.find((row) => row.achievement.id === achievement.id)
    const missing = [...(demand?.actions ?? [])].find((id) => !state.everDone.has(id)) ?? null
    return soft(`Missed ${achievement.name}.`, missing, 0)
  }
  return { ok: true, steps }
}

function seed(runs, demands, scarce, scarceItems, pins, ctx) {
  const demandedEndings = []
  const seenEnding = new Set()
  for (const demand of demands) {
    for (const id of demand.actions) {
      if (!ctx.byId.get(id).newRun || seenEnding.has(id)) continue
      seenEnding.add(id)
      demandedEndings.push(id)
    }
  }
  demandedEndings.sort()
  const catalog = resetCatalog(ctx)
  const plain = catalog.plain
  const unselected = [...catalog.endings].filter((id) => !seenEnding.has(id)).sort()
  const resets = [...demandedEndings]
  const slots = Math.max(runs.length - 1, demandedEndings.length)
  if (slots > 0 && resets.length === 0 && plain.length === 0 && unselected.length === 0) {
    return { ok: false, hard: true, message: 'A new run is needed, but this game has no newRun action.' }
  }
  let extra = 0
  while (resets.length < slots) {
    if (plain.length > 0) resets.push(plain[0])
    else if (unselected.length > 0) resets.push(unselected[Math.min(extra, unselected.length - 1)])
    else resets.push(demandedEndings[0])
    extra += 1
  }
  for (let i = 0; i < slots && i < runs.length; i++) {
    runs[i].boundary = resets[i]
    for (const demand of demands) {
      if (demand.actions.has(resets[i])) addMember(runs[i], demand)
    }
  }

  const perCycle = new Map()
  for (const item of scarceItems) perCycle.set(item, onceOnlySupply(item, ctx))
  const used = runs.map(() => new Map())
  const consumers = [...scarce].sort()
  for (const id of consumers) {
    const action = ctx.byId.get(id)
    const preferred = pins.get(id)
    let placed = false
    for (let i = 0; i < runs.length; i++) {
      if (preferred !== undefined && i !== preferred) continue
      if (!roomFor(used[i], action, perCycle)) continue
      runs[i].actions.add(id)
      for (const stack of action.consumes) {
        if (!perCycle.has(stack.item)) continue
        used[i].set(stack.item, (used[i].get(stack.item) ?? 0) + stack.amount)
      }
      for (const demand of demands) {
        if (demand.actions.has(id)) addMember(runs[i], demand)
      }
      placed = true
      break
    }
    if (!placed) return soft(`No run can produce enough for ${id}.`, id, preferred ?? 0)
  }
  return { ok: true }
}

function baseClosure(run, carry, ctx) {
  const set = new Set(run.actions)
  if (run.boundary) set.add(run.boundary)
  return close(set, carry, ctx)
}

function fitsClosed(baseSet, demand, carry, ctx) {
  const set = new Set(baseSet)
  const pending = []
  for (const id of demand.body) {
    if (set.has(id)) continue
    set.add(id)
    pending.push(id)
  }
  if (pending.length === 0) return true
  const closed = pending.length === 0 ? { ok: true, set } : close(set, carry, ctx, pending)
  if (!closed.ok || !supplies(closed.set, carry, ctx)) return false
  const index = new Map()
  return topo(closed.set, index, ctx) !== null
}

function supplies(set, carry, ctx) {
  const items = new Set()
  for (const id of set) {
    for (const item of itemsNeeded(ctx.byId.get(id))) items.add(item)
  }
  for (const item of items) {
    if (produced(set, item, carry, ctx) < itemNeed(set, item, ctx)) return false
  }
  return true
}

function resetCatalog(ctx) {
  if (ctx.resetCatalog) return ctx.resetCatalog
  const endings = new Set()
  for (const achievement of ctx.achievementById.values()) {
    const actions = collectActions(achievement.conditions, ctx, new Set())
    if (!actions) continue
    for (const id of actions) if (ctx.byId.get(id)?.newRun) endings.add(id)
  }
  const plain = ctx.newRunActions.map((action) => action.id).filter((id) => !endings.has(id)).sort()
  ctx.resetCatalog = { endings, plain }
  return ctx.resetCatalog
}

function enterStates(runs, ctx) {
  const states = []
  const state = emptyState()
  for (const run of runs) {
    states.push(snapshot(state))
    const ordered = orderRun(run, state, ctx)
    if (!ordered.ok) return null
    for (const id of ordered.steps) {
      const action = ctx.byId.get(id)
      if (!canPerform(action, state)) return null
      try {
        perform(action, state, [], ctx)
      } catch (error) {
        if (!error?.planFail) throw error
        return null
      }
    }
  }
  return states
}

function orderRun(run, carry, ctx) {
  const set = new Set(run.actions)
  if (run.boundary) set.add(run.boundary)
  const closed = close(set, carry, ctx)
  if (!closed.ok) return closed
  const index = ownerIndex(closed.set, run, ctx)
  const ordered = topo(closed.set, index, ctx)
  if (!ordered) return soft('These actions cannot share a run.', [...closed.set][0] ?? null, 0)
  const steps = []
  for (const id of ordered) {
    const times = repeatCount(ctx.byId.get(id), closed.set, carry, ctx)
    for (let n = 0; n < times; n++) steps.push(id)
  }
  const state = snapshot(carry)
  for (const id of steps) {
    const action = ctx.byId.get(id)
    if (!canPerform(action, state)) return soft(`Cannot perform ${id}.`, id, 0)
    try {
      perform(action, state, [], ctx)
    } catch (error) {
      if (!error?.planFail) throw error
      return soft(error.message, id, 0)
    }
  }
  return { ok: true, steps }
}

function close(set, carry, ctx, pending = null) {
  const queue = pending ?? [...set]
  for (let head = 0; head < queue.length; head++) {
    const id = queue[head]
    const action = ctx.byId.get(id)
    const add = (depId) => {
      if (!depId || set.has(depId)) return true
      const dep = ctx.byId.get(depId)
      if (!dep || dep.newRun) return true
      set.add(depId)
      queue.push(depId)
      return true
    }
    for (const requirement of action.requires) {
      if (requirement.type === 'action') {
        add(requirement.id)
      } else if (requirement.type === 'result' && !carry.results.has(requirement.id)) {
        const setters = ctx.settersByResult.get(requirement.id) ?? []
        if (setters.some((setter) => set.has(setter.id))) continue
        const setter = pickSetter(requirement.id, set, ctx)
        if (!setter) return soft(`Nothing sets result ${requirement.id}.`, id, 0)
        add(setter.id)
      }
    }
    for (const item of itemsNeeded(action)) {
      while (produced(set, item, carry, ctx) < itemNeed(set, item, ctx)) {
        const giver = pickGiver(item, set, ctx)
        if (!giver) {
          const name = ctx.itemById.get(item)?.name ?? item
          return { ok: false, hard: true, message: `Nothing gives enough ${name}.`, action: id, runIndex: 0 }
        }
        add(giver.id)
        if (isRepeatable(giver)) break
      }
    }
    for (const miss of ctx.missablesByBlocker.get(id) ?? []) add(miss)
  }
  return { ok: true, set }
}

function topo(set, index, ctx) {
  const indegree = new Map()
  const outgoing = new Map()
  for (const id of set) {
    indegree.set(id, 0)
    outgoing.set(id, [])
  }
  for (const id of set) {
    for (const pred of predecessors(ctx.byId.get(id), set, ctx)) {
      if (pred === id || !set.has(pred)) continue
      outgoing.get(pred).push(id)
      indegree.set(id, indegree.get(id) + 1)
    }
  }
  const ready = [...set].filter((id) => indegree.get(id) === 0)
  const ordered = []
  while (ready.length > 0) {
    ready.sort((a, b) => (index.get(a) ?? 1e9) - (index.get(b) ?? 1e9) || a.localeCompare(b))
    const id = ready.shift()
    ordered.push(id)
    for (const next of outgoing.get(id)) {
      const left = indegree.get(next) - 1
      indegree.set(next, left)
      if (left === 0) ready.push(next)
    }
  }
  return ordered.length === set.size ? ordered : null
}

function predecessors(action, set, ctx) {
  const preds = new Set()
  if (action.newRun) {
    for (const id of set) if (id !== action.id) preds.add(id)
    return preds
  }
  for (const requirement of action.requires) {
    if (requirement.type === 'action' && set.has(requirement.id)) preds.add(requirement.id)
    if (requirement.type === 'result') {
      for (const setter of ctx.settersByResult.get(requirement.id) ?? []) {
        if (set.has(setter.id)) preds.add(setter.id)
      }
    }
    if (requirement.type === 'inventory') {
      for (const giver of ctx.giversByItem.get(requirement.item) ?? []) {
        if (set.has(giver.id)) preds.add(giver.id)
      }
    }
  }
  for (const stack of action.consumes) {
    for (const giver of ctx.giversByItem.get(stack.item) ?? []) {
      if (giver.id !== action.id && set.has(giver.id)) preds.add(giver.id)
    }
  }
  for (const id of set) {
    if (ctx.byId.get(id).before.includes(action.id)) preds.add(id)
  }
  for (const effect of action.clears) {
    if (effect.type !== 'result') continue
    for (const id of set) {
      if (id !== action.id && requiresResult(ctx.byId.get(id), effect.id)) preds.add(id)
    }
  }
  return preds
}

function ownerIndex(set, run, ctx) {
  const index = new Map()
  for (const id of set) index.set(id, 1e9)
  for (const member of run.members) {
    for (const id of member.actions) {
      if (!set.has(id)) continue
      index.set(id, Math.min(index.get(id), member.order))
    }
  }
  let changed = true
  while (changed) {
    changed = false
    for (const id of set) {
      const action = ctx.byId.get(id)
      if (action.newRun) continue
      for (const pred of predecessors(action, set, ctx)) {
        if ((index.get(pred) ?? 1e9) > index.get(id)) {
          index.set(pred, index.get(id))
          changed = true
        }
      }
    }
  }
  if (run.boundary && set.has(run.boundary)) index.set(run.boundary, 1e9)
  return index
}

function lowerBound(actionIds, ctx) {
  let K = 1
  let endings = 0
  const consumes = new Map()
  for (const id of actionIds) {
    const action = ctx.byId.get(id)
    if (!action) return { error: `Missing action ${id}.` }
    if (action.newRun) endings += 1
    for (const stack of action.consumes) {
      consumes.set(stack.item, (consumes.get(stack.item) ?? 0) + stack.amount)
    }
  }
  K = Math.max(K, endings)
  for (const [item, need] of consumes) {
    if (hasRepeatableGiver(item, ctx)) continue
    const per = onceOnlySupply(item, ctx)
    if (need > 0 && per <= 0) {
      const name = ctx.itemById.get(item)?.name ?? item
      return { error: `Nothing gives enough ${name}.` }
    }
    if (need > per) K = Math.max(K, Math.ceil(need / per))
  }
  return { K }
}

function scarceItemSet(actionIds, ctx) {
  const consumes = new Map()
  for (const id of actionIds) {
    for (const stack of ctx.byId.get(id).consumes) {
      consumes.set(stack.item, (consumes.get(stack.item) ?? 0) + stack.amount)
    }
  }
  const scarce = new Set()
  for (const [item, need] of consumes) {
    if (hasRepeatableGiver(item, ctx)) continue
    if (need > onceOnlySupply(item, ctx)) scarce.add(item)
  }
  return scarce
}

function collectActions(conditions, ctx, seen) {
  const ids = new Set()
  for (const condition of conditions ?? []) {
    if (condition.type === 'action') {
      ids.add(condition.id)
      continue
    }
    if (condition.type === 'achievement') {
      if (seen.has(condition.id)) return null
      const nested = ctx.achievementById.get(condition.id)
      if (!nested) return null
      seen.add(condition.id)
      const inner = collectActions(nested.conditions, ctx, seen)
      seen.delete(condition.id)
      if (!inner) return null
      for (const id of inner) ids.add(id)
      continue
    }
    if (condition.type === 'any') {
      // ponytail: each any keeps the branch with the smallest copy lower bound.
      // Combinations of branches are not searched.
      let best = null
      let bestKey = null
      for (const alternative of condition.of ?? []) {
        const branch = collectActions([alternative], ctx, new Set(seen))
        if (!branch) continue
        const bound = lowerBound(branch, ctx)
        if (bound.error) continue
        const key = [bound.K, branch.size]
        if (!bestKey || key[0] < bestKey[0] || (key[0] === bestKey[0] && key[1] < bestKey[1])) {
          best = branch
          bestKey = key
        }
      }
      if (!best) return null
      for (const id of best) ids.add(id)
    }
  }
  return ids
}

function roomFor(used, action, perCycle) {
  for (const stack of action.consumes) {
    if (!perCycle.has(stack.item)) continue
    if ((used.get(stack.item) ?? 0) + stack.amount > perCycle.get(stack.item)) return false
  }
  return true
}

function pinnedRun(body, pins) {
  const runs = new Set()
  for (const id of body) if (pins.has(id)) runs.add(pins.get(id))
  if (runs.size > 1) return 'split'
  if (runs.size === 0) return null
  return [...runs][0]
}

function addMember(run, demand) {
  if (run.members.some((member) => member.id === demand.achievement.id)) return
  run.members.push({
    id: demand.achievement.id,
    order: run.members.length,
    actions: demand.actions,
  })
}

function pickGiver(item, set, ctx) {
  const givers = (ctx.giversByItem.get(item) ?? []).filter((action) => !set.has(action.id))
  givers.sort((a, b) => {
    const rank = (action) => (ctx.demanded.has(action.id) ? 0 : 1)
    return rank(a) - rank(b) || a.id.localeCompare(b.id)
  })
  return givers[0] ?? null
}

function pickSetter(resultId, set, ctx) {
  const setters = (ctx.settersByResult.get(resultId) ?? []).filter((action) => !set.has(action.id))
  setters.sort((a, b) => {
    const rank = (action) => (ctx.demanded.has(action.id) ? 0 : 1)
    return rank(a) - rank(b) || a.id.localeCompare(b.id)
  })
  return setters[0] ?? null
}

function onceOnlySupply(item, ctx) {
  let total = 0
  for (const action of ctx.actions) {
    if (action.newRun || isRepeatable(action)) continue
    total += giveAmount(action, item)
  }
  return total
}

function hasRepeatableGiver(item, ctx) {
  return ctx.actions.some((action) => !action.newRun && isRepeatable(action) && giveAmount(action, item) > 0)
}

function produced(set, item, carry, ctx) {
  let total = count(carry.inventory, item)
  for (const id of set) {
    const action = ctx.byId.get(id)
    const amount = giveAmount(action, item)
    if (amount <= 0) continue
    if (isRepeatable(action)) return Infinity
    total += amount
  }
  return total
}

function itemNeed(set, item, ctx) {
  let consumed = 0
  let peak = 0
  for (const id of set) {
    const action = ctx.byId.get(id)
    for (const stack of action.consumes) if (stack.item === item) consumed += stack.amount
    for (const requirement of action.requires) {
      if (requirement.type === 'inventory' && requirement.item === item) peak = Math.max(peak, requirement.amount)
    }
  }
  return Math.max(consumed, peak)
}

function repeatCount(action, set, carry, ctx) {
  if (!isRepeatable(action)) return 1
  let times = 1
  for (const stack of action.gives) {
    let covered = count(carry.inventory, stack.item)
    for (const id of set) {
      if (id === action.id) continue
      const other = ctx.byId.get(id)
      if (isRepeatable(other)) continue
      covered += giveAmount(other, stack.item)
    }
    const short = itemNeed(set, stack.item, ctx) - covered
    if (short > 0) times = Math.max(times, Math.ceil(short / stack.amount))
  }
  return times
}

function itemsNeeded(action) {
  const items = new Set()
  for (const stack of action.consumes) items.add(stack.item)
  for (const requirement of action.requires) {
    if (requirement.type === 'inventory') items.add(requirement.item)
  }
  return items
}

function giveAmount(action, item) {
  let total = 0
  for (const stack of action.gives) if (stack.item === item) total += stack.amount
  return total
}

function requiresResult(action, resultId) {
  return action.requires.some((requirement) => requirement.type === 'result' && requirement.id === resultId)
}

function canPerform(action, state) {
  if (!action) return false
  if (state.done.has(action.id) && !isRepeatable(action)) return false
  for (const blocked of action.before) {
    if (state.done.has(blocked)) return false
  }
  for (const requirement of action.requires) {
    if (requirement.type === 'action' && !state.done.has(requirement.id)) return false
    if (requirement.type === 'inventory' && count(state.inventory, requirement.item) < requirement.amount) return false
    if (requirement.type === 'result' && !state.results.has(requirement.id)) return false
  }
  for (const stack of action.consumes) {
    if (count(state.inventory, stack.item) < stack.amount) return false
  }
  return true
}

function makeContext(game) {
  const actions = (game.actions ?? []).map(normalizeAction)
  const giversByItem = new Map()
  const settersByResult = new Map()
  for (const action of actions) {
    if (action.newRun) continue
    for (const stack of action.gives) {
      const list = giversByItem.get(stack.item) ?? []
      list.push(action)
      giversByItem.set(stack.item, list)
    }
    for (const effect of action.sets) {
      if (effect.type !== 'result') continue
      const list = settersByResult.get(effect.id) ?? []
      list.push(action)
      settersByResult.set(effect.id, list)
    }
  }
  return {
    byId: new Map(actions.map((action) => [action.id, action])),
    actions,
    itemById: new Map((game.items ?? []).map((item) => [item.id, item])),
    resultById: new Map((game.results ?? []).map((row) => [row.id, row])),
    enemyById: new Map((game.enemies ?? []).map((enemy) => [enemy.id, enemy])),
    achievementById: new Map((game.achievements ?? []).map((row) => [row.id, row])),
    areas: new Map((game.areas ?? []).map((area) => [area.id, area.name])),
    newRunActions: actions.filter((action) => action.newRun),
    demanded: new Set(),
    missablesByBlocker: new Map(),
    giversByItem,
    settersByResult,
  }
}

function indexMissables(ctx) {
  const byBlocker = new Map()
  for (const id of ctx.demanded) {
    const action = ctx.byId.get(id)
    if (!action || action.newRun) continue
    for (const blocker of action.before) {
      const list = byBlocker.get(blocker) ?? []
      list.push(id)
      byBlocker.set(blocker, list)
    }
  }
  ctx.missablesByBlocker = byBlocker
}

function fail(message) {
  return { ok: false, message }
}

function soft(message, action, runIndex) {
  return { ok: false, hard: false, message, action, runIndex }
}

function planFail(message) {
  const error = new Error(message)
  error.planFail = true
  throw error
}

function emptyState() {
  return {
    done: new Set(),
    results: new Set(),
    inventory: new Map(),
    everDone: new Set(),
    run: 1,
  }
}

function normalizeAction(action) {
  return {
    ...action,
    gives: action.gives ?? [],
    consumes: action.consumes ?? [],
    sets: action.sets ?? [],
    clears: action.clears ?? [],
    requires: action.requires ?? [],
    before: action.before ?? [],
    repeatable: action.repeatable === true || action.type === 'farm',
    newRun: action.newRun === true,
  }
}

function isRepeatable(action) {
  return action.repeatable
}

function earned(achievement, everDone, achievementById, seen = new Set()) {
  return (achievement.conditions ?? []).every((condition) =>
    conditionMet(condition, everDone, achievementById, seen),
  )
}

function conditionMet(condition, everDone, achievementById, seen = new Set()) {
  if (condition.type === 'action') return everDone.has(condition.id)
  if (condition.type === 'any') {
    return (condition.of ?? []).some((inner) => conditionMet(inner, everDone, achievementById, seen))
  }
  if (condition.type === 'achievement') {
    if (seen.has(condition.id)) return false
    seen.add(condition.id)
    const nested = achievementById.get(condition.id)
    if (!nested) return false
    return earned(nested, everDone, achievementById, seen)
  }
  return false
}

function perform(action, state, steps, ctx) {
  for (const stack of action.consumes) {
    const next = count(state.inventory, stack.item) - stack.amount
    if (next < 0) planFail(`${action.id} lacks items.`)
    if (next > 0) state.inventory.set(stack.item, next)
    else state.inventory.delete(stack.item)
  }
  for (const stack of action.gives) {
    state.inventory.set(stack.item, count(state.inventory, stack.item) + stack.amount)
  }
  for (const effect of action.sets) {
    if (effect.type === 'result') state.results.add(effect.id)
  }
  for (const effect of action.clears) {
    if (effect.type === 'result') state.results.delete(effect.id)
  }

  const occurrence = steps.filter((step) => step.id === action.id).length + 1
  steps.push({ id: action.id, run: state.run, occurrence })
  state.done.add(action.id)
  state.everDone.add(action.id)

  if (action.newRun) {
    state.run += 1
    state.done = new Set()
    const nextResults = new Set()
    for (const id of state.results) {
      if (ctx.resultById.get(id)?.persist === true) nextResults.add(id)
    }
    state.results = nextResults
    const nextInventory = new Map()
    for (const [itemId, amount] of state.inventory) {
      if (ctx.itemById.get(itemId)?.persist === true) nextInventory.set(itemId, amount)
    }
    state.inventory = nextInventory
  }

  if (steps.length > MAX_STEPS) planFail('This route is over the step limit.')
}

function snapshot(state) {
  return {
    done: new Set(state.done),
    results: new Set(state.results),
    inventory: new Map(state.inventory),
    everDone: new Set(state.everDone),
    run: state.run,
  }
}

function count(inventory, item) {
  return inventory.get(item) ?? 0
}

function formatResult(steps, selected, byId, enemyById, areas, achievementById) {
  const earnedIds = new Set()
  const ever = new Set()
  const out = steps.map((step, index) => {
    ever.add(step.id)
    const names = selected
      .filter((achievement) => earned(achievement, ever, achievementById) && !earnedIds.has(achievement.id))
      .map((achievement) => {
        earnedIds.add(achievement.id)
        return achievement.name
      })
    const action = byId.get(step.id)
    const sourceName =
      action.type === 'farm' && action.source?.id
        ? (enemyById.get(action.source.id)?.name ?? action.source.id)
        : null
    return {
      number: index + 1,
      id: action.id,
      occurrence: step.occurrence,
      run: step.run,
      area: areas.get(action.area) ?? action.area,
      description: action.description,
      sourceName,
      achievements: names,
    }
  })
  return { ok: true, steps: out }
}

export function validateGame(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return 'Game must be an object.'
  if (!data.id || !data.name) return 'Game needs an id and a name.'

  const areas = asList(data.areas)
  const items = asList(data.items)
  const enemies = asList(data.enemies)
  const results = asList(data.results)
  const actions = asList(data.actions).map(normalizeAction)
  const achievements = asList(data.achievements)

  if (dupes(areas)) return 'Duplicate area id.'
  if (dupes(items)) return 'Duplicate item id.'
  if (dupes(enemies)) return 'Duplicate enemy id.'
  if (dupes(results)) return 'Duplicate result id.'
  if (dupes(actions)) return 'Duplicate action id.'
  if (dupes(achievements)) return 'Duplicate achievement id.'

  const areaIds = new Set(areas.map((area) => area.id))
  const itemIds = new Set(items.map((item) => item.id))
  const enemyIds = new Set(enemies.map((enemy) => enemy.id))
  const resultIds = new Set(results.map((result) => result.id))
  const actionIds = new Set(actions.map((action) => action.id))
  const achievementIds = new Set(achievements.map((row) => row.id))

  for (const area of areas) {
    if (!area.id || !area.name) return 'Each area needs an id and a name.'
  }
  for (const item of items) {
    if (!item.id || !item.name) return 'Each item needs an id and a name.'
    if (!ITEM_TYPE_SET.has(item.type)) return `${item.id} has an unknown item type.`
    if (item.persist !== undefined && typeof item.persist !== 'boolean') {
      return `${item.id} persist must be a boolean.`
    }
  }
  for (const enemy of enemies) {
    if (!enemy.id || !enemy.name) return 'Each enemy needs an id and a name.'
  }
  for (const result of results) {
    if (!result.id || !result.name) return 'Each result needs an id and a name.'
    if (result.persist !== undefined && typeof result.persist !== 'boolean') {
      return `${result.id} persist must be a boolean.`
    }
  }

  for (const action of actions) {
    if (!action.id || !action.description) return 'Each action needs an id and a description.'
    if (!ACTION_TYPE_SET.has(action.type)) return `${action.id} has an unknown type.`
    if (!areaIds.has(action.area)) return `${action.id} points at a missing area.`
    if ((action.type === 'collect' || action.type === 'farm') && action.gives.length === 0) {
      return `${action.id} must give an item.`
    }
    if (action.type === 'farm') {
      if (!action.source || action.source.type !== 'enemy' || !action.source.id) {
        return `${action.id} needs source { type: "enemy", id }.`
      }
      if (!enemyIds.has(action.source.id)) return `${action.id} points at a missing enemy.`
    } else if (action.source) {
      return `${action.id} has a source but is not a farm.`
    }
    for (const stack of [...action.gives, ...action.consumes]) {
      if (!itemIds.has(stack.item)) return `${action.id} points at a missing item.`
      if (!Number.isInteger(stack.amount) || stack.amount < 1) {
        return `${action.id} has an amount that is not a positive integer.`
      }
    }
    for (const requirement of action.requires) {
      if (requirement.type === 'inventory') {
        if (!itemIds.has(requirement.item)) return `${action.id} requires a missing item.`
        if (!Number.isInteger(requirement.amount) || requirement.amount < 1) {
          return `${action.id} has an amount that is not a positive integer.`
        }
      } else if (requirement.type === 'action') {
        if (!actionIds.has(requirement.id)) return `${action.id} requires a missing action.`
      } else if (requirement.type === 'result') {
        if (!resultIds.has(requirement.id)) return `${action.id} requires a missing result.`
      } else {
        return `${action.id} has an unknown requirement.`
      }
    }
    for (const id of action.before) {
      if (!actionIds.has(id)) return `${action.id} lists a missing action in before.`
    }
    for (const effect of action.sets) {
      if (effect.type !== 'result') return `${action.id} has an unknown set.`
      if (!resultIds.has(effect.id)) return `${action.id} sets a missing result.`
    }
    for (const effect of action.clears) {
      if (effect.type !== 'result') return `${action.id} has an unknown clear.`
      if (!resultIds.has(effect.id)) return `${action.id} clears a missing result.`
    }
  }

  if (cycle(actions)) return 'Action requirements contain a cycle.'

  for (const achievement of achievements) {
    if (!achievement.id || !achievement.name || !achievement.description) {
      return 'Each achievement needs an id, a name, and a description.'
    }
    if (!Array.isArray(achievement.conditions) || achievement.conditions.length === 0) {
      return `${achievement.id} needs conditions.`
    }
    const conditionError = checkConditions(
      achievement.conditions,
      actionIds,
      achievementIds,
      achievement.id,
      new Set(),
    )
    if (conditionError) return conditionError
  }

  return null
}

function checkConditions(conditions, actionIds, achievementIds, owner, trail) {
  for (const condition of conditions) {
    if (condition.type === 'action') {
      if (!actionIds.has(condition.id)) return `${owner} points at a missing action.`
    } else if (condition.type === 'any') {
      if (!Array.isArray(condition.of) || condition.of.length === 0) {
        return `${owner} has an empty any.`
      }
      const nested = checkConditions(condition.of, actionIds, achievementIds, owner, trail)
      if (nested) return nested
    } else if (condition.type === 'achievement') {
      if (!achievementIds.has(condition.id)) return `${owner} points at a missing achievement.`
      if (trail.has(condition.id)) return `${owner} has an achievement condition cycle.`
    } else {
      return `${owner} has an unknown condition.`
    }
  }
  return null
}

function cycle(actions) {
  const next = new Map(
    actions.map((action) => [
      action.id,
      action.requires.filter((requirement) => requirement.type === 'action').map((requirement) => requirement.id),
    ]),
  )
  const color = new Map()
  const visit = (id) => {
    if (color.get(id) === 1) return true
    if (color.get(id) === 2) return false
    color.set(id, 1)
    for (const child of next.get(id) ?? []) {
      if (visit(child)) return true
    }
    color.set(id, 2)
    return false
  }
  return actions.some((action) => visit(action.id))
}

function dupes(rows) {
  const seen = new Set()
  for (const row of rows) {
    if (!row?.id) continue
    if (seen.has(row.id)) return true
    seen.add(row.id)
  }
  return false
}

function asList(value) {
  return Array.isArray(value) ? value : []
}
