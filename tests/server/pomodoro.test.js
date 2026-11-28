// the Pomodoro store: one small file, synced like the others; bad values are refused
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { after, test } from 'node:test'
import { serve, tempDataDir } from '../helpers.js'

const DATA = tempDataDir()
const { pomodoroApi } = await import('../../server/pomodoro.js')
const api = await serve(pomodoroApi)
after(() => api.close())

test('starts at 25 / 5, not running; a press is saved and read back', async () => {
  const first = await api.get('/api/pomodoro')
  assert.deepEqual({ ...first, version: undefined }, { focusMins: 25, breakMins: 5, runningSince: null, elapsedMs: 0, version: undefined })
  const r = await api.post('/api/pomodoro', { focusMins: 25, breakMins: 5, runningSince: 1000, elapsedMs: 0, version: first.version })
  assert.equal(r.status, 200)
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(DATA, 'pomodoro', 'state.json'), 'utf8')), { focusMins: 25, breakMins: 5, runningSince: 1000, elapsedMs: 0 })
  assert.equal((await api.get('/api/pomodoro')).runningSince, 1000)
})

test('bad values and stale versions are refused', async () => {
  const { version } = await api.get('/api/pomodoro')
  const good = { focusMins: 25, breakMins: 5, runningSince: null, elapsedMs: 0 }
  for (const bad of [{ focusMins: 0 }, { breakMins: 61 }, { runningSince: -1 }, { runningSince: '1' }, { elapsedMs: -5 }, { focusMins: 2.5 }]) {
    assert.equal((await api.post('/api/pomodoro', { ...good, ...bad, version })).status, 400, JSON.stringify(bad))
  }
  assert.equal((await api.post('/api/pomodoro', { ...good, version: 'stale' })).status, 409)
})
