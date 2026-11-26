// Microsoft sign-in (device code flow) and the Graph calendar call. Personal Outlook.com / Microsoft accounts: the "consumers" tenant.
// Nothing here stores anything; calendar.js keeps the tokens and the event cache.
const AUTH = 'https://login.microsoftonline.com/consumers/oauth2/v2.0'
const GRAPH = 'https://graph.microsoft.com/v1.0'
export const SCOPE = 'Calendars.Read offline_access'
const HOUR = 3600000
const DAY = 24 * HOUR

async function form(url, params) {
  const r = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(params),
    signal: AbortSignal.timeout(15000),
  })
  return { ok: r.ok, body: await r.json().catch(() => ({})) }
}

// step 1 of signing in: a short code for you to enter at microsoft.com/link
export async function startDeviceCode(clientId) {
  const { ok, body } = await form(`${AUTH}/devicecode`, { client_id: clientId, scope: SCOPE })
  if (!ok) throw new Error(body.error_description?.split('\r')[0] ?? body.error ?? 'Microsoft refused the request')
  return body // { device_code, user_code, verification_uri, expires_in, interval }
}

// step 2: ask whether you have approved it yet -> { ok, body }; body.error 'authorization_pending' means not yet
export const pollDeviceCode = (clientId, deviceCode) =>
  form(`${AUTH}/token`, { grant_type: 'urn:ietf:params:oauth:grant-type:device_code', client_id: clientId, device_code: deviceCode })

export const refreshTokens = (clientId, refreshToken) =>
  form(`${AUTH}/token`, { grant_type: 'refresh_token', client_id: clientId, refresh_token: refreshToken, scope: SCOPE })

// a token response -> what we keep
export const tokensOf = (body, previous) => ({
  accessToken: body.access_token,
  refreshToken: body.refresh_token ?? previous?.refreshToken,
  expiresAt: Date.now() + (body.expires_in ?? 3600) * 1000,
})

// links are only kept when they are plain https (never javascript: or the like: they end up in an <a href>)
export const safeUrl = (u) => {
  if (typeof u !== 'string' || u.length > 2000) return null
  try {
    return new URL(u).protocol === 'https:' ? u : null
  } catch {
    return null
  }
}
// online-meeting links in a meeting's text: Teams (work and personal), Zoom, Google Meet, Webex, Skype
const MEETING = /https:\/\/(?:teams\.microsoft\.com\/(?:l\/meetup-join|meet)|teams\.live\.com\/meet|[\w.-]*zoom\.us\/(?:j|my|w)\/|meet\.google\.com\/|[\w.-]*webex\.com\/|join\.skype\.com\/)[^\s<>"')\]]+/i
export function meetingOf(g) {
  const url = safeUrl(g.onlineMeeting?.joinUrl) ?? safeUrl(g.onlineMeetingUrl) ?? safeUrl([g.location?.displayName, g.body?.content, g.bodyPreview].filter(Boolean).join(' ').match(MEETING)?.[0]?.replace(/[.,;:!?]+$/, ''))
  if (!url) return null
  const host = new URL(url).hostname
  const app = /teams\./.test(host) ? 'Teams' : /zoom\.us$/.test(host) ? 'Zoom' : host === 'meet.google.com' ? 'Google Meet' : /webex\.com$/.test(host) ? 'Webex' : /skype\.com$/.test(host) ? 'Skype' : 'meeting'
  return { url, app }
}
const text = (v, max) => (typeof v === 'string' && v.trim() ? v.replace(/\s+/g, ' ').trim().slice(0, max) : undefined)

// a Graph event -> { id, title, start, end, allDay, ...details } in milliseconds, or null for ones we skip (cancelled, unreadable)
// details (each only when there is one): location, organizer, attendees [names], notes, join { url, app }, link (open in Outlook),
// showAs (free / tentative / busy / oof / workingElsewhere), response (accepted / tentativelyAccepted / declined / notResponded / organizer)
// Graph is asked for UTC times. All-day events have no real time of day: they are kept as whole UTC days (the app reads them by date).
export function toEvent(g) {
  if (!g || g.isCancelled || !g.start?.dateTime || !g.end?.dateTime) return null
  const utc = (s) => Date.parse(s.endsWith('Z') ? s : `${s}Z`)
  const start = utc(g.start.dateTime)
  const end = utc(g.end.dateTime)
  if (!Number.isFinite(start) || !Number.isFinite(end)) return null
  const title = String(g.subject || '(no title)')
  const attendees = (g.attendees ?? []).map((a) => text(a?.emailAddress?.name, 80) ?? text(a?.emailAddress?.address, 120)).filter(Boolean).slice(0, 30)
  const response = g.responseStatus?.response
  const details = Object.fromEntries(
    Object.entries({
      location: text(g.location?.displayName, 200),
      organizer: g.isOrganizer ? undefined : text(g.organizer?.emailAddress?.name, 80) ?? text(g.organizer?.emailAddress?.address, 120),
      attendees: attendees.length ? attendees : undefined,
      notes: text(g.bodyPreview, 600),
      join: meetingOf(g) ?? undefined,
      link: safeUrl(g.webLink) ?? undefined,
      showAs: ['free', 'tentative', 'busy', 'oof', 'workingElsewhere'].includes(g.showAs) ? g.showAs : undefined,
      response: ['accepted', 'tentativelyAccepted', 'declined', 'notResponded', 'organizer'].includes(response) ? response : undefined,
    }).filter(([, v]) => v !== undefined),
  )
  if (g.isAllDay) {
    const day = (ms) => Math.floor((ms + 12 * HOUR) / DAY) * DAY // rounds away any time-zone shift
    return { id: String(g.id), title, start: day(start), end: Math.max(day(end), day(start) + DAY), allDay: true, ...details }
  }
  return { id: String(g.id), title, start, end: Math.max(end, start), allDay: false, ...details }
}

// every event between two times (recurring events are expanded into their occurrences by calendarView)
export async function fetchEvents(accessToken, from, to) {
  const q = new URLSearchParams({
    startDateTime: new Date(from).toISOString(),
    endDateTime: new Date(to).toISOString(),
    // body is read only to find a meeting link in it (the stored notes are the short bodyPreview)
    $select: 'id,subject,start,end,isAllDay,isCancelled,location,organizer,isOrganizer,attendees,bodyPreview,body,onlineMeeting,onlineMeetingUrl,webLink,showAs,responseStatus',
    $top: '250',
  })
  let url = `${GRAPH}/me/calendarView?${q}`
  const events = []
  for (let page = 0; url && page < 20; page++) {
    const r = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}`, Prefer: 'outlook.timezone="UTC", outlook.body-content-type="text"' },
      signal: AbortSignal.timeout(20000),
    })
    if (!r.ok) throw Object.assign(new Error(`Graph ${r.status}`), { status: r.status })
    const body = await r.json()
    for (const g of body.value ?? []) {
      const e = toEvent(g)
      if (e) events.push(e)
    }
    url = body['@odata.nextLink']
  }
  return events
}
