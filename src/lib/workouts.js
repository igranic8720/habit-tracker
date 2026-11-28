// strength-log maths. Everything here is derived from habit.workouts:
//   { 'YYYY-MM-DD': [{ exercise: 'Bench press', sets: [{ weight: 185, reps: 8 }] }] }
// Weights are in pounds. A set counts once it has reps and is ticked done (a set with no `done` flag, from before plans, counts as done).
// Weight 0 means bodyweight. A timed exercise (a plank, a dead hang) has seconds held instead of reps: { weight, reps: 0, secs }.
// A climb (a MoonBoard problem) is { grade: 'V5', sent: true | false }: it counts once it is logged (sent or not), and a send is
// what makes a PR.
import { YEAR, elapsedDays, getYear, iso, today, todayKey } from './dates.js'

export const UNIT = 'lb'

const same = (a, b) => a.trim().toLowerCase() === b.trim().toLowerCase()
// boulder grades: V-scale, with the Font grade the MoonBoard shows beside it
export const GRADES = [
  ['V0', '4'], ['V1', '5'], ['V2', '5+'], ['V3', '6A/6A+'], ['V4', '6B/6B+'], ['V5', '6C/6C+'], ['V6', '7A'], ['V7', '7A+'],
  ['V8', '7B/7B+'], ['V9', '7C'], ['V10', '7C+'], ['V11', '8A'], ['V12', '8A+'], ['V13', '8B'], ['V14', '8B+'], ['V15', '8C'],
  ['V16', '8C+'], ['V17', '9A'],
].map(([v, font]) => ({ v, font }))
export const gradeNum = (g) => GRADES.findIndex((x) => x.v === g)
export const gradeText = (g) => `${g} · ${GRADES[gradeNum(g)]?.font ?? '?'}` // "V5 · 6C/6C+"
export const isClimb = (s) => s.grade !== undefined

// how much of a set was done: its reps, or for a timed set the seconds held (a climb is one problem)
export const amount = (s) => (isClimb(s) ? 1 : s.reps || s.secs || 0)
const real = (s) => (isClimb(s) ? s.done !== false : amount(s) > 0 && s.done !== false)
// how good a set is, to find the best one: heavier, then more reps (a longer hold); for climbs any send beats any non-send, then
// the harder grade
const rank = (s) => (isClimb(s) ? (s.sent ? 1e6 : 0) + gradeNum(s.grade) : s.weight * 10000 + amount(s))
// a length of time in seconds as it reads: 45 -> "45s", 90 -> "1:30"
export const durText = (s) => (s < 60 ? `${s}s` : `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`)

export const hasSets = (entries = []) => entries.some((e) => e.sets.some(real))
export const setTotal = (entries = []) => entries.reduce((n, e) => n + e.sets.length, 0) // including sets not done yet
export const setCount = (entries = []) => entries.reduce((n, e) => n + e.sets.filter(real).length, 0)

// total weight moved; bodyweight sets count each rep as 1 so they still shade the heatmap (climbs move no weight)
export const volume = (entries = []) =>
  entries.reduce((n, e) => n + e.sets.filter((s) => real(s) && !isClimb(s)).reduce((m, s) => m + (s.weight || 1) * s.reps, 0), 0)

// a day's work in words: pounds lifted, plus bodyweight reps on their own (a pull-up is not "1 lb")
export function workText(entries = []) {
  let lb = 0
  let bw = 0
  let held = 0
  let climbs = 0
  let sent = 0
  for (const e of entries) {
    for (const s of e.sets.filter(real)) {
      if (isClimb(s)) {
        climbs++
        if (s.sent) sent++
      } else if (s.secs) held += s.secs
      else if (s.weight) lb += s.weight * s.reps
      else bw += s.reps
    }
  }
  return [lb && `${Math.round(lb).toLocaleString()} ${UNIT}`, bw && `${bw} bodyweight ${bw === 1 ? 'rep' : 'reps'}`, held && `${durText(held)} time on`, climbs && `${climbs} ${climbs === 1 ? 'climb' : 'climbs'}, ${sent} sent`].filter(Boolean).join(' · ') || `0 ${UNIT}`
}
export const fmt = (n) => String(Number(n.toFixed(2)))
export const lbs = (n) => `${Math.round(n).toLocaleString()} ${UNIT}` // 12,450 lb
export const compact = (n) => (n >= 10000 ? `${Math.round(n / 1000)}k` : n >= 1000 ? `${(n / 1000).toFixed(1).replace(/\.0$/, '')}k` : String(Math.round(n)))
export const setText = (s) => (isClimb(s) ? `${s.grade} ${s.sent ? '✓' : '✗'}` : s.secs ? `${s.weight ? `${fmt(s.weight)}×` : ''}${durText(s.secs)}` : `${s.weight ? fmt(s.weight) : 'BW'}×${s.reps}`)

// a "nice" axis maximum at or above v (12,450 -> 15,000)
export function niceMax(v) {
  if (!(v > 0)) return 1
  const mag = 10 ** Math.floor(Math.log10(v))
  return [1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10].map((m) => m * mag).find((m) => m >= v)
}

// a workout is done once every set in it is ticked (and at least one has reps)
export const isComplete = (entries = []) => setTotal(entries) > 0 && entries.every((e) => e.sets.every((s) => s.done !== false)) && hasSets(entries)
// the days that count as "done": every set of that day's workout ticked
export const workoutDays = (workouts = {}) => Object.keys(workouts).filter((k) => isComplete(workouts[k])).sort()

// heaviest set, ties broken by reps (or, for a timed set, the longer hold); for climbs, the hardest send
export const topSet = (sets) => sets.reduce((a, b) => (rank(b) > rank(a) ? b : a))

// estimated one-rep max (Epley); a single is its own max; a hold has no estimate (just its weight); a climb: its grade number
export const e1rm = (s) => (isClimb(s) ? gradeNum(s.grade) : s.secs || s.reps === 1 ? s.weight : s.weight * (1 + s.reps / 30))

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

// what kind of exercise it is, from its latest session: 'climb', 'time' (a hold) or 'lift' (null: never done). Lifts and climbs each
// get their own progress graph; timed exercises get none.
export function exerciseKind(habit, exercise) {
  const x = [...sessions(habit).values()].find((s) => same(s.name, exercise))
  if (!x) return null
  const sets = x.list.at(-1).sets
  return sets.every(isClimb) ? 'climb' : sets.every((s) => s.secs > 0) ? 'time' : 'lift'
}

// the sets of the most recent session of an exercise before a given day, or null
export function lastTime(habit, exercise, beforeKey) {
  const x = [...sessions(habit).values()].find((s) => same(s.name, exercise))
  const prior = x?.list.filter((s) => s.key < beforeKey).at(-1)
  return prior ? prior.sets : null
}

const score = rank

// how the latest top set compares with the one before: { text, dir } (dir: 1 up, -1 down, 0 same)
function change(prev, last) {
  if (isClimb(last) && isClimb(prev)) {
    const d = rank(last) - rank(prev)
    return d === 0 ? { text: 'same', dir: 0 } : { text: `${setText(prev)} → ${setText(last)}`, dir: d > 0 ? 1 : -1 }
  }
  if (last.weight !== prev.weight) {
    const d = last.weight - prev.weight
    return { text: `${d > 0 ? '+' : '−'}${fmt(Math.abs(d))} ${UNIT}`, dir: d > 0 ? 1 : -1 }
  }
  const d = amount(last) - amount(prev)
  if (d === 0) return { text: 'same', dir: 0 }
  if (last.secs) return { text: `${d > 0 ? '+' : '−'}${durText(Math.abs(d))}`, dir: d > 0 ? 1 : -1 }
  return { text: `${d > 0 ? '+' : '−'}${Math.abs(d)} ${Math.abs(d) === 1 ? 'rep' : 'reps'}`, dir: d > 0 ? 1 : -1 }
}

// the best set ever done for an exercise before a given day (heaviest; ties: more reps), or null if never done
export function bestBefore(habit, exercise, beforeKey) {
  const x = [...sessions(habit).values()].find((s) => same(s.name, exercise))
  const prior = x?.list.filter((s) => s.key < beforeKey) ?? []
  return prior.length ? prior.map((s) => topSet(s.sets)).reduce((a, b) => (score(b) > score(a) ? b : a)) : null
}

// a done set that beats the previous best (a first-ever exercise has nothing to beat, so no PR)
// (a climb only by sending something harder than any earlier send)
export const beats = (set, best) => !!best && real(set) && (!isClimb(set) || set.sent) && score(set) > score(best)

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
