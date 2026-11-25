// the workout maths: sets and ticks, totals, personal bests, per-lift history, weekly numbers
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { YEAR, iso, today } from '../../src/lib/dates.js'
import * as w from '../../src/lib/workouts.js'

const S = (weight, reps, done) => ({ weight, reps, ...(done === undefined ? {} : { done }) })
const habit = {
  workouts: {
    '2026-11-10': [{ exercise: 'Bench press', sets: [S(80, 8), S(80, 8), S(75, 10)] }, { exercise: 'Squat', sets: [S(100, 5)] }],
    '2026-11-17': [{ exercise: 'bench press ', sets: [S(82.5, 6), S(80, 8)] }, { exercise: 'Pull-up', sets: [S(0, 10), S(0, 8)] }],
    '2026-11-24': [{ exercise: 'Bench press', sets: [S(85, 5), S(0, 0)] }, { exercise: 'Bench press', sets: [S(70, 12)] }],
    '2026-11-25': [{ exercise: 'Squat', sets: [S(200, 5, false)] }], // planned, not ticked: doesn't count
  },
}

test('a set counts once it has reps and is ticked (sets from before ticks existed count as done)', () => {
  assert.equal(w.hasSets([{ exercise: 'a', sets: [S(100, 5, false)] }]), false)
  assert.equal(w.hasSets([{ exercise: 'a', sets: [S(100, 5, true)] }]), true)
  assert.equal(w.hasSets([{ exercise: 'a', sets: [S(100, 5)] }]), true)
  assert.equal(w.hasSets([{ exercise: 'a', sets: [S(100, 0, true)] }]), false)
  const e = [{ exercise: 'a', sets: [S(100, 5, true), S(100, 5, false), S(100, 5)] }]
  assert.equal(w.setCount(e), 2)
  assert.equal(w.setTotal(e), 3)
})

test('workout days are the days with a counted set', () => {
  assert.deepEqual(w.workoutDays(habit.workouts), ['2026-11-10', '2026-11-17', '2026-11-24'])
})

test('totals: pounds for weighted sets, reps for bodyweight ones', () => {
  assert.equal(w.volume(habit.workouts['2026-11-10']), 80 * 8 + 80 * 8 + 75 * 10 + 100 * 5)
  assert.equal(w.workText([{ exercise: 'Pull-up', sets: [S(0, 8), S(0, 7)] }]), '15 bodyweight reps')
  assert.equal(w.workText([{ exercise: 'Row', sets: [S(95, 8), S(95, 8)] }, { exercise: 'Pull-up', sets: [S(0, 1)] }]), '1,520 lb · 1 bodyweight rep')
  assert.equal(w.workText([]), '0 lb')
  assert.equal(w.lbs(12450.4), '12,450 lb')
})

test('a day described as readable lines', () => {
  assert.deepEqual(w.describe(habit.workouts['2026-11-17']).map((d) => d.text), ['82.5×6, 80×8', 'BW×10, BW×8'])
})

test('exercises are matched by name regardless of case and spaces; most recent first', () => {
  assert.deepEqual(w.exerciseNames(habit), ['Bench press', 'Pull-up', 'Squat'])
  assert.deepEqual(w.lastTime(habit, 'BENCH PRESS', '2026-11-24'), [S(82.5, 6), S(80, 8)])
  assert.equal(w.lastTime(habit, 'Squat', '2026-11-10'), null)
})

test('personal bests: heavier, or the same weight for more reps; a first-ever exercise has nothing to beat', () => {
  assert.deepEqual(w.bestBefore(habit, 'bench press', '2026-11-30'), S(85, 5))
  assert.deepEqual(w.bestBefore(habit, 'Bench press', '2026-11-17'), S(80, 8))
  assert.equal(w.bestBefore(habit, 'Deadlift', '2026-11-30'), null)
  const best = S(85, 5)
  assert.equal(w.beats(S(90, 1), best), true)
  assert.equal(w.beats(S(85, 6), best), true)
  assert.equal(w.beats(S(85, 5), best), false)
  assert.equal(w.beats(S(90, 5, false), best), false) // not ticked yet
  assert.equal(w.beats(S(500, 5), null), false)
})

test('progress per exercise: best, latest and the change since the session before', () => {
  const bench = w.progress(habit).find((x) => x.name === 'Bench press')
  assert.equal(bench.sessions, 3) // two entries on the same day are one session
  assert.deepEqual(bench.best.top, S(85, 5))
  assert.deepEqual(bench.change, { text: '+2.5 lb', dir: 1 })
  assert.equal(w.progress(habit).find((x) => x.name === 'Squat').change, null)
})

test('one lift over a year: top set and estimated one-rep max per session', () => {
  const s = w.liftSeries(habit, 'bench press', 2026)
  assert.deepEqual(s.map((x) => x.key), ['2026-11-10', '2026-11-17', '2026-11-24'])
  assert.ok(Math.abs(s[0].est - 80 * (1 + 8 / 30)) < 1e-9)
  assert.equal(w.e1rm(S(200, 1)), 200)
  assert.equal(w.liftSeries(habit, 'Bench press', 2025).length, 0)
})

test('weekly rows and the header summary for the current year', () => {
  const d = (n) => {
    const x = new Date(today)
    x.setDate(x.getDate() - n)
    return iso(x)
  }
  const live = { workouts: { [d(0)]: [{ exercise: 'Bench', sets: [S(185, 5), S(185, 5)] }], [d(14)]: [{ exercise: 'Squat', sets: [S(225, 5)] }] } }
  const rows = w.weeklyWorkouts(live, YEAR)
  const inYear = [d(0), d(14)].filter((k) => k.startsWith(`${YEAR}-`)).length
  assert.equal(rows.reduce((n, r) => n + r.workouts, 0), inYear)
  assert.ok(rows.some((r) => r.from <= today && today <= r.to && !r.future))
  const sum = w.workoutSummary(live, YEAR)
  assert.equal(sum.count, inYear)
  assert.ok(sum.week.workouts >= 1)
  assert.equal(w.workoutSummary(live, YEAR - 1).week, null)
})

test('the log in the shape the graphs read', () => {
  const log = { '2026-11-20': { name: 'Push', entries: [{ exercise: 'B', sets: [S(1, 1, true)] }], note: 'good' }, '2026-11-22': { name: 'Pull', entries: [{ exercise: 'R', sets: [S(1, 1, false)] }] } }
  const d = w.diaryOf(log)
  assert.deepEqual(d.days, ['2026-11-20'])
  assert.deepEqual(d.notes, { '2026-11-20': 'good' })
})

test('axis and label helpers', () => {
  assert.equal(w.niceMax(12450), 15000)
  assert.equal(w.niceMax(0), 1)
  assert.equal(w.compact(950), '950')
  assert.equal(w.compact(1500), '1.5k')
  assert.equal(w.compact(12450), '12k')
  assert.equal(w.fmt(82.5), '82.5')
  assert.equal(w.setText(S(0, 10)), 'BW×10')
})
