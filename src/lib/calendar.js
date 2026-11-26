// calendar events for one day. An event is { id, title, start, end, allDay } (milliseconds).
import { todayKey } from './dates.js'
import { nextDay, startOfDay } from './time.js'

// how far ahead you can look: the calendar sync (server/calendar.js) keeps 60 days of upcoming events
export const AHEAD = 60
export const lastDay = () => nextDay(todayKey, AHEAD)

// the day's events split into all-day ones and timed ones clipped to the day: [{ ...event, start, end, cutStart, cutEnd }]
// An all-day event is whole UTC days (it has no time zone), so it is matched by date: it covers dayKey when start <= dayKey < end.
export function forDay(events, dayKey) {
  const d0 = startOfDay(dayKey)
  const d1 = startOfDay(nextDay(dayKey))
  const date = (ms) => new Date(ms).toISOString().slice(0, 10)
  return {
    allDay: events.filter((e) => e.allDay && date(e.start) <= dayKey && dayKey < date(e.end)),
    timed: events
      .filter((e) => !e.allDay && e.start < d1 && e.end > d0)
      .map((e) => ({ ...e, start: Math.max(e.start, d0), end: Math.min(e.end, d1), cutStart: e.start < d0, cutEnd: e.end > d1 }))
      .sort((a, b) => a.start - b.start || b.end - a.end),
  }
}

// side-by-side columns for events that overlap in time: each event gets { col, cols } (its column, and how many its group has)
export function layout(events) {
  const out = []
  let group = []
  let groupEnd = -Infinity
  const flush = () => {
    const cols = group.reduce((n, g) => Math.max(n, g.col + 1), 0)
    for (const g of group) out.push({ ...g, cols })
    group = []
  }
  const colEnds = []
  for (const e of events) {
    if (e.start >= groupEnd) {
      flush()
      colEnds.length = 0
    }
    let col = colEnds.findIndex((end) => end <= e.start)
    if (col < 0) col = colEnds.length
    colEnds[col] = e.end
    group.push({ event: e, col })
    groupEnd = Math.max(groupEnd, e.end)
  }
  flush()
  return out
}

// how many events (timed and all-day) fall on each of the given days: Map<dayKey, count>
export function eventCounts(events, keys) {
  const out = new Map()
  for (const key of keys) {
    const { allDay, timed } = forDay(events, key)
    if (allDay.length + timed.length) out.set(key, allDay.length + timed.length)
  }
  return out
}
