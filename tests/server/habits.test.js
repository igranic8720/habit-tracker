// the habit store: one JSON file per habit, soft delete, legacy migration, validation and the version check
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { after, test } from 'node:test'
import { ls, serve, tempDataDir } from '../helpers.js'

const DATA = tempDataDir()
const HABITS = path.join(DATA, 'habits')
// an old single-file habit.json, from the very first version
fs.writeFileSync(path.join(DATA, 'habit.json'), JSON.stringify({ days: ['2026-01-01', '2026-01-02'] }))
const { habitApi } = await import('../../server/habits.js')
const api = await serve(habitApi)
after(() => api.close())

const habit = (id, extra = {}) => ({ id, name: id, color: 'red', days: [], notes: {}, ...extra })

test('the old single habit.json is migrated to a habit file, and kept as habit.json.migrated', async () => {
  const { habits, version } = await api.get('/api/habit')
  assert.equal(habits.length, 1)
  assert.equal(habits[0].days, undefined) // done days are worked out from time now: old ticked days are not kept
  assert.ok(fs.existsSync(path.join(DATA, 'habit.json.migrated')))
  assert.ok(!fs.existsSync(path.join(DATA, 'habit.json')))
  assert.match(version, /^[0-9a-f]{16}$/)
})

test('saving writes one tidy file per habit, in order, and returns the new version', async () => {
  const { version } = await api.get('/api/habit')
  const r = await api.post('/api/habit', { version, habits: [habit('a', { target: 30, days: ['2026-03-02', '2026-03-01'], notes: { '2026-03-01': 'hi' } }), habit('b', { archived: true })] })
  assert.equal(r.status, 200)
  assert.notEqual(r.body.version, version)
  assert.deepEqual(ls(HABITS).filter((n) => n.endsWith('.json')), ['a.json', 'b.json'])
  const a = JSON.parse(fs.readFileSync(path.join(HABITS, 'a.json'), 'utf8'))
  assert.deepEqual(a, { id: 'a', name: 'a', color: 'red', order: 0, target: 30, notes: { '2026-03-01': 'hi' } }) // days sent are dropped
  assert.equal(JSON.parse(fs.readFileSync(path.join(HABITS, 'b.json'), 'utf8')).archived, true)
  assert.ok(!ls(HABITS).some((n) => n.includes('.tmp')))
})

test('a habit left out of a save is moved to .deleted, never erased, and never over an earlier copy', async () => {
  for (let k = 0; k < 2; k++) {
    let { version } = await api.get('/api/habit')
    version = (await api.post('/api/habit', { version, habits: [habit('a'), habit('gone')] })).body.version
    assert.equal((await api.post('/api/habit', { version, habits: [habit('a')] })).status, 200)
  }
  const kept = ls(path.join(HABITS, '.deleted')).filter((n) => n.startsWith('gone.json'))
  assert.equal(kept.length, 2)
})

test('a save from an out-of-date copy is refused (409) and writes nothing', async () => {
  const { version: v1 } = await api.get('/api/habit')
  const fresh = await api.post('/api/habit', { version: v1, habits: [habit('a', { target: 45 })] }) // another device saves first
  assert.equal(fresh.status, 200)
  const stale = await api.post('/api/habit', { version: v1, habits: [habit('a')] })
  assert.equal(stale.status, 409)
  assert.equal(JSON.parse(fs.readFileSync(path.join(HABITS, 'a.json'), 'utf8')).target, 45)
  assert.equal((await api.post('/api/habit', { habits: [habit('a')] })).status, 409) // no version at all: refused too
})

test('bad data is refused (400) and writes nothing', async () => {
  const before = ls(HABITS).map((n) => n + fs.statSync(path.join(HABITS, n)).mtimeMs).join()
  const { version } = await api.get('/api/habit')
  const bad = {
    'not a list': { habits: {} },
    'duplicate ids': { habits: [habit('a'), habit('a')] },
    'id with a slash': { habits: [habit('../x')] },
    'name too long': { habits: [habit('a', { name: 'x'.repeat(61) })] },
    'note too long': { habits: [habit('a', { notes: { '2026-01-01': 'x'.repeat(2001) } })] },
    'bad date': { habits: [habit('a', { days: ['yesterday'] })] },
    'bad note date': { habits: [habit('a', { notes: { '../x': 'hi' } })] },
    'colour not a string': { habits: [habit('a', { color: 5 })] },
    'target not whole minutes': { habits: [habit('a', { target: 2.5 })] },
    'target over a day': { habits: [habit('a', { target: 1441 })] },
    'target zero': { habits: [habit('a', { target: 0 })] },
    'unknown kind': { habits: [habit('a', { kind: 'weekly' })] },
    'a checklist habit (they have their own store)': { habits: [habit('a', { kind: 'check' })] },
  }
  for (const [name, body] of Object.entries(bad)) assert.equal((await api.post('/api/habit', { version, ...body })).status, 400, name)
  assert.equal((await api.post('/api/habit', '{not json')).status, 400)
  assert.equal(ls(HABITS).map((n) => n + fs.statSync(path.join(HABITS, n)).mtimeMs).join(), before)
})

test('other methods are refused; responses are never cached', async () => {
  const r = await fetch(api.base + '/api/habit', { method: 'PUT' })
  assert.equal(r.status, 405)
  assert.equal((await fetch(api.base + '/api/habit')).headers.get('cache-control'), 'no-store')
})

test('an oversized request is cut off (413)', async () => {
  const status = await fetch(api.base + '/api/habit', { method: 'POST', body: 'x'.repeat(6 * 1024 * 1024) })
    .then((r) => r.status)
    .catch(() => 413) // the server may close the connection before the body is fully sent
  assert.equal(status, 413)
})

test('tracked time is saved in the habit’s own file, in start order, and read back', async () => {
  const sessions = [
    { id: 's2', start: 2000, end: 5000 },
    { id: 's1', start: 1000, end: 1500 },
  ]
  let { version } = await api.get('/api/habit')
  assert.equal((await api.post('/api/habit', { habits: [habit('timed', { sessions })], version })).status, 200)
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(HABITS, 'timed.json'), 'utf8')).sessions.map((s) => s.id), ['s1', 's2'])
  assert.deepEqual((await api.get('/api/habit')).habits.find((h) => h.id === 'timed').sessions.map((s) => s.id), ['s1', 's2'])
  // a habit without any time keeps a file without a sessions field
  ;({ version } = await api.get('/api/habit'))
  await api.post('/api/habit', { habits: [habit('timed')], version })
  assert.ok(!('sessions' in JSON.parse(fs.readFileSync(path.join(HABITS, 'timed.json'), 'utf8'))))
})

test('bad tracked time is refused', async () => {
  const bad = [
    [{ id: 'a', start: 5, end: 1 }], // ends before it starts
    [{ id: 'a', start: 0, end: 8 * 86400000 }], // over a week
    [{ id: 'a', start: 1, end: 2 }, { id: 'a', start: 3, end: 4 }], // duplicate id
    [{ id: '../x', start: 1, end: 2 }],
    [{ id: 'a', start: 'now', end: 2 }],
    'lots',
  ]
  for (const sessions of bad) {
    const { version } = await api.get('/api/habit')
    assert.equal((await api.post('/api/habit', { habits: [habit('bad', { sessions })], version })).status, 400, JSON.stringify(sessions))
  }
})
