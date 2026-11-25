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
  assert.deepEqual(habits[0].days, ['2026-01-01', '2026-01-02'])
  assert.ok(fs.existsSync(path.join(DATA, 'habit.json.migrated')))
  assert.ok(!fs.existsSync(path.join(DATA, 'habit.json')))
  assert.match(version, /^[0-9a-f]{16}$/)
})

test('saving writes one tidy file per habit, in order, and returns the new version', async () => {
  const { version } = await api.get('/api/habit')
  const r = await api.post('/api/habit', { version, habits: [habit('a', { days: ['2026-03-02', '2026-03-01'], notes: { '2026-03-01': 'hi' } }), habit('b', { archived: true })] })
  assert.equal(r.status, 200)
  assert.notEqual(r.body.version, version)
  assert.deepEqual(ls(HABITS).filter((n) => n.endsWith('.json')), ['a.json', 'b.json'])
  const a = JSON.parse(fs.readFileSync(path.join(HABITS, 'a.json'), 'utf8'))
  assert.deepEqual(a, { id: 'a', name: 'a', color: 'red', order: 0, days: ['2026-03-01', '2026-03-02'], notes: { '2026-03-01': 'hi' } })
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
  const fresh = await api.post('/api/habit', { version: v1, habits: [habit('a', { days: ['2026-04-01'] })] }) // another device saves first
  assert.equal(fresh.status, 200)
  const stale = await api.post('/api/habit', { version: v1, habits: [habit('a')] })
  assert.equal(stale.status, 409)
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(HABITS, 'a.json'), 'utf8')).days, ['2026-04-01'])
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
