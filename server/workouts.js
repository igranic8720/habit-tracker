import fs from 'node:fs'
import path from 'node:path'
import { DATA, DATE, ID, dataApi, versionOf, writeAtomic } from './storage.js'

// Workouts live apart from habits, in data/workouts/:
//   plans.json    named workout plans:   [{ id, name, color, exercises: [{ exercise, sets, reps, weight? }] }]
//   cycles.json   groups of plans:       { active, cycles: [{ id, name, steps: [planId, ...] }] }
//   log.json      what you actually did: { 'YYYY-MM-DD': { name, plan, cycle, step?, entries: [{ exercise, sets: [{ weight, reps, done? }] }], note? } }
// Weights are pounds. Writes are atomic; a copy of each file is kept once a day in backups/ (last 14).
const DIR = path.join(DATA, 'workouts')
const HABITS = path.join(DATA, 'habits')
const FILE = { plans: 'plans.json', cycles: 'cycles.json', log: 'log.json' }

const COLORS = ['red', 'orange', 'yellow', 'blue', 'violet', 'white', 'pink', 'cyan', 'brown', 'magenta', 'sky', 'navy', 'wine', 'peach'] // must match COLORS in src/lib/habits.js
const str = (v, max) => typeof v === 'string' && v.length <= max
const int = (v, lo, hi) => Number.isInteger(v) && v >= lo && v <= hi
const num = (v, lo, hi) => typeof v === 'number' && Number.isFinite(v) && v >= lo && v <= hi
const id = (v) => typeof v === 'string' && ID.test(v)
const unique = (list) => new Set(list.map((x) => x.id)).size === list.length

const validSet = (s) => s && num(s.weight, 0, 5000) && int(s.reps, 0, 1000) && (s.done === undefined || typeof s.done === 'boolean')
const validEntries = (entries) =>
  Array.isArray(entries) &&
  entries.length <= 50 &&
  entries.every((e) => e && str(e.exercise, 80) && Array.isArray(e.sets) && e.sets.length <= 50 && e.sets.every(validSet))
const validPlan = (p) =>
  p && id(p.id) && str(p.name, 60) && (p.color === undefined || COLORS.includes(p.color)) && Array.isArray(p.exercises) && p.exercises.length <= 40 &&
  p.exercises.every((e) => e && str(e.exercise, 80) && int(e.sets, 1, 20) && int(e.reps, 1, 100) && (e.weight === undefined || num(e.weight, 0, 5000)))
const validCycle = (c) => c && id(c.id) && str(c.name, 60) && Array.isArray(c.steps) && c.steps.length <= 30 && c.steps.every(id)
const validLog = (log) =>
  log !== null &&
  typeof log === 'object' &&
  !Array.isArray(log) &&
  Object.entries(log).every(
    ([k, d]) =>
      DATE.test(k) && d && str(d.name, 80) && (d.plan == null || id(d.plan)) && (d.cycle == null || id(d.cycle)) &&
      (d.step === undefined || int(d.step, 0, 100)) && validEntries(d.entries) && (d.note === undefined || str(d.note, 2000)),
  )

export const isValid = (d) =>
  d !== null && typeof d === 'object' &&
  Array.isArray(d.plans) && unique(d.plans) && d.plans.every(validPlan) &&
  Array.isArray(d.cycles) && unique(d.cycles) && d.cycles.every(validCycle) &&
  (d.active == null || id(d.active)) &&
  validLog(d.log)

const sortKeys = (o) => Object.fromEntries(Object.entries(o).sort(([a], [b]) => a.localeCompare(b)))
const stamp = () => new Date().toISOString().slice(0, 10)

// first change of the day to a file: keep the version it had before (so one bad save can never erase history), newest 14 kept
function backup(name) {
  const file = path.join(DIR, name)
  if (!fs.existsSync(file)) return
  const dir = path.join(DIR, 'backups')
  fs.mkdirSync(dir, { recursive: true })
  const copy = path.join(dir, `${name.replace('.json', '')}.${stamp()}.json`)
  if (!fs.existsSync(copy)) fs.copyFileSync(file, copy)
  const mine = fs.readdirSync(dir).filter((f) => f.startsWith(name.replace('.json', '') + '.')).sort()
  for (const old of mine.slice(0, -14)) fs.rmSync(path.join(dir, old))
}

function writeFile(name, value) {
  const file = path.join(DIR, name)
  const text = JSON.stringify(value, null, 2) + '\n'
  if (fs.existsSync(file) && fs.readFileSync(file, 'utf8') === text) return // unchanged files aren't rewritten
  backup(name)
  writeAtomic(file, text)
}

function save(d) {
  fs.mkdirSync(DIR, { recursive: true })
  writeFile(FILE.plans, d.plans)
  writeFile(FILE.cycles, { active: d.active ?? null, cycles: d.cycles })
  writeFile(FILE.log, sortKeys(d.log))
}

function readJson(name, fallback) {
  try {
    return JSON.parse(fs.readFileSync(path.join(DIR, name), 'utf8'))
  } catch {
    return fallback
  }
}

// one-time: strength "habits" from the earlier version -> the workout log. The habit files are moved to habits/.deleted, never erased,
// and only after the new files are safely written.
export function migrateStrengthHabits() {
  if (fs.existsSync(DIR) || !fs.existsSync(HABITS)) return
  const found = []
  for (const name of fs.readdirSync(HABITS)) {
    if (!name.endsWith('.json')) continue
    try {
      const h = JSON.parse(fs.readFileSync(path.join(HABITS, name), 'utf8'))
      if (h?.type === 'strength') found.push([name, h])
    } catch {
      /* unreadable files are the habit store's business */
    }
  }
  if (!found.length) return
  const log = {}
  for (const [, h] of found) {
    const dates = new Set([...Object.keys(h.workouts ?? {}), ...Object.keys(h.notes ?? {})])
    for (const date of dates) {
      if (!DATE.test(date)) continue
      const day = (log[date] ??= { name: h.name || 'Workout', plan: null, cycle: null, entries: [] })
      day.entries.push(...(h.workouts?.[date] ?? [])) // sets without a `done` flag count as done
      if (h.notes?.[date]) day.note = day.note ? `${day.note}\n${h.notes[date]}` : h.notes[date]
    }
  }
  const data = { plans: [], cycles: [], active: null, log }
  if (!isValid(data)) {
    console.warn('[workouts] strength habits were not migrated: unexpected contents (the files are untouched)')
    return
  }
  save(data)
  const aside = path.join(HABITS, '.deleted')
  fs.mkdirSync(aside, { recursive: true })
  for (const [name] of found) {
    const to = path.join(aside, fs.existsSync(path.join(aside, name)) ? `${name}.${Date.now()}` : name)
    fs.renameSync(path.join(HABITS, name), to)
  }
  console.log(`[workouts] moved ${found.length} strength habit(s) into ${DIR}`)
}

function load() {
  migrateStrengthHabits()
  const cycles = readJson(FILE.cycles, { active: null, cycles: [] })
  return { plans: readJson(FILE.plans, []), cycles: cycles.cycles ?? [], active: cycles.active ?? null, log: readJson(FILE.log, {}) }
}

// GET /api/workouts -> { plans, cycles, active, log, version }   POST the same -> saves them (see dataApi)
export const workoutApi = dataApi({
  load,
  isValid,
  save,
  version: () => versionOf(Object.values(FILE).map((f) => path.join(DIR, f))),
})
