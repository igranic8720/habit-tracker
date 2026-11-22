import fs from 'node:fs'
import path from 'node:path'

// One JSON file per habit: data/habits/<id>.json  (set HABIT_DATA_DIR to use another folder, e.g. for tests)
const DATA = path.resolve(process.env.HABIT_DATA_DIR ?? 'data')
const DIR = path.join(DATA, 'habits')
const LEGACY = path.join(DATA, 'habit.json') // the old single-file format
const ID = /^[A-Za-z0-9_-]{1,64}$/ // ids become file names, so keep them safe (no path separators)
const DATE = /^\d{4}-\d{2}-\d{2}$/

// write to a temp file, then rename: a crash mid-write can never leave a half-written habit file
function writeAtomic(file, text) {
  const tmp = `${file}.tmp-${process.pid}`
  fs.writeFileSync(tmp, text)
  fs.renameSync(tmp, file)
}

function isValid(habits) {
  return (
    Array.isArray(habits) &&
    new Set(habits.map((h) => h?.id)).size === habits.length &&
    habits.every(
      (h) =>
        h &&
        typeof h.id === 'string' && ID.test(h.id) &&
        typeof h.name === 'string' &&
        (h.color === undefined || typeof h.color === 'string') &&
        (h.archived === undefined || typeof h.archived === 'boolean') &&
        (h.notes === undefined ||
          (h.notes !== null &&
            typeof h.notes === 'object' &&
            Object.entries(h.notes).every(([k, v]) => DATE.test(k) && typeof v === 'string'))) &&
        Array.isArray(h.days) &&
        h.days.every((d) => DATE.test(d)),
    )
  )
}

const tidy = (h, order) => ({
  id: h.id,
  name: h.name,
  color: h.color,
  ...(h.archived ? { archived: true } : {}),
  order,
  days: [...h.days].sort(),
  notes: Object.fromEntries(Object.entries(h.notes ?? {}).sort(([a], [b]) => a.localeCompare(b))),
})

function save(habits) {
  fs.mkdirSync(DIR, { recursive: true })
  const keep = new Set()
  habits.forEach((h, i) => {
    const name = `${h.id}.json`
    keep.add(name)
    const text = JSON.stringify(tidy(h, i), null, 2) + '\n'
    const file = path.join(DIR, name)
    if (!fs.existsSync(file) || fs.readFileSync(file, 'utf8') !== text) writeAtomic(file, text) // untouched habits aren't rewritten
  })
  // a habit that is gone from the list is moved aside, never unlinked
  for (const name of fs.readdirSync(DIR)) {
    if (name.endsWith('.json') && !keep.has(name)) {
      fs.mkdirSync(path.join(DIR, '.deleted'), { recursive: true })
      fs.renameSync(path.join(DIR, name), path.join(DIR, '.deleted', name))
    }
  }
}

// one-time: data/habit.json -> data/habits/<id>.json (the old file is renamed, not deleted)
function migrateLegacy() {
  if (!fs.existsSync(LEGACY) || fs.existsSync(DIR)) return
  try {
    let data = JSON.parse(fs.readFileSync(LEGACY, 'utf8'))
    if (data.days) data = { habits: [{ id: 'habit-1', name: '', days: data.days }] } // even older single-habit format
    if (!isValid(data.habits)) throw new Error('legacy file has unexpected contents')
    save(data.habits)
    fs.renameSync(LEGACY, `${LEGACY}.migrated`)
  } catch (err) {
    console.warn(`[habits] could not migrate ${LEGACY}: ${err.message}`)
  }
}

function load() {
  migrateLegacy()
  if (!fs.existsSync(DIR)) return []
  const habits = []
  for (const name of fs.readdirSync(DIR)) {
    if (!name.endsWith('.json')) continue
    try {
      habits.push(JSON.parse(fs.readFileSync(path.join(DIR, name), 'utf8')))
    } catch {
      console.warn(`[habits] skipping unreadable file ${name}`)
    }
  }
  return habits.sort((a, b) => (a.order ?? Infinity) - (b.order ?? Infinity))
}

const MAX_BODY = 5 * 1024 * 1024 // a year of notes for many habits is far below this; it just stops runaway requests

// GET /api/habit -> { habits }   POST /api/habit { habits } -> saves them
// Plain (req, res) handler, shared by the Vite dev server and the production server.js
export function habitApi(req, res) {
  res.setHeader('Content-Type', 'application/json')
  if (req.method === 'GET') {
    res.end(JSON.stringify({ habits: load() }))
  } else if (req.method === 'POST') {
    let body = ''
    let tooBig = false
    req.on('data', (chunk) => {
      if (tooBig) return
      body += chunk
      if (body.length > MAX_BODY) {
        tooBig = true
        res.statusCode = 413
        res.setHeader('Connection', 'close')
        res.end('{"ok":false}')
      }
    })
    req.on('end', () => {
      if (tooBig) return
      try {
        const { habits } = JSON.parse(body)
        if (!isValid(habits)) throw new Error('invalid habits')
        save(habits)
        res.end('{"ok":true}')
      } catch {
        res.statusCode = 400
        res.end('{"ok":false}')
      }
    })
  } else {
    res.statusCode = 405
    res.end()
  }
}

// Vite plugin: serves the same API from the dev server (no separate backend while developing)
export function habitStore() {
  return {
    name: 'habit-store',
    configureServer(server) {
      server.middlewares.use('/api/habit', habitApi)
    },
  }
}
