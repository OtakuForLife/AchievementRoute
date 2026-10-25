import { validateGame } from './route.js'

export function loadGames() {
  const modules = import.meta.glob('../data/*.json', { eager: true })
  const games = []
  const errors = []
  const files = {}

  for (const [path, mod] of Object.entries(modules)) {
    const file = path.split('/').pop()
    const data = mod.default ?? mod
    const error = validateGame(data)
    if (error) errors.push(`${file}: ${error}`)
    else {
      games.push(data)
      files[data.id] = file
    }
  }

  games.sort((a, b) => a.name.localeCompare(b.name))
  errors.sort()
  return { games, errors, files }
}
