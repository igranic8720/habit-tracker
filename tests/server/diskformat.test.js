// the data files use the names on screen; the app's own names go to disk and come back unchanged
import assert from 'node:assert/strict'
import { test } from 'node:test'
import * as f from '../../server/diskformat.js'

const habit = { id: 'h', name: 'Read', color: 'blue', order: 0, target: 30, sessions: [{ id: 's', start: 1, end: 2 }], notes: { '2026-01-01': 'hi' } }
const check = { id: 'c', name: 'Vitamins', color: 'yellow', archived: true, order: 1, checks: { '2026-01-01': 5 }, notes: {} }
const time = { running: { kind: 'habit', ref: 'h', label: 'Read', color: 'blue', start: 9 }, sessions: [{ id: 'x', kind: 'other', ref: null, label: 'Admin', color: 'gray', start: 1, end: 2 }] }
const plan = {
  id: 'p', name: 'Mixed', color: 'red',
  exercises: [
    { exercise: 'Bench press', sets: 3, reps: 8, weight: 80, rest: 90 },
    { exercise: 'Plank', sets: 2, secs: 45, rest: 60 },
    { exercise: 'Kilter 40°', sets: 6, grade: 'V5', rest: 180 },
  ],
}
const log = {
  '2026-11-25': {
    name: 'Mixed', plan: 'p', cycle: 'c', step: 0,
    entries: [
      { exercise: 'Bench press', rest: 90, sets: [{ weight: 80, reps: 8, done: true }, { weight: 80, reps: 8 }] },
      { exercise: 'Plank', rest: 60, sets: [{ weight: 25, reps: 0, secs: 45, done: false }] },
      { exercise: 'Kilter 40°', rest: 180, sets: [{ grade: 'V5', sent: true, done: true }] },
      { exercise: 'Added on the day', sets: [{ weight: 0, reps: 10, done: true }] },
    ],
    note: 'ok', sessions: [{ id: 's', start: 1, end: 2 }], rest: { start: 10, end: 100 }, on: { start: 5, end: 50, i: 1, j: 0 },
  },
  '2026-11-26': { name: 'Workout', plan: null, cycle: null, entries: [] },
}

test('every store goes to disk and back unchanged', () => {
  assert.deepEqual(f.habitFromDisk(f.habitToDisk(habit)), habit)
  const { sessions: _s, ...plain } = habit // no tracked time and no target yet
  assert.deepEqual(f.habitFromDisk(f.habitToDisk({ ...plain, target: null })), { ...plain, target: null })
  assert.deepEqual(f.checkFromDisk(f.checkToDisk(check)), check)
  assert.deepEqual(f.timeFromDisk(f.timeToDisk(time)), time)
  assert.deepEqual(f.timeFromDisk(f.timeToDisk({ running: null, sessions: [] })), { running: null, sessions: [] })
  assert.deepEqual(f.planFromDisk(f.planToDisk(plan)), plan)
  assert.deepEqual(f.cyclesFromDisk(f.cyclesToDisk('c', [{ id: 'c', name: 'PPL', steps: ['p', 'q'] }])), { active: 'c', cycles: [{ id: 'c', name: 'PPL', steps: ['p', 'q'] }] })
  assert.deepEqual(f.logFromDisk(f.logToDisk(log)), log)
})

test('on disk, the names you see in the app', () => {
  assert.deepEqual(f.habitToDisk(habit), { id: 'h', name: 'Read', colour: 'blue', order: 0, dailyTargetMins: 30, trackedSessions: [{ id: 's', started: 1, finished: 2 }], notes: { '2026-01-01': 'hi' } })
  assert.deepEqual(f.checkToDisk(check), { id: 'c', name: 'Vitamins', colour: 'yellow', archived: true, order: 1, doneAt: { '2026-01-01': 5 }, notes: {} })
  assert.deepEqual(f.timeToDisk(time), {
    runningTimer: { kind: 'habit', habitId: 'h', what: 'Read', colour: 'blue', started: 9 },
    trackedSessions: [{ id: 'x', kind: 'other', habitId: null, what: 'Admin', colour: 'gray', started: 1, finished: 2 }],
  })
  assert.deepEqual(f.planToDisk(plan).exercises, [
    { exercise: 'Bench press', doneFor: 'reps', sets: 3, reps: 8, startLb: 80, restSecs: 90 },
    { exercise: 'Plank', doneFor: 'time', sets: 2, timeOnSecs: 45, restSecs: 60 },
    { exercise: 'Kilter 40°', doneFor: 'climb', problems: 6, targetGrade: 'V5', restSecs: 180 },
  ])
  assert.deepEqual(f.cyclesToDisk(null, [{ id: 'c', name: 'PPL', steps: ['p'] }]), { active: null, cycles: [{ id: 'c', name: 'PPL', days: ['p'] }] })
  const day = f.logToDisk(log)['2026-11-25']
  assert.equal(day.cycleDay, 1) // day 1 of the cycle, as the screen says (the app counts from 0)
  assert.deepEqual(day.exercises.map((e) => e.sets[0]), [{ lb: 80, reps: 8, done: true }, { lb: 25, timeOnSecs: 45, done: false }, { grade: 'V5', sent: true, done: true }, { lb: 0, reps: 10, done: true }])
  assert.deepEqual(day.exercises.map((e) => e.restSecs), [90, 60, 180, undefined])
  assert.deepEqual(day.trackedSessions, [{ id: 's', started: 1, finished: 2 }])
  assert.deepEqual(day.restTimer, { started: 10, ends: 100 })
  assert.deepEqual(day.timeOnTimer, { started: 5, ends: 50, exercise: 1, set: 0 })
  assert.ok(!('entries' in day) && !('step' in day) && !('rest' in day) && !('sessions' in day) && !('on' in day))
})
