// Production server: serves the built app (dist/) and the data API (/api/habit, /api/checklist, /api/workouts, /api/time, /api/calendar). No dependencies beyond Node.
//   npm run build && npm start
// Settings (environment variables):
//   PORT            port to listen on            (default 3000)
//   HOST            address to bind              (default 0.0.0.0 = reachable from your network)
//   HABIT_DATA_DIR  where the data lives          (default ./data)
import fs from 'node:fs'
import http from 'node:http'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { calendarApi } from './calendar.js'
import { closeAll, eventsApi } from './events.js'
import { checklistApi } from './checklist.js'
import { habitApi } from './habits.js'
import { timeApi } from './time.js'
import { workoutApi } from './workouts.js'

const DIST = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'dist')
const PORT = Number(process.env.PORT ?? 3000)
const HOST = process.env.HOST ?? '0.0.0.0'

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
  '.woff2': 'font/woff2',
}

if (!fs.existsSync(path.join(DIST, 'index.html'))) {
  console.error('dist/index.html not found. Run "npm run build" first.')
  process.exit(1)
}

function send(res, status, text) {
  res.writeHead(status, { 'Content-Type': 'text/plain; charset=utf-8' })
  res.end(text)
}

function serveFile(req, res, file, immutable) {
  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) return send(res, 404, 'Not found')
    res.writeHead(200, {
      'Content-Type': TYPES[path.extname(file)] ?? 'application/octet-stream',
      'Content-Length': st.size,
      // built assets have hashed names, so they can be cached forever; index.html must always be re-checked
      'Cache-Control': immutable ? 'public, max-age=31536000, immutable' : 'no-cache',
    })
    if (req.method === 'HEAD') return res.end()
    fs.createReadStream(file).on('error', () => res.destroy()).pipe(res)
  })
}

const server = http.createServer((req, res) => {
  try {
    res.setHeader('X-Content-Type-Options', 'nosniff')
    res.setHeader('X-Frame-Options', 'DENY')
    res.setHeader('Referrer-Policy', 'no-referrer')

    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname)
    if (pathname.includes('\0')) return send(res, 400, 'Bad request')

    if (pathname === '/api/habit') return habitApi(req, res)
    if (pathname === '/api/checklist') return checklistApi(req, res)
    if (pathname === '/api/workouts') return workoutApi(req, res)
    if (pathname === '/api/time') return timeApi(req, res)
    if (pathname === '/api/calendar' || pathname.startsWith('/api/calendar/')) return calendarApi(req, res)
    if (pathname === '/api/events') return eventsApi(req, res)
    if (pathname === '/healthz') return send(res, 200, 'ok')
    if (req.method !== 'GET' && req.method !== 'HEAD') return send(res, 405, 'Method not allowed')

    const file = path.join(DIST, pathname)
    if (file !== DIST && !file.startsWith(DIST + path.sep)) return send(res, 403, 'Forbidden') // no escaping dist/

    fs.stat(file, (err, st) => {
      if (!err && st.isFile()) return serveFile(req, res, file, pathname.startsWith('/assets/'))
      // an unknown path without a file extension is a page of the single-page app
      if (!path.extname(pathname)) return serveFile(req, res, path.join(DIST, 'index.html'), false)
      send(res, 404, 'Not found')
    })
  } catch {
    send(res, 400, 'Bad request')
  }
})

server.listen(PORT, HOST, () => console.log(`Habit tracker on http://${HOST}:${server.address().port} (data: ${process.env.HABIT_DATA_DIR ?? 'data'})`))

// `docker stop` sends SIGTERM: finish in-flight requests, then exit
for (const signal of ['SIGTERM', 'SIGINT']) {
  process.on(signal, () => {
    closeAll() // the live-update connections would otherwise hold the server open
    server.close(() => process.exit(0))
    setTimeout(() => process.exit(0), 3000).unref()
  })
}
