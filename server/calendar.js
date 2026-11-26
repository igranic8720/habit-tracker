import fs from 'node:fs'
import path from 'node:path'
import { announce } from './events.js'
import { DATA, writeAtomic } from './storage.js'
import { fetchEvents, pollDeviceCode, refreshTokens, safeUrl, startDeviceCode, tokensOf } from './graph.js'

// Your Microsoft calendar for the Time page's day view (read-only).
//   data/calendar/auth.json    the sign-in (refresh token): treat it like a password; never commit or share it
//   data/calendar/events.json  the event cache: { syncedAt, events: [{ id, title, start, end, allDay, ...details }] } (ms since 1970;
//                              details: see toEvent in graph.js)
// MS_CLIENT_ID (environment) is the Azure app registration's Application (client) ID; without it the calendar stays off.
// Routes (all under /api/calendar):
//   GET  ?from=&to=   events in that range (refreshes the cache first when it is more than 5 minutes old)
//   POST /connect     start signing in -> { userCode, verificationUri };   GET /connect  how that is going
//   POST /sync        refresh now;   POST /disconnect  forget the sign-in and the cache
const DIR = path.join(DATA, 'calendar')
const EVENTS = path.join(DIR, 'events.json')
const AUTH = path.join(DIR, 'auth.json')
const MAX_RANGE = 120 * 24 * 3600 * 1000 // the whole synced window (30 days back, 60 ahead) fits in one request
const STALE = 5 * 60 * 1000
const clientId = () => process.env.MS_CLIENT_ID?.trim() || null

const readJson = (file) => {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'))
  } catch {
    return null
  }
}
const writeAuth = (tokens) => {
  fs.mkdirSync(DIR, { recursive: true })
  const tmp = `${AUTH}.tmp-${process.pid}`
  fs.writeFileSync(tmp, JSON.stringify(tokens), { mode: 0o600 }) // readable by this user only
  fs.renameSync(tmp, AUTH)
}

let pending = null // the sign-in in progress: { state: 'pending' | 'done' | 'error', userCode, verificationUri, error }
let lastError = null // 'signin-expired' | 'sync-failed' | null
let inFlight = null

// pull your events into the cache; one run at a time
export function sync() {
  if (inFlight) return inFlight
  inFlight = (async () => {
    try {
      const id = clientId()
      let tokens = readJson(AUTH)
      if (!id || !tokens) return
      if (tokens.expiresAt - Date.now() < 60000) {
        const r = await refreshTokens(id, tokens.refreshToken)
        if (!r.ok) {
          lastError = r.body.error === 'invalid_grant' ? 'signin-expired' : 'sync-failed'
          return
        }
        tokens = tokensOf(r.body, tokens)
        writeAuth(tokens)
      }
      const now = Date.now()
      const events = await fetchEvents(tokens.accessToken, now - 30 * 86400000, now + 60 * 86400000)
      fs.mkdirSync(DIR, { recursive: true })
      writeAtomic(EVENTS, JSON.stringify({ syncedAt: now, events }))
      lastError = null
      announce('calendar')
    } catch {
      lastError = 'sync-failed'
    } finally {
      inFlight = null
    }
  })()
  return inFlight
}

// sign in: show the code, then check every few seconds until you have approved it at microsoft.com/link
async function connect() {
  const id = clientId()
  const code = await startDeviceCode(id)
  const mine = { state: 'pending', userCode: code.user_code, verificationUri: code.verification_uri, error: null }
  pending = mine
  let wait = Number(process.env.CALENDAR_POLL_MS) || Math.max(code.interval ?? 5, 1) * 1000
  const until = Date.now() + (code.expires_in ?? 900) * 1000
  const check = async () => {
    if (pending !== mine) return // replaced or disconnected
    try {
      const r = await pollDeviceCode(id, code.device_code)
      if (r.ok) {
        writeAuth(tokensOf(r.body))
        mine.state = 'done'
        lastError = null
        sync()
        return
      }
      if (r.body.error === 'slow_down') wait += 5000
      else if (r.body.error !== 'authorization_pending') {
        mine.state = 'error'
        mine.error = r.body.error === 'expired_token' || r.body.error === 'code_expired' ? 'The code expired. Try again.' : (r.body.error_description?.split('\r')[0] ?? 'Sign-in failed.')
        return
      }
    } catch {
      /* a network blip: try again */
    }
    if (Date.now() > until) {
      mine.state = 'error'
      mine.error = 'The code expired. Try again.'
    } else setTimeout(check, wait).unref()
  }
  setTimeout(check, wait).unref()
  return mine
}

const send = (res, status, body) => {
  res.statusCode = status
  res.end(JSON.stringify(body))
}
const view = (p) => ({ state: p.state, userCode: p.userCode, verificationUri: p.verificationUri, error: p.error })

export async function calendarApi(req, res) {
  res.setHeader('Content-Type', 'application/json')
  res.setHeader('Cache-Control', 'no-store')
  const url = new URL(req.url, 'http://localhost')
  const route = url.pathname.replace(/^\/api\/calendar/, '').replace(/\/$/, '') // (the dev server has already removed the prefix)

  if (route === '/connect') {
    if (req.method === 'GET') return send(res, 200, pending ? view(pending) : { state: 'idle' })
    if (req.method !== 'POST') return send(res, 405, { ok: false })
    if (!clientId()) return send(res, 400, { ok: false, error: 'MS_CLIENT_ID is not set' })
    try {
      return send(res, 200, view(await connect()))
    } catch (e) {
      return send(res, 502, { ok: false, error: e.message })
    }
  }
  if (route === '/disconnect' || route === '/sync') {
    if (req.method !== 'POST') return send(res, 405, { ok: false })
    if (route === '/sync') {
      await sync()
      return send(res, 200, { ok: !lastError, error: lastError })
    }
    pending = null
    lastError = null
    for (const f of [AUTH, EVENTS]) fs.rmSync(f, { force: true })
    announce('calendar')
    return send(res, 200, { ok: true })
  }
  if (route !== '') return send(res, 404, { ok: false })
  if (req.method !== 'GET') return send(res, 405, { ok: false })

  const from = Number(url.searchParams.get('from'))
  const to = Number(url.searchParams.get('to'))
  if (!Number.isFinite(from) || !Number.isFinite(to) || to <= from || to - from > MAX_RANGE) return send(res, 400, { ok: false })

  let cache = readJson(EVENTS)
  const signedIn = fs.existsSync(AUTH)
  if (signedIn && clientId() && (!cache || Date.now() - (cache.syncedAt ?? 0) > STALE)) {
    await Promise.race([sync(), new Promise((r) => setTimeout(r, 8000).unref())]) // wait briefly; a slow sync carries on in the background
    cache = readJson(EVENTS)
  }
  const base = { configured: !!clientId(), error: lastError }
  if (!cache || !Array.isArray(cache.events)) return send(res, 200, { ...base, connected: signedIn, syncedAt: null, events: [] })
  // all-day events are whole UTC days, which can start up to 14 hours either side of your local day: the app picks them out by date
  const slack = 14 * 3600000
  const events = cache.events
    .filter((e) => e && typeof e.title === 'string' && Number.isFinite(e.start) && Number.isFinite(e.end) && (e.allDay ? e.start < to + slack && e.end > from - slack : e.start < to && e.end > from))
    .map((e) => ({
      id: String(e.id ?? `${e.start}-${e.title}`),
      title: e.title.slice(0, 200),
      start: e.start,
      end: e.end,
      allDay: !!e.allDay,
      // the details, checked again on the way out (links must be https)
      ...(typeof e.location === 'string' ? { location: e.location.slice(0, 200) } : {}),
      ...(typeof e.organizer === 'string' ? { organizer: e.organizer.slice(0, 120) } : {}),
      ...(Array.isArray(e.attendees) ? { attendees: e.attendees.filter((a) => typeof a === 'string').slice(0, 30) } : {}),
      ...(typeof e.notes === 'string' ? { notes: e.notes.slice(0, 600) } : {}),
      ...(safeUrl(e.join?.url) ? { join: { url: e.join.url, app: String(e.join.app ?? 'meeting').slice(0, 20) } } : {}),
      ...(safeUrl(e.link) ? { link: e.link } : {}),
      ...(typeof e.showAs === 'string' ? { showAs: e.showAs.slice(0, 20) } : {}),
      ...(typeof e.response === 'string' ? { response: e.response.slice(0, 30) } : {}),
    }))
  send(res, 200, { ...base, connected: true, syncedAt: Number.isFinite(cache.syncedAt) ? cache.syncedAt : null, events })
}
