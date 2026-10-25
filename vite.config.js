import fs from 'node:fs'
import path from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { validateGame } from './src/route.js'

const FILE_NAME = /^[A-Za-z0-9][A-Za-z0-9._-]*\.json$/

function readBody(req, limit = 2_000_000) {
  return new Promise((resolve, reject) => {
    const chunks = []
    let size = 0
    req.on('data', (chunk) => {
      size += chunk.length
      if (size > limit) {
        reject(new Error('File is too large.'))
        req.destroy()
        return
      }
      chunks.push(chunk)
    })
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
    req.on('error', reject)
  })
}

function saveGamePlugin() {
  const handle = async (req, res, next) => {
    const url = req.url?.split('?')[0] ?? ''
    const match = url.match(/^\/api\/games\/([^/]+)$/)
    if (!match || req.method !== 'PUT') return next()

    const filename = decodeURIComponent(match[1])
    if (!FILE_NAME.test(filename)) {
      res.statusCode = 400
      res.end('Bad filename.')
      return
    }

    const dataDir = path.resolve(process.cwd(), 'data')
    const target = path.resolve(dataDir, filename)
    if (target !== path.join(dataDir, filename)) {
      res.statusCode = 400
      res.end('Bad filename.')
      return
    }
    if (!fs.existsSync(target)) {
      res.statusCode = 404
      res.end('No such game file.')
      return
    }

    try {
      const data = JSON.parse(await readBody(req))
      const error = validateGame(data)
      if (error) {
        res.statusCode = 400
        res.end(error)
        return
      }
      fs.writeFileSync(target, `${JSON.stringify(data, null, 2)}\n`)
      res.statusCode = 204
      res.end()
    } catch (error) {
      if (res.writableEnded) return
      res.statusCode = 400
      res.end(error?.message || 'Could not save the game.')
    }
  }

  return {
    name: 'save-game',
    configureServer(server) {
      server.middlewares.use(handle)
    },
    configurePreviewServer(server) {
      server.middlewares.use(handle)
    },
  }
}

export default defineConfig({
  plugins: [react(), saveGamePlugin()],
  server: {
    watch: process.env.CHOKIDAR_USEPOLLING ? { usePolling: true } : undefined,
  },
})
