import fs from 'node:fs'
import path from 'node:path'
import { DATA, DATE, ID, dataApi, versionOf, writeAtomic } from './storage.js'
import { migrateStrengthHabits } from './workouts.js'

// One JSON file per habit: data/habits/<id>.json  (set HABIT_DATA_DIR to use another folder, e.g. for tests)
const DIR = path.join(DATA, 'habits')
const LEGACY = path.join(DATA, 'habit.json') // the old single-file format

function isValid(habits) {
  return (
    Array.isArray(habits) &&
    new Set(habits.map((h) => h?.id)).size === habits.length &&
    habits.every(
      (h) =>
        h &&
        typeof h.id === 'string' && ID.test(h.id) &&
        typeof h.name === 'string' && h.name.length <= 60 &&
        (h.color === undefined || (typeof h.color === 'string' && h.color.length <= 20)) &&
        (h.archived === undefined || typeof h.archived === 'boolean') &&
        (h.notes === undefined ||
          (h.notes !== null &&
            typeof h.notes === 'object' &&
            Object.entries(h.notes).every(([k, v]) => DATE.test(k) && typeof v === 'string' && v.length <= 2000))) &&
        Array.isArray(h.days) && h.days.length <= 40000 &&
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
      const aside = path.join(DIR, '.deleted')
      fs.mkdirSync(aside, { recursive: true })
      const to = path.join(aside, fs.existsSync(path.join(aside, name)) ? `${name}.${Date.now()}` : name) // never over an earlier copy
      fs.renameSync(path.join(DIR, name), to)
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
  migrateStrengthHabits() // workouts moved to their own store: pull any earlier strength "habits" across first
  if (!fs.existsSync(DIR)) return []
  const habits = []
  for (const name of fs.readdirSync(DIR)) {
    if (!name.endsWith('.json')) continue
    try {
      const h = JSON.parse(fs.readFileSync(path.join(DIR, name), 'utf8'))
      if (h?.type !== 'strength') habits.push(h) // (a strength file only remains here if its migration was refused)
    } catch {
      console.warn(`[habits] skipping unreadable file ${name}`)
    }
  }
  return habits.sort((a, b) => (a.order ?? Infinity) - (b.order ?? Infinity))
}

// GET /api/habit -> { habits, version }   POST /api/habit { habits, version } -> saves them (see dataApi)
const files = () => (fs.existsSync(DIR) ? fs.readdirSync(DIR).filter((n) => n.endsWith('.json')).map((n) => path.join(DIR, n)) : [])
export const habitApi = dataApi({
  load: () => ({ habits: load() }),
  isValid: (d) => isValid(d.habits),
  save: (d) => save(d.habits),
  version: () => versionOf(files()),
})
