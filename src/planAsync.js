// ponytail: one shared worker; UI stays responsive while the route is planned.
let worker = null
let nextId = 1
const pending = new Map()

function getWorker() {
  if (worker) return worker
  worker = new Worker(new URL('./plan.worker.js', import.meta.url), { type: 'module' })
  worker.onmessage = (event) => {
    const { requestId, result } = event.data ?? {}
    const settle = pending.get(requestId)
    if (!settle) return
    pending.delete(requestId)
    settle.resolve(result)
  }
  worker.onerror = (event) => {
    for (const [, settle] of pending) {
      settle.resolve({ ok: false, message: event.message || 'Planning worker failed.' })
    }
    pending.clear()
  }
  return worker
}

export function planRouteAsync(game, achievementIds) {
  const requestId = nextId++
  return new Promise((resolve) => {
    pending.set(requestId, { resolve })
    getWorker().postMessage({ requestId, game, achievementIds })
  })
}
