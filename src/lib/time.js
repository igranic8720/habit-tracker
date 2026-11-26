// time-tracking maths. A session is { id, kind, ref, label, color, start, end } with start/end in milliseconds;
// a running timer has the same shape without id/end. Sessions can cross midnight, so days are worked out from segments.
import { iso, todayKey } from './dates.js'
import { habitColor, habitName } from './habits.js'

export const MIN = 60000
export const HOUR = 3600000

export const dayKeyOf = (t) => iso(new Date(t))
export const startOfDay = (key) => {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d).getTime()
}
export const nextDay = (key, n = 1) => {
  const [y, m, d] = key.split('-').map(Number)
  return iso(new Date(y, m - 1, d + n))
}

// the pieces of a session on each calendar day: [{ key, start, end, session }] (split at local midnight)
export function segments(s, now = s.end) {
  const end = s.end ?? now
  const out = []
  let from = s.start
  while (from < end || (from === end && !out.length)) {
    const key = dayKeyOf(from)
    const stop = Math.min(end, startOfDay(nextDay(key)))
    out.push({ key, start: from, end: stop, session: s })
    if (stop >= end) break
    from = stop
  }
  return out
}

// A habit is done on a day once the time tracked for it that day reaches its daily target. Nothing is ticked or stored: it is
// worked out from its sessions, plus the running timer when that is this habit's (so it turns done the moment the target is met).
const habitPieces = (habit, running, now) => {
  const live = running?.kind === 'habit' && running.ref === habit.id ? [{ ...running, id: 'running', end: null }] : []
  return [...(habit.sessions ?? []), ...live].flatMap((s) => segments(s, now))
}
// the time a habit has on a day
export const habitTimeOn = (habit, key, running = null, now = Date.now()) =>
  habitPieces(habit, running, now).filter((g) => g.key === key).reduce((n, g) => n + (g.end - g.start), 0)
// the days it is done (oldest first); none without a target
export function habitDoneDays(habit, running = null, now = Date.now()) {
  if (!(habit.target > 0)) return []
  const per = new Map()
  for (const g of habitPieces(habit, running, now)) per.set(g.key, (per.get(g.key) ?? 0) + (g.end - g.start))
  return [...per].filter(([, ms]) => ms >= habit.target * MIN).map(([k]) => k).sort()
}

// every day's segments: Map<'YYYY-MM-DD', segment[]> (oldest first within a day)
export function byDay(sessions, running, now) {
  const map = new Map()
  const all = running ? [...sessions, { ...running, id: 'running', end: null }] : sessions
  for (const s of all) {
    for (const seg of segments(s, now)) {
      if (!map.has(seg.key)) map.set(seg.key, [])
      map.get(seg.key).push(seg)
    }
  }
  for (const list of map.values()) list.sort((a, b) => a.start - b.start)
  return map
}

// time covered by a day's segments; overlapping sessions are only counted once
export function total(segs) {
  let sum = 0
  let edge = -Infinity
  for (const g of [...segs].sort((a, b) => a.start - b.start)) {
    const from = Math.max(g.start, edge)
    if (g.end > from) sum += g.end - from
    edge = Math.max(edge, g.end)
  }
  return sum
}

// time per thing (a habit, the workout, a custom label): [{ id, label, color, ms, count }] biggest first
export function breakdown(segs) {
  const map = new Map()
  for (const g of segs) {
    const s = g.session
    const id = s.kind === 'habit' && s.ref ? `h:${s.ref}` : `${s.kind}:${s.label}`
    if (!map.has(id)) map.set(id, { id, label: s.label, color: s.color, ms: 0, count: 0 })
    const x = map.get(id)
    x.ms += g.end - g.start
    x.count += 1
  }
  return [...map.values()].sort((a, b) => b.ms - a.ms)
}

// 95m -> "1h 35m", 40m -> "40m", under a minute -> "<1m"; zero -> "0m"
export function duration(t) {
  if (t <= 0) return '0m'
  const m = Math.floor(t / MIN)
  if (m < 1) return '<1m'
  return m >= 60 ? `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, '0')}m` : `${m}m`
}
// 3725000 -> "1:02:05" (the live clock)
export function clock(t) {
  const s = Math.max(0, Math.floor(t / 1000))
  const p = (n) => String(n).padStart(2, '0')
  return `${Math.floor(s / 3600)}:${p(Math.floor(s / 60) % 60)}:${p(s % 60)}`
}
export const timeOfDay = (t) => new Date(t).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })

// total per day for the n days ending at `endKey`: [{ key, ms }] oldest first
export function lastDays(map, endKey, n) {
  return Array.from({ length: n }, (_, i) => {
    const key = nextDay(endKey, i - n + 1)
    return { key, ms: total(map.get(key) ?? []) }
  })
}

// "HH:MM" on a day -> milliseconds (null if it isn't a time)
export function atTime(key, hhmm) {
  const m = /^(\d{2}):(\d{2})$/.exec(hhmm)
  return m ? startOfDay(key) + Number(m[1]) * HOUR + Number(m[2]) * MIN : null
}

// what a WhatPicker choice means: { kind, ref, label, color }, or null when it isn't complete (a deleted habit, an empty label)
export function whatOf(value, habits, workoutName, other) {
  if (value.startsWith('h:')) {
    const h = habits.find((x) => x.id === value.slice(2))
    return h ? { kind: 'habit', ref: h.id, label: habitName(h), color: habitColor(h) } : null
  }
  if (value === 'workout') return { kind: 'workout', ref: null, label: workoutName, color: 'blue' }
  const label = other.trim().slice(0, 80)
  return label ? { kind: 'other', ref: null, label, color: 'gray' } : null
}

// every tracked session, wherever it is kept: with its habit (habit.sessions), with its workout day (log[day].sessions), or loose in
// the time store (time you added for something else, or whose habit / workout day is gone). Each is { id, kind, ref, label, color, start, end, src }
// where src says where it lives, so it can be deleted from there. A session found in two places is counted once.
export function collect(habits, log, plans, loose) {
  const seen = new Set()
  const out = []
  const push = (s) => {
    if (seen.has(s.id)) return
    seen.add(s.id)
    out.push(s)
  }
  for (const h of habits) {
    for (const s of h.sessions ?? []) push({ ...s, kind: 'habit', ref: h.id, label: habitName(h), color: habitColor(h), src: { type: 'habit', id: h.id } })
  }
  for (const [day, d] of Object.entries(log)) {
    const color = plans.find((p) => p.id === d.plan)?.color ?? 'gray'
    for (const s of d.sessions ?? []) push({ ...s, kind: 'workout', ref: null, label: d.name || 'Workout', color, src: { type: 'workout', day } })
  }
  for (const s of loose) push({ ...s, src: { type: 'time' } })
  return out
}

// how much a day's tracked time shades its square: 0 none, 1 under an hour, 2 under two, 3 under four, 4 four or more
export const level = (ms) => (ms <= 0 ? 0 : ms < HOUR ? 1 : ms < 2 * HOUR ? 2 : ms < 4 * HOUR ? 3 : 4)

// "Wednesday, November 25", and "Today" / "Tomorrow" / "Yesterday" for the days near today (null otherwise)
export const dayLabel = (key) => new Date(startOfDay(key)).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })
export const dayName = (key) => (key === todayKey ? 'Today' : key === nextDay(todayKey) ? 'Tomorrow' : key === nextDay(todayKey, -1) ? 'Yesterday' : null)
