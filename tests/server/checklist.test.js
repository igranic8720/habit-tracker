// the checklist store: one JSON file per checklist habit in data/checklist, apart from the timed habits: each day ticked, with the
// moment it was ticked; validation, soft delete and the version check
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { after, test } from 'node:test'
import { ls, serve, tempDataDir } from '../helpers.js'

const DATA = tempDataDir()
const CHECKS = path.join(DATA, 'checklist')
const HABITS = path.join(DATA, 'habits')
const { checklistApi } = await import('../../server/checklist.js')
const { habitApi } = await import('../../server/habits.js')
const api = await serve((req, res) => (req.url.startsWith('/api/checklist') ? checklistApi : habitApi)(req, res))
after(() => api.close())

const item = (id, extra = {}) => ({ id, name: id, color: 'red', checks: {}, notes: {}, ...extra })
const read = (id) => JSON.parse(fs.readFileSync(path.join(CHECKS, `${id}.json`), 'utf8'))

test('saving writes one tidy file per checklist habit: each day ticked and when, sorted by day', async () => {
  const { items, version } = await api.get('/api/checklist')
  assert.deepEqual(items, [])
  const r = await api.post('/api/checklist', { version, items: [item('a', { checks: { '2026-03-02': 2000, '2026-03-01': 1000 }, kind: 'check', days: ['x'] }), item('b', { archived: true })] })
  assert.equal(r.status, 200)
  assert.deepEqual(ls(CHECKS).filter((n) => n.endsWith('.json')), ['a.json', 'b.json'])
  assert.deepEqual(read('a'), { id: 'a', name: 'a', color: 'red', order: 0, checks: { '2026-03-01': 1000, '2026-03-02': 2000 }, notes: {} }) // (the app's kind / days marks aren't saved)
  assert.equal(JSON.stringify(read('a').checks), '{"2026-03-01":1000,"2026-03-02":2000}')
  assert.equal(read('b').archived, true)
  assert.deepEqual((await api.get('/api/checklist')).items[0].checks, { '2026-03-01': 1000, '2026-03-02': 2000 })
})

test('a checklist habit left out of a save is moved aside; the timed habits are never touched', async () => {
  fs.mkdirSync(HABITS, { recursive: true })
  fs.writeFileSync(path.join(HABITS, 'read.json'), '{"id":"read","name":"Read","color":"blue","order":0,"target":30,"notes":{}}\n')
  const before = fs.readFileSync(path.join(HABITS, 'read.json'), 'utf8')
  const { version } = await api.get('/api/checklist')
  assert.equal((await api.post('/api/checklist', { version, items: [item('a')] })).status, 200)
  assert.deepEqual(ls(path.join(CHECKS, '.deleted')), ['b.json'])
  assert.equal(fs.readFileSync(path.join(HABITS, 'read.json'), 'utf8'), before)
})

test('bad checklist data and stale versions are refused, and nothing is written', async () => {
  const { version } = await api.get('/api/checklist')
  const bad = {
    'not a list': { items: {} },
    'duplicate ids': { items: [item('a'), item('a')] },
    'id with a slash': { items: [item('../x')] },
    'name too long': { items: [item('a', { name: 'x'.repeat(61) })] },
    'ticks as a list (they are a map)': { items: [item('a', { checks: ['2026-01-01'] })] },
    'tick with a bad date': { items: [item('a', { checks: { today: 5 } })] },
    'tick moment not a number': { items: [item('a', { checks: { '2026-01-01': 'noon' } })] },
    'tick moment negative': { items: [item('a', { checks: { '2026-01-01': -1 } })] },
    'note too long': { items: [item('a', { notes: { '2026-01-01': 'x'.repeat(2001) } })] },
  }
  for (const [name, body] of Object.entries(bad)) assert.equal((await api.post('/api/checklist', { version, ...body })).status, 400, name)
  assert.equal((await api.post('/api/checklist', { version: 'stale', items: [] })).status, 409)
  assert.equal((await api.get('/api/checklist')).version, version)
})
