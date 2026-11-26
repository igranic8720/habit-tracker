// the calendar endpoint: nothing connected, events from the cache file, range checks
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { after, test } from 'node:test'
import { serve, tempDataDir } from '../helpers.js'

const DATA = tempDataDir()
const { calendarApi } = await import('../../server/calendar.js')
const api = await serve(calendarApi)
after(() => api.close())
const H = 3600000
const T = Date.UTC(2026, 10, 25, 0)

test('without a synced calendar, nothing is connected', async () => {
  assert.deepEqual(await api.get(`/api/calendar?from=${T}&to=${T + 24 * H}`), { configured: false, error: null, connected: false, syncedAt: null, events: [] })
})

test('events overlapping the range are returned; bad entries are ignored', async () => {
  fs.mkdirSync(path.join(DATA, 'calendar'))
  const events = [
    { id: 'in', title: 'Standup', start: T + 9 * H, end: T + 10 * H, location: 'Room 1', join: { url: 'https://teams.live.com/meet/1', app: 'Teams' }, link: 'javascript:alert(1)' },
    { id: 'edge', title: 'Ends at the start', start: T - H, end: T },
    { id: 'across', title: 'Overnight', start: T - H, end: T + H, allDay: false },
    { id: 'day', title: 'Holiday', start: T, end: T + 24 * H, allDay: true },
    { id: 'bad', title: 5, start: T + H, end: T + 2 * H },
    null,
  ]
  fs.writeFileSync(path.join(DATA, 'calendar', 'events.json'), JSON.stringify({ syncedAt: T + 5, events }))
  const r = await api.get(`/api/calendar?from=${T}&to=${T + 24 * H}`)
  assert.equal(r.connected, true)
  assert.equal(r.syncedAt, T + 5)
  assert.deepEqual(r.events.map((e) => e.id), ['in', 'across', 'day'])
  assert.equal(r.events[2].allDay, true)
  // details are passed on, but a link that isn't https never leaves the server
  assert.deepEqual([r.events[0].location, r.events[0].join, r.events[0].link], ['Room 1', { url: 'https://teams.live.com/meet/1', app: 'Teams' }, undefined])
})

test('a missing or silly range, and other methods, are refused', async () => {
  for (const q of ['', '?from=1', `?from=${T}&to=${T}`, `?from=${T}&to=${T + 130 * 24 * H}`, '?from=x&to=y']) {
    assert.equal((await fetch(api.base + '/api/calendar' + q)).status, 400, q)
  }
  assert.equal((await fetch(api.base + '/api/calendar', { method: 'POST', body: '{}' })).status, 405)
})
