// strength-log maths. Everything here is derived from habit.workouts:
//   { 'YYYY-MM-DD': [{ exercise: 'Bench press', sets: [{ weight: 185, reps: 8 }] }] }
// Weights are in pounds. A set counts once it has reps and is ticked done (a set with no `done` flag, from before plans, counts as done).
// Weight 0 means bodyweight.
import { YEAR, elapsedDays, getYear, iso, today, todayKey } from './dates.js'

export const UNIT = 'lb'

const same = (a, b) => a.trim().toLowerCase() === b.trim().toLowerCase()
const real = (s) => s.reps > 0 && s.done !== false

export const hasSets = (entries = []) => entries.some((e) => e.sets.some(real))
export const setTotal = (entries = []) => entries.reduce((n, e) => n + e.sets.length, 0) // including sets not done yet
export const setCount = (entries = []) => entries.reduce((n, e) => n + e.sets.filter(real).length, 0)

// total weight moved; bodyweight sets count each rep as 1 so they still shade the heatmap
export const volume = (entries = []) =>
  entries.reduce((n, e) => n + e.sets.filter(real).reduce((m, s) => m + (s.weight || 1) * s.reps, 0), 0)

// a day's work in words: pounds lifted, plus bodyweight reps on their own (a pull-up is not "1 lb")
export function workText(entries = []) {
  let lb = 0
  let bw = 0
  for (const e of entries) {
    for (const s of e.sets.filter(real)) {
      if (s.weight) lb += s.weight * s.reps
      else bw += s.reps
    }
  }
  return [lb && `${Math.round(lb).toLocaleString()} ${UNIT}`, bw && `${bw} bodyweight ${bw === 1 ? 'rep' : 'reps'}`].filter(Boolean).join(' · ') || `0 ${UNIT}`
}
export const fmt = (n) => String(Number(n.toFixed(2)))
export const lbs = (n) => `${Math.round(n).toLocaleString()} ${UNIT}` // 12,450 lb
export const compact = (n) => (n >= 10000 ? `${Math.round(n / 1000)}k` : n >= 1000 ? `${(n / 1000).toFixed(1).replace(/\.0$/, '')}k` : String(Math.round(n)))
export const setText = (s) => `${s.weight ? fmt(s.weight) : 'BW'}×${s.reps}`

// a "nice" axis maximum at or above v (12,450 -> 15,000)
export function niceMax(v) {
  if (!(v > 0)) return 1
  const mag = 10 ** Math.floor(Math.log10(v))
  return [1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10].map((m) => m * mag).find((m) => m >= v)
}

// the days that count as "done": any day with at least one real set
export const workoutDays = (workouts = {}) => Object.keys(workouts).filter((k) => hasSets(workouts[k])).sort()

// heaviest set, ties broken by reps
export const topSet = (sets) => sets.reduce((a, b) => (b.weight > a.weight || (b.weight === a.weight && b.reps > a.reps) ? b : a))

// estimated one-rep max (Epley); a single is its own max
export const e1rm = (s) => (s.reps === 1 ? s.weight : s.weight * (1 + s.reps / 30))

// the day's work as readable lines: [{ exercise, text: '185×8, 185×8, 175×10' }]
export const describe = (entries = []) =>
  entries.filter((e) => e.sets.some(real)).map((e) => ({ exercise: e.exercise || 'Exercise', text: e.sets.filter(real).map(setText).join(', ') }))

// every session of every exercise, oldest first: Map<lowercase name, { name, list: [{ key, sets }] }>
function sessions(habit) {
  const map = new Map()
  for (const key of Object.keys(habit.workouts ?? {}).sort()) {
    for (const e of habit.workouts[key]) {
      const sets = e.sets.filter(real)
      const name = e.exercise.trim()
      if (!sets.length || !name) continue
      const id = name.toLowerCase()
      if (!map.has(id)) map.set(id, { name, list: [] })
      const x = map.get(id)
      x.name = name
      const last = x.list[x.list.length - 1]
      if (last?.key === key) last.sets = [...last.sets, ...sets] // the same exercise twice in one day is one session
      else x.list.push({ key, sets })
    }
  }
  return map
}

// exercise names you have used, most recently trained first (for the autocomplete and the progress picker)
export function exerciseNames(habit) {
  return [...sessions(habit).values()].sort((a, b) => b.list.at(-1).key.localeCompare(a.list.at(-1).key)).map((x) => x.name)
}

// the sets of the most recent session of an exercise before a given day, or null
export function lastTime(habit, exercise, beforeKey) {
  const x = [...sessions(habit).values()].find((s) => same(s.name, exercise))
  const prior = x?.list.filter((s) => s.key < beforeKey).at(-1)
  return prior ? prior.sets : null
}

const score = (s) => s.weight * 1000 + s.reps

// how the latest top set compares with the one before: { text, dir } (dir: 1 up, -1 down, 0 same)
function change(prev, last) {
  if (last.weight !== prev.weight) {
    const d = last.weight - prev.weight
    return { text: `${d > 0 ? '+' : '−'}${fmt(Math.abs(d))} ${UNIT}`, dir: d > 0 ? 1 : -1 }
  }
  const d = last.reps - prev.reps
  if (d === 0) return { text: 'same', dir: 0 }
  return { text: `${d > 0 ? '+' : '−'}${Math.abs(d)} ${Math.abs(d) === 1 ? 'rep' : 'reps'}`, dir: d > 0 ? 1 : -1 }
}

// the best set ever done for an exercise before a given day (heaviest; ties: more reps), or null if never done
export function bestBefore(habit, exercise, beforeKey) {
  const x = [...sessions(habit).values()].find((s) => same(s.name, exercise))
  const prior = x?.list.filter((s) => s.key < beforeKey) ?? []
  return prior.length ? prior.map((s) => topSet(s.sets)).reduce((a, b) => (score(b) > score(a) ? b : a)) : null
}

// a done set that beats the previous best (a first-ever exercise has nothing to beat, so no PR)
export const beats = (set, best) => !!best && real(set) && score(set) > score(best)

// per exercise: best ever, latest session, and the change since the session before it; most recent first
export function progress(habit) {
  return [...sessions(habit).values()]
    .map((x) => {
      const tops = x.list.map((s) => ({ key: s.key, top: topSet(s.sets) }))
      const best = tops.reduce((a, b) => (score(b.top) > score(a.top) ? b : a))
      const last = tops.at(-1)
      const prev = tops.at(-2)
      return { name: x.name, sessions: x.list.length, best, last, change: prev ? change(prev.top, last.top) : null }
    })
    .sort((a, b) => b.last.key.localeCompare(a.last.key))
}

// one exercise's sessions within a year, oldest first: [{ key, top, est, sets }] (the lift-progress graph)
export function liftSeries(habit, name, year) {
  const x = [...sessions(habit).values()].find((s) => same(s.name, name))
  return (x?.list ?? [])
    .filter((s) => s.key.startsWith(`${year}-`))
    .map((s) => ({ key: s.key, top: topSet(s.sets), est: Math.max(...s.sets.map(e1rm)), sets: s.sets }))
}

// one row per week of the year (Sun–Sat, aligned to the heatmap): workouts, sets and volume; weeks not yet started are `future`
export function weeklyWorkouts(habit, year) {
  const w = habit.workouts ?? {}
  return getYear(year).grid.map((week) => {
    const real = week.filter(Boolean)
    const elapsed = real.filter((d) => iso(d) <= todayKey)
    const trained = elapsed.map(iso).filter((k) => hasSets(w[k]))
    return {
      from: real[0],
      to: real[real.length - 1],
      future: elapsed.length === 0,
      workouts: trained.length,
      sets: trained.reduce((n, k) => n + setCount(w[k]), 0),
      volume: trained.reduce((n, k) => n + volume(w[k]), 0),
    }
  })
}

// the header's headline numbers for one year (plus this week, when it is the current year)
export function workoutSummary(habit, year) {
  const rows = weeklyWorkouts(habit, year)
  const sum = (key) => rows.reduce((n, r) => n + r[key], 0)
  const count = sum('workouts')
  return {
    count,
    sets: sum('sets'),
    volume: sum('volume'),
    perWeek: count / Math.max(1, elapsedDays(year) / 7),
    week: year === YEAR ? rows.find((r) => r.from <= today && today <= r.to) : null,
  }
}

// the workout log ({ date: { name, entries, note, ... } }) in the shape the maths above, the heatmap and the graphs read
export function diaryOf(log) {
  const workouts = {}
  const notes = {}
  for (const [key, day] of Object.entries(log)) {
    workouts[key] = day.entries
    if (day.note) notes[key] = day.note
  }
  return { type: 'strength', color: 'blue', workouts, notes, days: workoutDays(workouts) }
}
