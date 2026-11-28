import fs from 'node:fs'
import path from 'node:path'
import { DATA, DATE, ID, dataApi, validSessions, versionOf } from './storage.js'
import { folderFiles, loadFolder, saveFolder } from './folders.js'
import { migrateStrengthHabits } from './workouts.js'

// One JSON file per habit: data/habits/<id>.json (with its tracked time, sessions: [{ id, start, end }], and its daily target in
// minutes). The days it is done are not stored: the app works them out from its time and target (any `days` sent is dropped).
// Checklist habits are a store of their own (checklist.js); one sent here with kind: 'check' is refused.
// (set HABIT_DATA_DIR to use another folder, e.g. for tests)
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
        (h.target === undefined || h.target === null || (Number.isInteger(h.target) && h.target > 0 && h.target <= 1440)) &&
        (h.kind === undefined || h.kind === 'timed') &&
        (h.sessions === undefined || validSessions(h.sessions, 5000)) &&
        (h.days === undefined || (Array.isArray(h.days) && h.days.length <= 40000 && h.days.every((d) => DATE.test(d)))),
    )
  )
}

const tidy = (h, order) => ({
  id: h.id,
  name: h.name,
  color: h.color,
  ...(h.archived ? { archived: true } : {}),
  order,
  target: h.target ?? null,
  ...(h.sessions?.length ? { sessions: [...h.sessions].sort((a, b) => a.start - b.start) } : {}),
  notes: Object.fromEntries(Object.entries(h.notes ?? {}).sort(([a], [b]) => a.localeCompare(b))),
})

const save = (habits) => saveFolder(DIR, habits, tidy)

// one-time: data/habit.json -> data/habits/<id>.json (the old file is renamed, not deleted)
function migrateLegacy() {
  if (!fs.existsSync(LEGACY) || fs.existsSync(DIR)) return
  try {
    let data = JSON.parse(fs.readFileSync(LEGACY, 'utf8'))
    if (data.days) data = { habits: [{ id: 'habit-1', name: '', days: data.days }] } /* (its days are dropped: done is worked out now) */ // even older single-habit format
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
  return loadFolder(DIR, (h) => h?.type !== 'strength', 'habits') // (a strength file only remains here if its migration was refused)
}

// GET /api/habit -> { habits, version }   POST /api/habit { habits, version } -> saves them (see dataApi)
export const habitApi = dataApi({
  name: 'habit',
  load: () => ({ habits: load() }),
  isValid: (d) => isValid(d.habits),
  save: (d) => save(d.habits),
  version: () => versionOf(folderFiles(DIR)),
})
