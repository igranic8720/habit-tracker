// signing in to Microsoft (device code), refreshing the token, syncing events: against a stand-in for Microsoft
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { after, test } from 'node:test'
import { serve, tempDataDir } from '../helpers.js'

const DATA = tempDataDir()
process.env.MS_CLIENT_ID = 'test-client'
process.env.CALENDAR_POLL_MS = '30'
const { toEvent } = await import('../../server/graph.js')
const { calendarApi } = await import('../../server/calendar.js')
const api = await serve(calendarApi)
const realFetch = globalThis.fetch

// the stand-in: answers Microsoft's addresses, passes everything else (our own server) through
const log = []
let approved = false
let tokenAnswer = null // overrides the refresh answer
globalThis.fetch = async (url, init) => {
  url = String(url)
  if (!/microsoftonline|graph\.microsoft/.test(url)) return realFetch(url, init)
  const json = (status, body) => new Response(JSON.stringify(body), { status })
  const params = init?.body ? Object.fromEntries(new URLSearchParams(init.body)) : {}
  log.push({ url, params, auth: init?.headers?.Authorization })
  if (url.endsWith('/devicecode')) return json(200, { device_code: 'dev', user_code: 'ABCD1234', verification_uri: 'https://www.microsoft.com/link', expires_in: 900, interval: 5 })
  if (url.endsWith('/token') && params.grant_type.includes('device_code')) {
    return approved ? json(200, { access_token: 'A1', refresh_token: 'R1', expires_in: 3600 }) : json(400, { error: 'authorization_pending' })
  }
  if (url.endsWith('/token')) return tokenAnswer ?? json(200, { access_token: 'A2', refresh_token: 'R2', expires_in: 3600 })
  if (url.includes('/me/calendarView')) {
    return json(200, {
      value: [
        { id: 'e1', subject: 'Standup', start: { dateTime: '2026-11-25T14:00:00.0000000' }, end: { dateTime: '2026-11-25T14:30:00.0000000' }, isAllDay: false },
        { id: 'e2', subject: 'Cancelled', start: { dateTime: '2026-11-25T15:00:00.0000000' }, end: { dateTime: '2026-11-25T16:00:00.0000000' }, isCancelled: true },
      ],
    })
  }
  return json(404, {})
}
after(async () => {
  globalThis.fetch = realFetch
  await api.close()
})
const post = (p) => realFetch(api.base + p, { method: 'POST' }).then(async (r) => [r.status, await r.json()])
const range = `?from=${Date.UTC(2026, 10, 25)}&to=${Date.UTC(2026, 10, 26)}`
const AUTH = path.join(DATA, 'calendar', 'auth.json')
const until = async (fn) => {
  for (let i = 0; i < 100; i++) {
    const v = await fn()
    if (v) return v
    await new Promise((r) => setTimeout(r, 20))
  }
  throw new Error('timed out')
}

test('Graph events become app events: UTC times, cancelled skipped, all-day kept as whole days', () => {
  assert.deepEqual(toEvent({ id: 'a', subject: 'X', start: { dateTime: '2026-11-25T14:00:00.0000000' }, end: { dateTime: '2026-11-25T15:00:00.0000000' } }), { id: 'a', title: 'X', start: Date.UTC(2026, 10, 25, 14), end: Date.UTC(2026, 10, 25, 15), allDay: false })
  assert.equal(toEvent({ id: 'b', isCancelled: true, start: { dateTime: '2026-11-25T14:00:00' }, end: { dateTime: '2026-11-25T15:00:00' } }), null)
  assert.equal(toEvent({ id: 'c', start: { dateTime: 'nope' }, end: { dateTime: 'nope' } }), null)
  const day = { id: 'd', subject: 'Holiday', isAllDay: true, start: { dateTime: '2026-11-25T00:00:00.0000000' }, end: { dateTime: '2026-11-26T00:00:00.0000000' } }
  assert.deepEqual(toEvent(day), { id: 'd', title: 'Holiday', start: Date.UTC(2026, 10, 25), end: Date.UTC(2026, 10, 26), allDay: true })
  // a time-zone shift of a few hours either way still lands on the same dates
  const shifted = { ...day, start: { dateTime: '2026-11-24T22:00:00' }, end: { dateTime: '2026-11-25T22:00:00' } }
  assert.equal(toEvent(shifted).start, Date.UTC(2026, 10, 25))
  assert.equal(toEvent({ ...day, subject: '' }).title, '(no title)')
})

test('not signed in: configured, but no calendar', async () => {
  const r = await (await realFetch(api.base + '/api/calendar' + range)).json()
  assert.deepEqual([r.configured, r.connected, r.events], [true, false, []])
})

test('signing in: a code to enter, then connected once you approve it, and the events are synced', async () => {
  const [status, flow] = await post('/api/calendar/connect')
  assert.equal(status, 200)
  assert.deepEqual([flow.state, flow.userCode, flow.verificationUri], ['pending', 'ABCD1234', 'https://www.microsoft.com/link'])
  assert.ok(!fs.existsSync(AUTH)) // nothing stored before you approve
  await new Promise((r) => setTimeout(r, 150)) // still pending after several checks
  assert.equal((await (await realFetch(api.base + '/api/calendar/connect')).json()).state, 'pending')
  approved = true
  await until(async () => (await (await realFetch(api.base + '/api/calendar/connect')).json()).state === 'done')
  assert.deepEqual(JSON.parse(fs.readFileSync(AUTH, 'utf8')).refreshToken, 'R1')
  assert.equal(fs.statSync(AUTH).mode & 0o077, 0) // only this user can read the sign-in
  const r = await until(async () => {
    const x = await (await realFetch(api.base + '/api/calendar' + range)).json()
    return x.events.length ? x : null
  })
  assert.deepEqual(r.events.map((e) => [e.id, e.title, e.start, e.allDay]), [['e1', 'Standup', Date.UTC(2026, 10, 25, 14), false]]) // the cancelled one is not shown
  assert.equal(r.connected, true)
  assert.equal(log.find((l) => l.url.includes('calendarView')).auth, 'Bearer A1')
})

test('an old token is refreshed (and the new refresh token kept); an expired sign-in is reported', async () => {
  const old = JSON.parse(fs.readFileSync(AUTH, 'utf8'))
  fs.writeFileSync(AUTH, JSON.stringify({ ...old, expiresAt: 0 }))
  const [, ok] = await post('/api/calendar/sync')
  assert.equal(ok.ok, true)
  assert.equal(JSON.parse(fs.readFileSync(AUTH, 'utf8')).refreshToken, 'R2')
  assert.equal(log.filter((l) => l.url.includes('calendarView')).at(-1).auth, 'Bearer A2')

  fs.writeFileSync(AUTH, JSON.stringify({ ...old, expiresAt: 0 }))
  tokenAnswer = new Response(JSON.stringify({ error: 'invalid_grant' }), { status: 400 })
  const [, bad] = await post('/api/calendar/sync')
  assert.deepEqual([bad.ok, bad.error], [false, 'signin-expired'])
  assert.equal((await (await realFetch(api.base + '/api/calendar' + range)).json()).error, 'signin-expired')
})

test('disconnecting forgets the sign-in and the cached events', async () => {
  assert.deepEqual((await post('/api/calendar/disconnect'))[1], { ok: true })
  assert.ok(!fs.existsSync(AUTH))
  assert.ok(!fs.existsSync(path.join(DATA, 'calendar', 'events.json')))
  const r = await (await realFetch(api.base + '/api/calendar' + range)).json()
  assert.deepEqual([r.connected, r.events, r.error], [false, [], null])
})

test('wrong methods are refused', async () => {
  assert.equal((await realFetch(api.base + '/api/calendar/sync')).status, 405)
  assert.equal((await realFetch(api.base + '/api/calendar/nope')).status, 404)
})

test('event details: place, people, your answer, notes, an online-meeting link and the Outlook link', async () => {
  const { meetingOf, safeUrl } = await import('../../server/graph.js')
  const g = {
    id: 'm', subject: 'Sprint review', start: { dateTime: '2026-11-25T14:00:00' }, end: { dateTime: '2026-11-25T15:00:00' },
    location: { displayName: 'Room 4' }, organizer: { emailAddress: { name: 'Sam Lee', address: 'sam@example.com' } },
    attendees: [{ emailAddress: { name: 'Ana' } }, { emailAddress: { address: 'bo@example.com' } }, {}],
    bodyPreview: '  Agenda:\n demo  ', body: { content: 'Join here: https://teams.microsoft.com/l/meetup-join/19%3ameeting_abc/0?context=x.' },
    webLink: 'https://outlook.live.com/owa/?itemid=abc', showAs: 'tentative', responseStatus: { response: 'accepted' },
  }
  assert.deepEqual(toEvent(g), {
    id: 'm', title: 'Sprint review', start: Date.UTC(2026, 10, 25, 14), end: Date.UTC(2026, 10, 25, 15), allDay: false,
    location: 'Room 4', organizer: 'Sam Lee', attendees: ['Ana', 'bo@example.com'], notes: 'Agenda: demo',
    join: { url: 'https://teams.microsoft.com/l/meetup-join/19%3ameeting_abc/0?context=x', app: 'Teams' },
    link: 'https://outlook.live.com/owa/?itemid=abc', showAs: 'tentative', response: 'accepted',
  })
  // your own meeting: no "from"; the meeting link Graph gives directly wins
  assert.equal(toEvent({ ...g, isOrganizer: true }).organizer, undefined)
  assert.equal(meetingOf({ onlineMeeting: { joinUrl: 'https://teams.live.com/meet/123' } }).url, 'https://teams.live.com/meet/123')
  assert.deepEqual(meetingOf({ location: { displayName: 'https://meet.google.com/abc-defg-hij' } }), { url: 'https://meet.google.com/abc-defg-hij', app: 'Google Meet' })
  assert.equal(meetingOf({ bodyPreview: 'no link' }), null)
  // only plain https links are ever kept
  assert.equal(toEvent({ ...g, webLink: 'javascript:alert(1)', body: {}, onlineMeeting: { joinUrl: 'http://teams.microsoft.com/x' } }).link, undefined)
  assert.equal(toEvent({ ...g, webLink: 'javascript:alert(1)', body: {}, onlineMeeting: { joinUrl: 'http://teams.microsoft.com/x' } }).join, undefined)
  assert.equal(safeUrl('data:text/html,hi'), null)
})
