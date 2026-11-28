// What the data files look like on disk. They use the names you see in the app (Daily target, Done for, Problems, Target grade,
// Time on, Rest, lb, Started / Finished…) so a file reads like the screen. Times stay plain numbers, with their unit in the name
// where it isn't a timestamp: dailyTargetMins, restSecs, timeOnSecs; started / finished / doneAt are milliseconds since 1970.
// The app works with shorter internal names (see the comments in each store); these functions turn one into the other, both
// ways, field for field (tests/server/diskformat.test.js checks a round trip loses nothing).
//
//   habits/<id>.json     { id, name, colour, archived?, order, dailyTargetMins, trackedSessions?: [{ id, started, finished }], notes }
//   checklist/<id>.json  { id, name, colour, archived?, order, doneAt: { 'YYYY-MM-DD': ms }, notes }
//   time/sessions.json   { runningTimer: null | { kind, habitId, what, colour, started },
//                          trackedSessions: [{ id, kind, habitId, what, colour, started, finished }] }
//   workouts/plans.json  [{ id, name, colour, exercises: [{ exercise, doneFor: 'reps' | 'time' | 'climb',
//                          sets + reps | sets + timeOnSecs | problems + targetGrade, startLb?, restSecs }] }]
//   workouts/cycles.json { active, cycles: [{ id, name, days: [planId] }] }
//   workouts/log.json    { 'YYYY-MM-DD': { name, plan, cycle, cycleDay? (1 = the cycle's first day), exercises: [{ exercise,
//                          restSecs?, sets: [{ lb, reps, done? } | { lb, timeOnSecs, done? } | { grade, sent, done? }] }], note?,
//                          trackedSessions?: [{ id, started, finished }], restTimer?: { started, ends },
//                          timeOnTimer?: { started, ends, exercise, set } (which exercise and set, counting from 0) } }

const has = (o, k) => o[k] !== undefined
const opt = (k, v) => (v === undefined ? {} : { [k]: v })
const map = (o, fn) => Object.fromEntries(Object.entries(o ?? {}).map(([k, v]) => [k, fn(v)]))

// a tracked session kept with a habit or a workout day
const sessionTo = (s) => ({ id: s.id, started: s.start, finished: s.end })
const sessionFrom = (s) => ({ id: s.id, start: s.started, end: s.finished })

// ---- habits
export const habitToDisk = (h) => ({
  id: h.id,
  name: h.name,
  colour: h.color,
  ...(h.archived ? { archived: true } : {}),
  order: h.order,
  dailyTargetMins: h.target ?? null,
  ...(h.sessions?.length ? { trackedSessions: h.sessions.map(sessionTo) } : {}),
  notes: h.notes ?? {},
})
export const habitFromDisk = (d) => ({
  id: d.id,
  name: d.name,
  color: d.colour,
  ...(d.archived ? { archived: true } : {}),
  order: d.order,
  target: d.dailyTargetMins ?? null,
  ...(d.trackedSessions?.length ? { sessions: d.trackedSessions.map(sessionFrom) } : {}),
  notes: d.notes ?? {},
})

// ---- checklist habits
export const checkToDisk = (h) => ({
  id: h.id,
  name: h.name,
  colour: h.color,
  ...(h.archived ? { archived: true } : {}),
  order: h.order,
  doneAt: h.checks ?? {},
  notes: h.notes ?? {},
})
export const checkFromDisk = (d) => ({
  id: d.id,
  name: d.name,
  color: d.colour,
  ...(d.archived ? { archived: true } : {}),
  order: d.order,
  checks: d.doneAt ?? {},
  notes: d.notes ?? {},
})

// ---- tracked time
const timedTo = (s) => ({ ...opt('id', s.id), kind: s.kind, habitId: s.ref ?? null, what: s.label, colour: s.color, started: s.start, ...opt('finished', s.end) })
const timedFrom = (s) => ({ ...opt('id', s.id), kind: s.kind, ref: s.habitId ?? null, label: s.what, color: s.colour, start: s.started, ...opt('end', s.finished) })
export const timeToDisk = (d) => ({ runningTimer: d.running ? timedTo(d.running) : null, trackedSessions: d.sessions.map(timedTo) })
export const timeFromDisk = (d) => ({ running: d?.runningTimer ? timedFrom(d.runningTimer) : null, sessions: (d?.trackedSessions ?? []).map(timedFrom) })

// ---- workouts: plans
export function planExerciseToDisk(e) {
  const base = { exercise: e.exercise }
  if (has(e, 'grade')) return { ...base, doneFor: 'climb', problems: e.sets, targetGrade: e.grade, restSecs: e.rest }
  if (has(e, 'secs')) return { ...base, doneFor: 'time', sets: e.sets, timeOnSecs: e.secs, ...opt('startLb', e.weight), restSecs: e.rest }
  return { ...base, doneFor: 'reps', sets: e.sets, reps: e.reps, ...opt('startLb', e.weight), restSecs: e.rest }
}
export function planExerciseFromDisk(d) {
  const base = { exercise: d.exercise }
  if (d.doneFor === 'climb') return { ...base, sets: d.problems, grade: d.targetGrade, rest: d.restSecs }
  if (d.doneFor === 'time') return { ...base, sets: d.sets, secs: d.timeOnSecs, ...opt('weight', d.startLb), rest: d.restSecs }
  return { ...base, sets: d.sets, reps: d.reps, ...opt('weight', d.startLb), rest: d.restSecs }
}
export const planToDisk = (p) => ({ id: p.id, name: p.name, ...opt('colour', p.color), exercises: p.exercises.map(planExerciseToDisk) })
export const planFromDisk = (d) => ({ id: d.id, name: d.name, ...opt('color', d.colour), exercises: (d.exercises ?? []).map(planExerciseFromDisk) })

// ---- workouts: cycles
export const cyclesToDisk = (active, cycles) => ({ active: active ?? null, cycles: cycles.map((c) => ({ id: c.id, name: c.name, days: c.steps })) })
export const cyclesFromDisk = (d) => ({ active: d?.active ?? null, cycles: (d?.cycles ?? []).map((c) => ({ id: c.id, name: c.name, steps: c.days ?? [] })) })

// ---- workouts: the log
function setToDisk(s) {
  if (has(s, 'grade')) return { grade: s.grade, sent: s.sent, ...opt('done', s.done) }
  if (has(s, 'secs')) return { lb: s.weight, timeOnSecs: s.secs, ...opt('done', s.done) }
  return { lb: s.weight, reps: s.reps, ...opt('done', s.done) }
}
function setFromDisk(d) {
  if (has(d, 'grade')) return { grade: d.grade, sent: d.sent, ...opt('done', d.done) }
  if (has(d, 'timeOnSecs')) return { weight: d.lb, reps: 0, secs: d.timeOnSecs, ...opt('done', d.done) }
  return { weight: d.lb, reps: d.reps, ...opt('done', d.done) }
}
const dayToDisk = (d) => ({
  name: d.name,
  plan: d.plan ?? null,
  cycle: d.cycle ?? null,
  ...(d.step === undefined ? {} : { cycleDay: d.step + 1 }),
  exercises: d.entries.map((e) => ({ exercise: e.exercise, ...opt('restSecs', e.rest), sets: e.sets.map(setToDisk) })),
  ...opt('note', d.note),
  ...(d.sessions ? { trackedSessions: d.sessions.map(sessionTo) } : {}),
  ...(d.rest ? { restTimer: { started: d.rest.start, ends: d.rest.end } } : {}),
  ...(d.on ? { timeOnTimer: { started: d.on.start, ends: d.on.end, exercise: d.on.i, set: d.on.j } } : {}),
})
const dayFromDisk = (d) => ({
  name: d.name,
  plan: d.plan ?? null,
  cycle: d.cycle ?? null,
  ...(d.cycleDay === undefined ? {} : { step: d.cycleDay - 1 }),
  entries: (d.exercises ?? []).map((e) => ({ exercise: e.exercise, ...opt('rest', e.restSecs), sets: (e.sets ?? []).map(setFromDisk) })),
  ...opt('note', d.note),
  ...(d.trackedSessions ? { sessions: d.trackedSessions.map(sessionFrom) } : {}),
  ...(d.restTimer ? { rest: { start: d.restTimer.started, end: d.restTimer.ends } } : {}),
  ...(d.timeOnTimer ? { on: { start: d.timeOnTimer.started, end: d.timeOnTimer.ends, i: d.timeOnTimer.exercise, j: d.timeOnTimer.set } } : {}),
})
export const logToDisk = (log) => map(log, dayToDisk)
export const logFromDisk = (log) => map(log, dayFromDisk)
