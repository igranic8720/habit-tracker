// the workout store: plans, cycles and the log; migration from strength "habits"; daily backups; validation; versions
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { after, test } from 'node:test'
import { ls, serve, tempDataDir } from '../helpers.js'

const DATA = tempDataDir()
const DIR = path.join(DATA, 'workouts')
// an earlier version kept workouts as a "strength" habit
fs.mkdirSync(path.join(DATA, 'habits'))
fs.writeFileSync(
  path.join(DATA, 'habits', 'lift.json'),
  JSON.stringify({ id: 'lift', name: 'Strength', type: 'strength', unit: 'kg', days: ['2026-11-25'], notes: { '2026-11-25': 'felt good' }, workouts: { '2026-11-25': [{ exercise: 'handstand', sets: [{ weight: 12, reps: 12 }] }] } }),
)
fs.writeFileSync(path.join(DATA, 'habits', 'read.json'), JSON.stringify({ id: 'read', name: 'Read', days: [], notes: {} }))
const { workoutApi } = await import('../../server/workouts.js')
const { habitApi } = await import('../../server/habits.js')
const api = await serve((req, res) => (req.url.startsWith('/api/workouts') ? workoutApi(req, res) : habitApi(req, res)))
after(() => api.close())

const good = () => ({
  plans: [{ id: 'p1', name: 'Push', color: 'orange', exercises: [{ exercise: 'Bench press', sets: 3, reps: 8, weight: 135, rest: 90 }] }],
  cycles: [{ id: 'c1', name: 'PPL', steps: ['p1'] }],
  active: 'c1',
  log: { '2026-11-25': { name: 'Push', plan: 'p1', cycle: 'c1', step: 0, entries: [{ exercise: 'Bench press', sets: [{ weight: 135, reps: 8, done: true }] }], note: 'ok' } },
})

test('strength habits move into the workout log; the habit file is set aside, not erased', async () => {
  const { habits } = await api.get('/api/habit') // the app's first request
  assert.deepEqual(habits.map((h) => h.id), ['read'])
  assert.ok(ls(path.join(DATA, 'habits', '.deleted')).includes('lift.json'))
  const w = await api.get('/api/workouts')
  assert.deepEqual(w.log['2026-11-25'], { name: 'Strength', plan: null, cycle: null, entries: [{ exercise: 'handstand', sets: [{ weight: 12, reps: 12 }] }], note: 'felt good' })
  assert.deepEqual([w.plans, w.cycles, w.active], [[], [], null])
  await api.get('/api/habit') // and only once
  assert.equal(Object.keys((await api.get('/api/workouts')).log).length, 1)
})

test('round trip, and a copy of each file kept once a day before it changes', async () => {
  const { version } = await api.get('/api/workouts')
  const r = await api.post('/api/workouts', { ...good(), version })
  assert.equal(r.status, 200)
  const back = await api.get('/api/workouts')
  assert.deepEqual({ plans: back.plans, cycles: back.cycles, active: back.active, log: back.log }, good())
  const today = new Date().toISOString().slice(0, 10)
  const kept = JSON.parse(fs.readFileSync(path.join(DIR, 'backups', `log.${today}.json`), 'utf8'))
  assert.equal(kept['2026-11-25'].exercises[0].exercise, 'handstand') // the version from before the change
  const again = good()
  again.log['2026-11-25'].note = 'changed'
  assert.equal((await api.post('/api/workouts', { ...again, version: back.version })).status, 200)
  assert.equal(JSON.parse(fs.readFileSync(path.join(DIR, 'backups', `log.${today}.json`), 'utf8'))['2026-11-25'].exercises[0].exercise, 'handstand') // today's copy isn't replaced
})

test('a save from an out-of-date copy is refused (409)', async () => {
  const { version } = await api.get('/api/workouts')
  const a = good()
  a.log['2026-11-26'] = { name: 'Push', plan: 'p1', cycle: null, entries: [] }
  assert.equal((await api.post('/api/workouts', { ...a, version })).status, 200)
  assert.equal((await api.post('/api/workouts', { ...good(), version })).status, 409)
  assert.ok('2026-11-26' in (await api.get('/api/workouts')).log)
})

test('bad data is refused (400) and writes nothing', async () => {
  const { version } = await api.get('/api/workouts')
  const snapshot = () => ls(DIR).map((n) => n + (fs.statSync(path.join(DIR, n)).isFile() ? fs.statSync(path.join(DIR, n)).size : '')).join()
  const before = snapshot()
  const set = (d) => d.log['2026-11-25'].entries[0].sets[0]
  const bad = {
    'negative weight': (d) => (set(d).weight = -1),
    'weight over 5000': (d) => (set(d).weight = 6000),
    'fractional reps': (d) => (set(d).reps = 1.5),
    'done not true/false': (d) => (set(d).done = 'yes'),
    'bad date': (d) => (d.log['../../etc'] = d.log['2026-11-25']),
    'note too long': (d) => (d.log['2026-11-25'].note = 'x'.repeat(2001)),
    'plan id with a slash': (d) => (d.log['2026-11-25'].plan = '../x'),
    '51 exercises in a day': (d) => (d.log['2026-11-25'].entries = Array(51).fill({ exercise: 'x', sets: [] })),
    'plan with 0 sets': (d) => (d.plans[0].exercises[0].sets = 0),
    'plan name too long': (d) => (d.plans[0].name = 'x'.repeat(61)),
    'plan colour not in the palette': (d) => (d.plans[0].color = 'aqua'),
    'duplicate plan ids': (d) => d.plans.push(structuredClone(d.plans[0])),
    '31 days in a cycle': (d) => (d.cycles[0].steps = Array(31).fill('p1')),
    'active cycle id with a slash': (d) => (d.active = '../c'),
    'log is a list': (d) => (d.log = []),
  }
  for (const [name, mutate] of Object.entries(bad)) {
    const d = good()
    mutate(d)
    assert.equal((await api.post('/api/workouts', { ...d, version })).status, 400, name)
  }
  assert.equal(snapshot(), before)
})

test('tracked time is kept with its workout day, and bad time is refused', async () => {
  const withTime = (sessions) => {
    const g = good()
    g.log['2026-11-25'].sessions = sessions
    return g
  }
  let { version } = await api.get('/api/workouts')
  const ok = [{ id: 'w1', start: 1000, end: 4000 }]
  assert.equal((await api.post('/api/workouts', { ...withTime(ok), version })).status, 200)
  assert.deepEqual((await api.get('/api/workouts')).log['2026-11-25'].sessions, ok)
  ;({ version } = await api.get('/api/workouts'))
  assert.equal((await api.post('/api/workouts', { ...withTime([{ id: 'w1', start: 9, end: 1 }]), version })).status, 400)
  assert.equal((await api.post('/api/workouts', { ...withTime([{ id: 'x', start: 1, end: 2 }, { id: 'x', start: 3, end: 4 }]), version })).status, 400)
})

test('each plan exercise has its own rest; a plan-wide rest is refused; the running rest is saved', async () => {
  let { version } = await api.get('/api/workouts')
  const g = good()
  g.log['2026-11-25'].rest = { start: 1000, end: 91000 }
  assert.equal((await api.post('/api/workouts', { ...g, version })).status, 200)
  const back = await api.get('/api/workouts')
  assert.equal(back.plans[0].exercises[0].rest, 90)
  assert.equal(back.plans[0].rest, undefined)
  assert.deepEqual(back.log['2026-11-25'].rest, { start: 1000, end: 91000 })
  ;({ version } = back)
  const bad = {
    'a plan-wide rest': (d) => (d.plans[0].rest = 90),
    'an exercise with no rest': (d) => delete d.plans[0].exercises[0].rest,
    'an exercise rest of 0': (d) => (d.plans[0].exercises[0].rest = 0),
    'an exercise rest of 1.5': (d) => (d.plans[0].exercises[0].rest = 1.5),
    'a running rest ending first': (d) => (d.log['2026-11-25'].rest = { start: 5, end: 1 }),
    'a running rest over an hour': (d) => (d.log['2026-11-25'].rest = { start: 0, end: 2 * 3600000 }),
    'a running rest of null': (d) => (d.log['2026-11-25'].rest = null),
  }
  for (const [name, spoil] of Object.entries(bad)) {
    const d = good()
    spoil(d)
    assert.equal((await api.post('/api/workouts', { ...d, version })).status, 400, name)
  }
})

test('timed exercises and each exercise’s rest are saved; bad ones are refused', async () => {
  const g = good()
  g.plans[0].exercises.push({ exercise: 'Plank', sets: 3, secs: 45, rest: 60 }, { exercise: 'Deadlift', sets: 1, reps: 5, rest: 180 })
  g.log['2026-11-25'].entries.push({ exercise: 'Plank', rest: 60, sets: [{ weight: 0, reps: 0, secs: 45, done: true }] })
  let { version } = await api.get('/api/workouts')
  assert.equal((await api.post('/api/workouts', { ...g, version })).status, 200)
  const back = await api.get('/api/workouts')
  assert.deepEqual(back.plans[0].exercises.slice(1), [{ exercise: 'Plank', sets: 3, secs: 45, rest: 60 }, { exercise: 'Deadlift', sets: 1, reps: 5, rest: 180 }])
  assert.deepEqual(back.log['2026-11-25'].entries[1], { exercise: 'Plank', rest: 60, sets: [{ weight: 0, reps: 0, secs: 45, done: true }] })
  ;({ version } = back)
  const bad = {
    'both reps and a hold': (d) => d.plans[0].exercises.push({ exercise: 'X', sets: 1, reps: 5, secs: 30, rest: 60 }),
    'neither reps nor a hold': (d) => d.plans[0].exercises.push({ exercise: 'X', sets: 1, rest: 60 }),
    'a hold too short': (d) => d.plans[0].exercises.push({ exercise: 'X', sets: 1, secs: 2, rest: 60 }),
    'a hold over an hour': (d) => d.plans[0].exercises.push({ exercise: 'X', sets: 1, secs: 3601, rest: 60 }),
    'an exercise rest too long': (d) => d.plans[0].exercises.push({ exercise: 'X', sets: 1, reps: 5, rest: 901 }),
    'an exercise rest as text': (d) => d.plans[0].exercises.push({ exercise: 'X', sets: 1, reps: 5, rest: '90' }),
    'a logged hold negative': (d) => d.log['2026-11-25'].entries.push({ exercise: 'X', sets: [{ weight: 0, reps: 0, secs: -5 }] }),
    'a logged rest of 0': (d) => d.log['2026-11-25'].entries.push({ exercise: 'X', rest: 0, sets: [] }),
  }
  for (const [name, spoil] of Object.entries(bad)) {
    const d = good()
    spoil(d)
    assert.equal((await api.post('/api/workouts', { ...d, version })).status, 400, name)
  }
})

test('climbs in plans and in the log are saved; bad ones are refused', async () => {
  const g = good()
  g.plans[0].exercises.push({ exercise: 'MoonBoard', sets: 6, grade: 'V5', rest: 180 }, { exercise: 'Project', sets: 1, grade: 'V17', rest: 300 })
  g.log['2026-11-25'].entries.push({ exercise: 'MoonBoard', rest: 180, sets: [{ grade: 'V5', sent: true, done: true }, { grade: 'V6', sent: false, done: false }] })
  let { version } = await api.get('/api/workouts')
  assert.equal((await api.post('/api/workouts', { ...g, version })).status, 200)
  const back = await api.get('/api/workouts')
  assert.deepEqual(back.plans[0].exercises.slice(-2), [{ exercise: 'MoonBoard', sets: 6, grade: 'V5', rest: 180 }, { exercise: 'Project', sets: 1, grade: 'V17', rest: 300 }])
  assert.deepEqual(back.log['2026-11-25'].entries.at(-1).sets, [{ grade: 'V5', sent: true, done: true }, { grade: 'V6', sent: false, done: false }])
  ;({ version } = back)
  const bad = {
    'an unknown grade': (d) => d.plans[0].exercises.push({ exercise: 'MoonBoard', sets: 6, grade: 'V18', rest: 180 }),
    'a Font grade (V-scale is stored)': (d) => d.plans[0].exercises.push({ exercise: 'MoonBoard', sets: 6, grade: '6C+', rest: 180 }),
    'a climb with reps too': (d) => d.plans[0].exercises.push({ exercise: 'MoonBoard', sets: 6, grade: 'V5', reps: 5, rest: 180 }),
    'a climb with a weight': (d) => d.plans[0].exercises.push({ exercise: 'MoonBoard', sets: 6, grade: 'V5', weight: 10, rest: 180 }),
    'a logged climb without sent': (d) => d.log['2026-11-25'].entries.push({ exercise: 'MoonBoard', sets: [{ grade: 'V5', done: true }] }),
    'a logged climb with sent as text': (d) => d.log['2026-11-25'].entries.push({ exercise: 'MoonBoard', sets: [{ grade: 'V5', sent: 'yes' }] }),
    'a logged climb with reps': (d) => d.log['2026-11-25'].entries.push({ exercise: 'MoonBoard', sets: [{ grade: 'V5', sent: true, reps: 3 }] }),
  }
  for (const [name, spoil] of Object.entries(bad)) {
    const d = good()
    spoil(d)
    assert.equal((await api.post('/api/workouts', { ...d, version })).status, 400, name)
  }
})

test('a running time on is saved with the day, like the rest; bad ones are refused', async () => {
  let { version } = await api.get('/api/workouts')
  const g = good()
  g.log['2026-11-25'].on = { start: 1000, end: 46000, i: 0, j: 0 }
  assert.equal((await api.post('/api/workouts', { ...g, version })).status, 200)
  const back = await api.get('/api/workouts')
  assert.deepEqual(back.log['2026-11-25'].on, { start: 1000, end: 46000, i: 0, j: 0 })
  ;({ version } = back)
  for (const on of [{ start: 5, end: 1, i: 0, j: 0 }, { start: 0, end: 2 * 3600000, i: 0, j: 0 }, { start: 0, end: 10, i: -1, j: 0 }, { start: 0, end: 10, i: 0 }, null]) {
    const d = good()
    d.log['2026-11-25'].on = on
    assert.equal((await api.post('/api/workouts', { ...d, version })).status, 400, JSON.stringify(on))
  }
})
