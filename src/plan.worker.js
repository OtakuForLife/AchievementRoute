import { planRoute } from './route.js'

self.onmessage = (event) => {
  const { requestId, game, achievementIds } = event.data ?? {}
  try {
    const result = planRoute(game, achievementIds)
    self.postMessage({ requestId, result })
  } catch (error) {
    self.postMessage({
      requestId,
      result: { ok: false, message: error?.message ?? 'Planning failed.' },
    })
  }
}
