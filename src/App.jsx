import { useEffect, useMemo, useRef, useState } from 'react'
import { loadGames } from './loadGames.js'
import { planRouteAsync } from './planAsync.js'

const loaded = loadGames()
const STORAGE_KEY = 'achievement-route:v1'

function stepKey(step) {
  return `${step.id}:${step.occurrence}:${step.run}`
}

function loadStore() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

function saveStore(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

function formatRouteText(steps, display) {
  if (display === 'runs') {
    const lines = []
    let currentRun = null
    for (const step of steps) {
      if (step.run !== currentRun) {
        currentRun = step.run
        if (lines.length) lines.push('')
        lines.push(`Run ${currentRun}`)
      }
      lines.push(formatStepLine(step))
      if (step.sourceName) lines.push(`  Farm: ${step.sourceName}`)
      if (step.achievements.length) lines.push(`  → ${step.achievements.join(', ')}`)
    }
    return lines.join('\n')
  }

  return steps
    .flatMap((step) => {
      const rows = [formatStepLine(step)]
      if (step.sourceName) rows.push(`  Farm: ${step.sourceName}`)
      if (step.achievements.length) rows.push(`  → ${step.achievements.join(', ')}`)
      return rows
    })
    .join('\n')
}

function formatStepLine(step) {
  return `${step.number}. [${step.area}] ${step.description}`
}

function groupByRun(steps) {
  const runs = []
  for (const step of steps) {
    const last = runs[runs.length - 1]
    if (!last || last.run !== step.run) runs.push({ run: step.run, steps: [step] })
    else last.steps.push(step)
  }
  return runs
}

function nestedAchievementIds(conditions, achievementById, seen = new Set()) {
  const ids = []
  for (const condition of conditions ?? []) {
    if (condition.type === 'achievement') {
      if (seen.has(condition.id)) continue
      seen.add(condition.id)
      ids.push(condition.id)
      const nested = achievementById.get(condition.id)
      if (nested) ids.push(...nestedAchievementIds(nested.conditions, achievementById, seen))
    } else if (condition.type === 'any') {
      ids.push(...nestedAchievementIds(condition.of, achievementById, seen))
    }
  }
  return ids
}

function jumpToStep(number) {
  const el = document.getElementById(`step-${number}`)
  el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
}

function RouteViz({ steps, checked, picked, achievements }) {
  const runs = useMemo(() => groupByRun(steps), [steps])
  const total = steps.length
  const doneSteps = steps.filter((step) => checked.has(stepKey(step))).length

  const milestones = useMemo(() => {
    const byName = new Map(achievements.map((row) => [row.name, row]))
    const rows = []
    for (const step of steps) {
      for (const name of step.achievements) {
        const row = byName.get(name)
        rows.push({
          name,
          id: row?.id,
          step: step.number,
          run: step.run,
          done: checked.has(stepKey(step)),
          selected: row ? picked.has(row.id) : true,
        })
      }
    }
    return rows
  }, [steps, checked, picked, achievements])

  const earned = milestones.filter((row) => row.done).length

  return (
    <div className="viz">
      <div className="viz-progress">
        <div className="viz-meters" aria-hidden="true">
          <div className="viz-meter">
            <span className="viz-meter-fill" style={{ width: `${total ? (doneSteps / total) * 100 : 0}%` }} />
          </div>
        </div>
        <p className="viz-stats">
          <span>
            {doneSteps}/{total} steps
          </span>
          <span>
            {earned}/{milestones.length} achievements
          </span>
        </p>
      </div>

      <div className="viz-runs" role="list" aria-label="Runs">
        {runs.map((group) => {
          const done = group.steps.filter((step) => checked.has(stepKey(step))).length
          const flex = group.steps.length
          return (
            <button
              key={group.run}
              type="button"
              role="listitem"
              className="viz-run"
              style={{ flex }}
              title={`Run ${group.run}: ${done}/${group.steps.length} steps`}
              onClick={() => jumpToStep(group.steps[0].number)}
            >
              <span className="viz-run-label">R{group.run}</span>
              <span className="viz-run-track">
                <span
                  className="viz-run-fill"
                  style={{ width: `${group.steps.length ? (done / group.steps.length) * 100 : 0}%` }}
                />
              </span>
              <span className="viz-run-count">{group.steps.length}</span>
            </button>
          )
        })}
      </div>

      {milestones.length > 0 && (
        <ul className="viz-marks" aria-label="Achievement milestones">
          {milestones.map((row) => (
            <li key={`${row.name}-${row.step}`}>
              <button
                type="button"
                className={row.done ? 'viz-mark done' : 'viz-mark'}
                onClick={() => jumpToStep(row.step)}
              >
                <span className="viz-mark-step">#{row.step}</span>
                <span className="viz-mark-name">{row.name}</span>
                <span className="viz-mark-run">run {row.run}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function StepRow({ step, index, checked, onToggle }) {
  const key = stepKey(step)
  return (
    <li id={`step-${step.number}`} className={checked ? 'step done' : 'step'} style={{ '--i': index }}>
      <label className="step-check">
        <input type="checkbox" checked={checked} onChange={() => onToggle(key)} />
        <span className="index">{step.number}</span>
      </label>
      <div>
        <p className="place">{step.area}</p>
        <p className="what">{step.description}</p>
        {step.sourceName && <p className="source">Farm: {step.sourceName}</p>}
        {step.achievements.length > 0 && <p className="earned">{step.achievements.join(', ')}</p>}
      </div>
    </li>
  )
}

export default function App() {
  const stored = loadStore()
  const initialGameId =
    loaded.games.find((g) => g.id === stored?.gameId)?.id ?? loaded.games[0]?.id ?? ''
  const initialGameState = stored?.byGame?.[initialGameId]

  const [gameId, setGameId] = useState(initialGameId)
  const [picked, setPicked] = useState(() => new Set(initialGameState?.picked ?? []))
  const [checked, setChecked] = useState(() => new Set(initialGameState?.checked ?? []))
  const [display, setDisplay] = useState(stored?.display ?? 'all')
  const [query, setQuery] = useState('')
  const [copied, setCopied] = useState(false)
  const [result, setResult] = useState(null)
  const [planning, setPlanning] = useState(false)
  const planRequest = useRef(0)
  const game = loaded.games.find((item) => item.id === gameId) ?? null

  async function runPlan(nextGame, ids) {
    const request = ++planRequest.current
    setPlanning(true)
    try {
      const next = await planRouteAsync(nextGame, ids)
      if (request !== planRequest.current) return
      setResult(next)
      if (next.ok) {
        const keys = new Set(next.steps.map(stepKey))
        setChecked((current) => new Set([...current].filter((k) => keys.has(k))))
      } else {
        setChecked(new Set())
      }
    } finally {
      if (request === planRequest.current) setPlanning(false)
    }
  }

  // Auto-generate if we restored picks
  useEffect(() => {
    if (!game || picked.size === 0) return
    runPlan(game, [...picked])
    // ponytail: mount-only restore; game/picked changes go through explicit handlers
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const prev = loadStore() ?? { byGame: {} }
    saveStore({
      gameId,
      display,
      byGame: {
        ...prev.byGame,
        [gameId]: {
          picked: [...picked],
          checked: [...checked],
        },
      },
    })
  }, [gameId, picked, checked, display])

  const filtered = useMemo(() => {
    if (!game) return []
    const q = query.trim().toLowerCase()
    if (!q) return game.achievements
    return game.achievements.filter(
      (a) => a.name.toLowerCase().includes(q) || a.description.toLowerCase().includes(q),
    )
  }, [game, query])

  const runCount = result?.ok ? groupByRun(result.steps).length : 0
  const doneCount = result?.ok ? result.steps.filter((s) => checked.has(stepKey(s))).length : 0

  function chooseGame(id) {
    const prev = loadStore()
    const nextState = prev?.byGame?.[id]
    setGameId(id)
    setPicked(new Set(nextState?.picked ?? []))
    setChecked(new Set(nextState?.checked ?? []))
    setQuery('')
    setResult(null)
    if (nextState?.picked?.length) {
      const nextGame = loaded.games.find((item) => item.id === id)
      if (nextGame) runPlan(nextGame, nextState.picked)
    }
  }

  function toggle(id) {
    setPicked((current) => {
      const next = new Set(current)
      if (next.has(id)) {
        next.delete(id)
        return next
      }
      next.add(id)
      if (game) {
        const byId = new Map(game.achievements.map((row) => [row.id, row]))
        const achievement = byId.get(id)
        for (const nestedId of nestedAchievementIds(achievement?.conditions, byId)) {
          next.add(nestedId)
        }
      }
      return next
    })
  }

  function selectAll() {
    if (!game) return
    setPicked(new Set(game.achievements.map((row) => row.id)))
  }

  function clearPicked() {
    planRequest.current += 1
    setPlanning(false)
    setPicked(new Set())
    setResult(null)
    setChecked(new Set())
  }

  function generate() {
    if (!game || planning) return
    if (picked.size === 0) {
      setResult({ ok: false, message: 'Select at least one achievement.' })
      return
    }
    runPlan(game, [...picked])
  }

  function toggleChecked(key) {
    setChecked((current) => {
      const next = new Set(current)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  async function copyRoute() {
    if (!result?.ok) return
    const text = formatRouteText(result.steps, display)
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1500)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div className="app">
      <header className="top">
        <h1>Achievement Route</h1>
      </header>

      {loaded.errors.length > 0 && (
        <ul className="file-errors">
          {loaded.errors.map((error) => (
            <li key={error}>{error}</li>
          ))}
        </ul>
      )}

      {loaded.games.length === 0 ? (
        <section className="empty" aria-live="polite">
          <h2>No games loaded</h2>
          <p>Add a game JSON file to the data folder. The dev server picks it up.</p>
        </section>
      ) : (
        <div className="sheet">
          <section className="picker">
            <label className="field" htmlFor="game">
              Game
              <select id="game" value={gameId} onChange={(event) => chooseGame(event.target.value)}>
                {loaded.games.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>

            <div className="picker-head">
              <h2 className="section-label">Achievements</h2>
              <p className="count">
                {picked.size} selected
                {game && picked.size < game.achievements.length && (
                  <>
                    {' · '}
                    <button type="button" className="text-btn" onClick={selectAll}>
                      Select all
                    </button>
                  </>
                )}
                {picked.size > 0 && (
                  <>
                    {' · '}
                    <button type="button" className="text-btn" onClick={clearPicked}>
                      Clear
                    </button>
                  </>
                )}
              </p>
            </div>

            <label className="search-field" htmlFor="ach-search">
              <span className="sr-only">Search achievements</span>
              <input
                id="ach-search"
                type="search"
                placeholder="Search…"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </label>

            <ul className="marks">
              {filtered.map((achievement) => {
                const on = picked.has(achievement.id)
                return (
                  <li key={achievement.id}>
                    <button
                      type="button"
                      aria-pressed={on}
                      className={on ? 'mark on' : 'mark'}
                      onClick={() => toggle(achievement.id)}
                    >
                      <span className={on ? 'box on' : 'box'} aria-hidden="true" />
                      <span className="mark-body">
                        <span className="mark-name">{achievement.name}</span>
                        <span className="mark-detail">{achievement.description}</span>
                      </span>
                    </button>
                  </li>
                )
              })}
              {filtered.length === 0 && <li className="no-match">No achievements match.</li>}
            </ul>

            <div className="generate-bar">
              <button type="button" className="generate" onClick={generate} disabled={planning}>
                {planning ? 'Planning…' : 'Generate route'}
              </button>
            </div>
          </section>

          <section className="route" aria-live="polite" aria-label="Route">
            {planning && <p className="waiting">Planning route…</p>}
            {!planning && !result && (
              <p className="waiting">Select achievements, then generate a route.</p>
            )}
            {!planning && result && !result.ok && <p className="warning">{result.message}</p>}
            {!planning && result?.ok && (
              <>
                <div className="route-head">
                  <p className="route-meta">
                    Route · {result.steps.length} steps
                    {runCount > 1 ? ` · ${runCount} runs` : ''}
                    {doneCount > 0 ? ` · ${doneCount} done` : ''}
                  </p>
                  <div className="route-actions">
                    <div className="display-mode" role="group" aria-label="Route display">
                      <button
                        type="button"
                        className={display === 'all' ? 'mode on' : 'mode'}
                        aria-pressed={display === 'all'}
                        onClick={() => setDisplay('all')}
                      >
                        All
                      </button>
                      <button
                        type="button"
                        className={display === 'runs' ? 'mode on' : 'mode'}
                        aria-pressed={display === 'runs'}
                        onClick={() => setDisplay('runs')}
                      >
                        By run
                      </button>
                    </div>
                    <button type="button" className="copy" onClick={copyRoute}>
                      {copied ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                </div>

                <RouteViz
                  steps={result.steps}
                  checked={checked}
                  picked={picked}
                  achievements={game?.achievements ?? []}
                />

                <div className="route-scroll">
                  {display === 'all' ? (
                    <ol className="steps">
                      {result.steps.map((step, index) => (
                        <StepRow
                          key={stepKey(step)}
                          step={step}
                          index={index}
                          checked={checked.has(stepKey(step))}
                          onToggle={toggleChecked}
                        />
                      ))}
                    </ol>
                  ) : (
                    <div className="run-list">
                      {groupByRun(result.steps).map((group) => (
                        <details key={group.run} className="run-block" open>
                          <summary className="run-title">
                            Run {group.run}
                            <span className="run-count">
                              {group.steps.length} steps · global{' '}
                              {group.steps[0].number}–{group.steps[group.steps.length - 1].number}
                            </span>
                          </summary>
                          <ol className="steps">
                            {group.steps.map((step, index) => (
                              <StepRow
                                key={stepKey(step)}
                                step={step}
                                index={index}
                                checked={checked.has(stepKey(step))}
                                onToggle={toggleChecked}
                              />
                            ))}
                          </ol>
                        </details>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </section>
        </div>
      )}
    </div>
  )
}
