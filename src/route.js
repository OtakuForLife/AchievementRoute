// Achievement Route planner
//
// Algorithm (group-and-merge):
// 1. Resolve each selected achievement alone (greedy dependency walk) → solo steps.
// 2. Build a conflict graph: A conflicts with B if they cannot both finish in one
//    cycle (greedy resolve of {A,B} with newRun forbidden fails).
// 3. Color the conflict graph (min colors ≈ min runs). Exact bit-DP for n≤18,
//    greedy Welsh-Powell otherwise.
// 4. For each color class (group), merge by greedy-resolving that set of
 //    achievements in one pass (shared work done once, correct order).
// 5. Between groups, perform a newRun when the world still has cycle progress.
 //
 // World state = { done, results, inventory, everDone, run }
 //   done      — once-only actions since last reset
 //   results   — flags (persist:true keep on newRun)
 //   inventory — counts (persist:true keep on newRun)
 //   everDone  — achievement ledger (never cleared)
 //   run       — UI counter only
 //
 // requires {type:"action"} → must be in done (this cycle), not merely everDone.

export const ITEM_TYPES = ['key', 'weapon', 'consumable', 'material', 'spell', 'soul']
export const ACTION_TYPES = ['collect', 'interact', 'fight', 'go', 'farm']
const ITEM_TYPE_SET = new Set(ITEM_TYPES)
const ACTION_TYPE_SET = new Set(ACTION_TYPES)
const MAX_STEPS = 5_000
const EXACT_COLOR_LIMIT = 18

export function planRoute(game, achievementIds) {
  const actions = (game.actions ?? []).map(normalizeAction)
  const byId = new Map(actions.map((action) => [action.id, action]))
  const achievements = game.achievements ?? []
  const achievementById = new Map(achievements.map((row) => [row.id, row]))
  const selected = []

  for (const id of achievementIds ?? []) {
    const achievement = achievementById.get(id)
    if (!achievement) return fail(`Unknown achievement ${id}.`)
    selected.push(achievement)
  }

  if (selected.length === 0) return fail('Select at least one achievement.')

  const itemById = new Map((game.items ?? []).map((item) => [item.id, item]))
  const resultById = new Map((game.results ?? []).map((row) => [row.id, row]))
  const enemyById = new Map((game.enemies ?? []).map((enemy) => [enemy.id, enemy]))
  const areas = new Map((game.areas ?? []).map((area) => [area.id, area.name]))
  const newRunActions = actions.filter((action) => action.newRun)

  const baseCtx = {
    byId,
    actions,
    itemById,
    resultById,
    achievementById,
    newRunActions,
    preferredActions: preferredActionIds(selected, achievementById),
    allowNewRun: true,
  }

  // 1) Solo plans — fail early if any achievement is impossible alone.
  for (const achievement of selected) {
    const solo = resolveAchievements([achievement], emptyState(), {
      ...baseCtx,
      preferredActions: preferredActionIds([achievement], achievementById),
      allowNewRun: true,
    })
    if (!solo.ok) return solo
  }

  // 2) Conflict graph — cannot share one cycle.
  const n = selected.length
  const conflict = Array.from({ length: n }, () => Array(n).fill(false))
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const pair = resolveAchievements([selected[i], selected[j]], emptyState(), {
        ...baseCtx,
        preferredActions: preferredActionIds([selected[i], selected[j]], achievementById),
        allowNewRun: false,
      })
      const clashes = !pair.ok
      conflict[i][j] = clashes
      conflict[j][i] = clashes
    }
  }

  // 3) Min groups (graph coloring).
  const colors = colorConflict(conflict)
  const groupCount = Math.max(0, ...colors) + 1
  const groups = Array.from({ length: groupCount }, () => [])
  for (let i = 0; i < n; i++) groups[colors[i]].push(selected[i])

  // Stable group order: by earliest selected index in each group.
  groups.sort((a, b) => selected.indexOf(a[0]) - selected.indexOf(b[0]))

  // 4–5) Merge within each group; newRun between groups when needed.
  const state = emptyState()
  const steps = []
  try {
    for (let g = 0; g < groups.length; g++) {
      const remaining = groups.slice(g).flat()
      if (g > 0 && state.done.size > 0) {
        ensureNewRun(state, steps, {
          ...baseCtx,
          allowNewRun: true,
          packSelected: remaining,
          preferredActions: preferredActionIds(remaining, achievementById),
        })
      }
      const group = groups[g]
      const merged = resolveAchievements(group, state, {
        ...baseCtx,
        preferredActions: preferredActionIds(group, achievementById),
        allowNewRun: true,
        packSelected: group,
        steps,
      })
      if (!merged.ok) return merged
    }
  } catch (error) {
    if (error?.planFail) return fail(error.message)
    throw error
  }

  if (steps.length > MAX_STEPS) return fail('This route is over the step limit.')

  return formatResult(steps, selected, byId, enemyById, areas, achievementById)
}

function fail(message) {
  return { ok: false, message }
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

function preferredActionIds(selected, achievementById) {
  const ids = new Set()
  const walk = (conditions, seen) => {
    for (const condition of conditions ?? []) {
      if (condition.type === 'action') ids.add(condition.id)
      else if (condition.type === 'any') walk(condition.of, seen)
      else if (condition.type === 'achievement' && !seen.has(condition.id)) {
        seen.add(condition.id)
        const nested = achievementById.get(condition.id)
        if (nested) walk(nested.conditions, seen)
      }
    }
  }
  for (const achievement of selected) walk(achievement.conditions, new Set())
  return ids
}

function resolveAchievements(selected, state, ctx) {
  const steps = ctx.steps ?? []
  const ownedSteps = ctx.steps === undefined
  try {
    for (const achievement of selected) {
      if (earned(achievement, state.everDone, ctx.achievementById)) continue
      ensureConditions(achievement.conditions, state, steps, ctx, new Set())
    }
  } catch (error) {
    if (error?.planFail) return fail(error.message)
    throw error
  }
  if (steps.length > MAX_STEPS) return fail('This route is over the step limit.')
  return { ok: true, steps: ownedSteps ? steps : undefined }
}

function ensureConditions(conditions, state, steps, ctx, seenAchievements) {
  for (const condition of conditions ?? []) {
    ensureCondition(condition, state, steps, ctx, seenAchievements)
  }
}

function ensureCondition(condition, state, steps, ctx, seenAchievements) {
  if (condition.type === 'action') {
    ensureSatisfied(condition.id, state, steps, ctx)
    return
  }
  if (condition.type === 'any') {
    const options = condition.of ?? []
    if (options.length === 0) planFail('Empty any condition.')
    if (options.some((inner) => conditionMet(inner, state.everDone, ctx.achievementById))) return
    let last = null
    for (const inner of options) {
      const snap = snapshot(state)
      const stepSnap = steps.length
      try {
        ensureCondition(inner, state, steps, ctx, seenAchievements)
        return
      } catch (error) {
        if (!error?.planFail) throw error
        last = error
        restore(state, snap)
        steps.length = stepSnap
      }
    }
    planFail(last?.message ?? 'No branch of an any-condition works.')
  }
  if (condition.type === 'achievement') {
    if (seenAchievements.has(condition.id)) planFail(`Achievement condition cycle at ${condition.id}.`)
    const nested = ctx.achievementById.get(condition.id)
    if (!nested) planFail(`Unknown achievement condition ${condition.id}.`)
    seenAchievements.add(condition.id)
    ensureConditions(nested.conditions, state, steps, ctx, seenAchievements)
    seenAchievements.delete(condition.id)
  }
}

function ensureSatisfied(actionId, state, steps, ctx) {
  if (state.everDone.has(actionId) || state.done.has(actionId)) return
  ensurePerform(actionId, state, steps, ctx)
}

function ensureDone(actionId, state, steps, ctx) {
  if (state.done.has(actionId)) return
  ensurePerform(actionId, state, steps, ctx)
}

function ensurePerform(actionId, state, steps, ctx) {
  const action = ctx.byId.get(actionId)
  if (!action) planFail(`Missing action ${actionId}.`)
  if (ctx.packing && action.newRun) planFail('new run blocked while packing.')

  for (const other of ctx.actions) {
    if (!other.before.includes(actionId)) continue
    if (!ctx.preferredActions.has(other.id)) continue
    if (state.everDone.has(other.id) || state.done.has(other.id)) continue
    ensurePerform(other.id, state, steps, ctx)
  }

  if (state.done.has(actionId) && !isRepeatable(action)) {
    ensureNewRun(state, steps, ctx)
  }

  for (const blocked of action.before) {
    if (state.done.has(blocked)) {
      ensureNewRun(state, steps, ctx)
      break
    }
  }

  for (const requirement of action.requires) {
    if (requirement.type === 'action') ensureDone(requirement.id, state, steps, ctx)
    else if (requirement.type === 'inventory') ensureItems(requirement.item, requirement.amount, state, steps, ctx)
    else if (requirement.type === 'result') ensureResult(requirement.id, state, steps, ctx)
  }

  for (const stack of action.consumes) {
    ensureItems(stack.item, stack.amount, state, steps, ctx)
  }

  for (const blocked of action.before) {
    if (state.done.has(blocked)) ensureNewRun(state, steps, ctx)
  }

  if (state.done.has(actionId) && !isRepeatable(action)) {
    ensureNewRun(state, steps, ctx)
  }

  perform(action, state, steps, ctx)
}

function ensureItems(itemId, amount, state, steps, ctx) {
  while (count(state.inventory, itemId) < amount) {
    const giver = pickGiver(itemId, ctx.actions, state, ctx.preferredActions, ctx.allowNewRun)
    if (!giver) {
      const name = ctx.itemById.get(itemId)?.name ?? itemId
      planFail(`Nothing gives enough ${name}.`)
    }
    ensurePerform(giver.id, state, steps, ctx)
  }
}

function ensureResult(resultId, state, steps, ctx) {
  if (state.results.has(resultId)) return
  const setter = ctx.actions.find((action) =>
    action.sets.some((effect) => effect.type === 'result' && effect.id === resultId),
  )
  if (!setter) planFail(`Nothing sets result ${resultId}.`)
  ensurePerform(setter.id, state, steps, ctx)
  if (!state.results.has(resultId)) planFail(`Result ${resultId} was not set.`)
}

function ensureNewRun(state, steps, ctx) {
  if (!ctx.allowNewRun) planFail('new run blocked in this cycle.')
  if (ctx.packing) planFail('new run blocked while packing.')
  if (ctx.newRunActions.length === 0) {
    planFail('A new run is needed, but this game has no newRun action.')
  }
  packCurrentCycle(state, steps, ctx)
  let last = null
  for (const action of ctx.newRunActions) {
    if (state.done.has(action.id) && !isRepeatable(action)) continue
    const snap = snapshot(state)
    const stepSnap = steps.length
    try {
      for (const requirement of action.requires) {
        if (requirement.type === 'action') ensureDone(requirement.id, state, steps, ctx)
        else if (requirement.type === 'inventory') ensureItems(requirement.item, requirement.amount, state, steps, ctx)
        else if (requirement.type === 'result') ensureResult(requirement.id, state, steps, ctx)
      }
      for (const stack of action.consumes) {
        ensureItems(stack.item, stack.amount, state, steps, ctx)
      }
      perform(action, state, steps, ctx)
      return
    } catch (error) {
      if (!error?.planFail) throw error
      last = error
      restore(state, snap)
      steps.length = stepSnap
    }
  }
  planFail(last?.message ?? 'Could not start a new run.')
}

function packCurrentCycle(state, steps, ctx) {
  if (ctx.packing) return
  const selected = ctx.packSelected
  if (!selected?.length) return
  ctx.packing = true
  const prevAllow = ctx.allowNewRun
  ctx.allowNewRun = false
  try {
    let progress = true
    while (progress) {
      progress = false
      for (const achievement of selected) {
        if (earned(achievement, state.everDone, ctx.achievementById)) continue
        const snap = snapshot(state)
        const stepSnap = steps.length
        try {
          ensureConditions(achievement.conditions, state, steps, ctx, new Set())
          if (steps.length > stepSnap) progress = true
        } catch (error) {
          if (!error?.planFail) throw error
          restore(state, snap)
          steps.length = stepSnap
        }
      }
    }
  } finally {
    ctx.allowNewRun = prevAllow
    ctx.packing = false
  }
}

function pickGiver(itemId, actions, state, preferredActions = new Set(), allowNewRun = false) {
  const givers = actions.filter((action) => {
    if (!gives(action, itemId)) return false
    if (isRepeatable(action)) return true
    if (!state.done.has(action.id)) return true
    return allowNewRun
  })
  if (givers.length === 0) return null
  givers.sort((a, b) => {
    const aPref = preferredActions.has(a.id) ? 0 : 1
    const bPref = preferredActions.has(b.id) ? 0 : 1
    if (aPref !== bPref) return aPref - bPref
    const aDone = state.done.has(a.id) && !isRepeatable(a) ? 1 : 0
    const bDone = state.done.has(b.id) && !isRepeatable(b) ? 1 : 0
    if (aDone !== bDone) return aDone - bDone
    return a.id.localeCompare(b.id)
  })
  return givers[0]
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

function restore(state, snap) {
  state.done = snap.done
  state.results = snap.results
  state.inventory = snap.inventory
  state.everDone = snap.everDone
  state.run = snap.run
}

function count(inventory, item) {
  return inventory.get(item) ?? 0
}

function gives(action, item) {
  return (action.gives ?? []).some((stack) => stack.item === item && stack.amount > 0)
}

function colorConflict(conflict) {
  const n = conflict.length
  if (n === 0) return []
  if (n <= EXACT_COLOR_LIMIT) return colorExact(conflict)
  return colorGreedy(conflict)
}

// Minimum coloring via DP over independent sets. O(3^n)ish, fine for n≤18.
function colorExact(conflict) {
  const n = conflict.length
  const ok = new Array(1 << n).fill(false)
  ok[0] = true
  for (let mask = 1; mask < 1 << n; mask++) {
    let good = true
    for (let i = 0; i < n && good; i++) {
      if (((mask >> i) & 1) === 0) continue
      for (let j = i + 1; j < n; j++) {
        if (((mask >> j) & 1) === 0) continue
        if (conflict[i][j]) {
          good = false
          break
        }
      }
    }
    ok[mask] = good
  }

  const dp = new Array(1 << n).fill(Infinity)
  const pick = new Array(1 << n).fill(0)
  dp[0] = 0
  for (let mask = 1; mask < 1 << n; mask++) {
    for (let sub = mask; sub > 0; sub = (sub - 1) & mask) {
      if (!ok[sub]) continue
      const prev = mask ^ sub
      const cand = dp[prev] + 1
      if (cand < dp[mask]) {
        dp[mask] = cand
        pick[mask] = sub
      }
    }
  }

  const colors = Array(n).fill(-1)
  let color = 0
  let mask = (1 << n) - 1
  while (mask > 0) {
    const sub = pick[mask]
    for (let i = 0; i < n; i++) {
      if ((sub >> i) & 1) colors[i] = color
    }
    color += 1
    mask ^= sub
  }
  return colors
}

function colorGreedy(conflict) {
  const n = conflict.length
  const order = Array.from({ length: n }, (_, i) => i).sort((a, b) => {
    const da = conflict[a].filter(Boolean).length
    const db = conflict[b].filter(Boolean).length
    return db - da
  })
  const colors = Array(n).fill(-1)
  for (const v of order) {
    const used = new Set()
    for (let u = 0; u < n; u++) {
      if (conflict[v][u] && colors[u] >= 0) used.add(colors[u])
    }
    let c = 0
    while (used.has(c)) c += 1
    colors[v] = c
  }
  return colors
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
