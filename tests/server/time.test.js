// the time store: sessions and the running timer; validation; versions; daily backup
import assert from 'node:assert/strict'
import path from 'node:path'
import { after, test } from 'node:test'
import { ls, serve, tempDataDir } from '../helpers.js'

const DATA = tempDataDir()
const { timeApi } = await import('../../server/time.js')
const api = await serve(timeApi)
after(() => api.close())

const T = Date.UTC(2026, 10, 25, 14, 0)
const session = (over = {}) => ({ id: 's1', kind: 'habit', ref: 'read', label: 'Read', color: 'blue', start: T, end: T + 45 * 60000, ...over })

test('an empty store, then a round trip including the running timer', async () => {
  const first = await api.get('/api/time')
  assert.deepEqual([first.running, first.sessions], [null, []])
  const running = { kind: 'workout', ref: null, label: 'Push', color: 'orange', start: T + 3600000 }
  const r = await api.post('/api/time', { running, sessions: [session()], version: first.version })
  assert.equal(r.status, 200)
  const back = await api.get('/api/time')
  assert.deepEqual([back.running, back.sessions], [running, [session()]])
})

test('a stale version is refused and nothing is written', async () => {
  const cur = await api.get('/api/time')
  const r = await api.post('/api/time', { running: null, sessions: [], version: 'stale' })
  assert.equal(r.status, 409)
  assert.deepEqual((await api.get('/api/time')).sessions, cur.sessions)
})

test('bad data is rejected', async () => {
  const bad = [
    { running: null, sessions: [session({ end: T - 1 })] }, // ends before it starts
    { running: null, sessions: [session({ end: T + 8 * 86400000 })] }, // longer than a week
    { running: null, sessions: [session({ kind: 'nap' })] },
    { running: null, sessions: [session({ color: 'aqua' })] },
    { running: null, sessions: [session({ label: '' })] },
    { running: null, sessions: [session({ id: '../x' })] },
    { running: null, sessions: [session(), session()] }, // duplicate id
    { running: { kind: 'other', label: 'x', color: 'gray', start: 'now' }, sessions: [] },
    { running: null },
  ]
  for (const d of bad) {
    const { version } = await api.get('/api/time')
    assert.equal((await api.post('/api/time', { ...d, version })).status, 400, JSON.stringify(d))
  }
})

test('the first change of a day keeps a backup of the file before it', async () => {
  const { version } = await api.get('/api/time')
  await api.post('/api/time', { running: null, sessions: [], version })
  assert.equal(ls(path.join(DATA, 'time', 'backups')).filter((f) => f.startsWith('sessions.')).length, 1)
})
