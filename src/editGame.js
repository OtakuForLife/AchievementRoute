const ACTION_LISTS = ['gives', 'consumes', 'requires', 'before', 'sets', 'clears']

export function uniqueId(rows, prefix) {
  const taken = new Set(rows.map((row) => row.id))
  let n = rows.length + 1
  let id = `${prefix}-${n}`
  while (taken.has(id)) {
    n += 1
    id = `${prefix}-${n}`
  }
  return id
}

// Drop empty optional lists so a round-trip does not rewrite untouched actions.
export function writeAction(action) {
  const next = { ...action }
  for (const key of ACTION_LISTS) {
    if (!Array.isArray(next[key]) || next[key].length === 0) delete next[key]
  }
  if (next.type === 'farm') {
    next.source = next.source?.type === 'enemy' ? next.source : { type: 'enemy', id: next.source?.id ?? '' }
  } else {
    delete next.source
  }
  if (!next.repeatable || next.type === 'farm') delete next.repeatable
  if (!next.newRun) delete next.newRun
  return next
}

export function blankAction(rows, areaId) {
  return {
    id: uniqueId(rows, 'action'),
    type: 'interact',
    description: '',
    area: areaId ?? '',
  }
}

export function blankAchievement(rows) {
  return {
    id: uniqueId(rows, 'achievement'),
    name: '',
    description: '',
    conditions: [{ type: 'action', id: '' }],
  }
}

export async function saveGameFile(file, data) {
  const response = await fetch(`/api/games/${encodeURIComponent(file)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!response.ok) {
    const text = await response.text()
    throw new Error(text || `Save failed (${response.status}).`)
  }
}
