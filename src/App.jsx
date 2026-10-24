import { useState } from 'react'
import { loadGames } from './loadGames.js'
import { planRoute } from './route.js'

const loaded = loadGames()

function StepRow({ step, index }) {
  return (
    <li key={`${step.id}-${step.occurrence}-${step.run}`} className="step" style={{ '--i': index }}>
      <span className="index">{step.number}</span>
      <div>
        <p className="place">{step.area}</p>
        <p className="what">{step.description}</p>
        {step.sourceName && <p className="source">Farm: {step.sourceName}</p>}
        {step.achievements.length > 0 && <p className="earned">{step.achievements.join(', ')}</p>}
      </div>
    </li>
  )
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

export default function App() {
  const [gameId, setGameId] = useState(loaded.games[0]?.id ?? '')
  const [picked, setPicked] = useState(() => new Set())
  const [result, setResult] = useState(null)
  const [display, setDisplay] = useState('all')
  const game = loaded.games.find((item) => item.id === gameId) ?? null

  function chooseGame(id) {
    setGameId(id)
    setPicked(new Set())
    setResult(null)
  }

  function toggle(id) {
    setPicked((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function generate() {
    if (!game) return
    if (picked.size === 0) {
      setResult({ ok: false, message: 'Select at least one achievement.' })
      return
    }
    setResult(planRoute(game, [...picked]))
  }

  return (
    <div className="ledger">
      <header className="mast">
        <p className="eyebrow">Wayfinder</p>
        <h1>Achievement Route</h1>
        <p className="lede">One list for every mark you choose. Shared work is done once.</p>
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
          <h2>The ledger is empty</h2>
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

            <fieldset>
              <legend>Achievements</legend>
              <ul className="marks">
                {game.achievements.map((achievement) => {
                  const on = picked.has(achievement.id)
                  return (
                    <li key={achievement.id}>
                      <button
                        type="button"
                        aria-pressed={on}
                        className={on ? 'mark on' : 'mark'}
                        onClick={() => toggle(achievement.id)}
                      >
                        <span className="mark-name">{achievement.name}</span>
                        <span className="mark-detail">{achievement.description}</span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            </fieldset>

            <button type="button" className="generate" onClick={generate}>
              Generate Route
            </button>
          </section>

          <section className="route" aria-live="polite" aria-label="Route">
            {!result && <p className="waiting">The route will be written here.</p>}
            {result && !result.ok && <p className="warning">{result.message}</p>}
            {result?.ok && (
              <>
                <div className="display-mode" role="group" aria-label="Route display">
                  <button
                    type="button"
                    className={display === 'all' ? 'mode on' : 'mode'}
                    aria-pressed={display === 'all'}
                    onClick={() => setDisplay('all')}
                  >
                    All steps
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
                {display === 'all' ? (
                  <ol className="steps">
                    {result.steps.map((step, index) => (
                      <StepRow key={`${step.id}-${step.occurrence}-${step.run}`} step={step} index={index} />
                    ))}
                  </ol>
                ) : (
                  <div className="run-list">
                    {groupByRun(result.steps).map((group) => (
                      <section key={group.run} className="run-block">
                        <h2 className="run-title">Run {group.run}</h2>
                        <ol className="steps">
                          {group.steps.map((step, index) => (
                            <StepRow
                              key={`${step.id}-${step.occurrence}-${step.run}`}
                              step={{ ...step, number: index + 1 }}
                              index={index}
                            />
                          ))}
                        </ol>
                      </section>
                    ))}
                  </div>
                )}
              </>
            )}
          </section>
        </div>
      )}
    </div>
  )
}
