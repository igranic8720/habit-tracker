// splitting sessions by day, totals, durations
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { level, atTime, breakdown, byDay, clock, duration, habitDoneDays, habitTimeOn, lastDays, nextDay, segments, startOfDay, total, whatOf } from '../../src/lib/time.js'

const at = (key, hhmm) => atTime(key, hhmm)
const s = (id, from, to, over = {}) => ({ id, kind: 'other', ref: null, label: id, color: 'gray', start: from, end: to, ...over })

test('a session inside one day is one segment; one over midnight splits in two', () => {
  const a = s('a', at('2026-11-25', '09:00'), at('2026-11-25', '09:45'))
  assert.deepEqual(segments(a).map((g) => [g.key, g.end - g.start]), [['2026-11-25', 45 * 60000]])
  const b = s('b', at('2026-11-25', '23:30'), at('2026-11-26', '00:30'))
  assert.deepEqual(segments(b).map((g) => [g.key, (g.end - g.start) / 60000]), [['2026-11-25', 30], ['2026-11-26', 30]])
  const c = s('c', at('2026-11-25', '22:00'), at('2026-11-27', '01:00')) // spans three days
  assert.deepEqual(segments(c).map((g) => g.key), ['2026-11-25', '2026-11-26', '2026-11-27'])
})

test('days are correct across a daylight-saving change', () => {
  // 2026-03-08 is 23 hours long in US zones, 24 elsewhere; either way each day is covered exactly once
  const x = s('x', startOfDay('2026-03-07'), startOfDay('2026-03-10'))
  assert.deepEqual(segments(x).map((g) => g.key), ['2026-03-07', '2026-03-08', '2026-03-09'])
  assert.equal(nextDay('2026-03-07'), '2026-03-08')
  assert.equal(nextDay('2026-01-01', -1), '2025-12-31')
})

test('a day total counts overlapping time once', () => {
  const map = byDay([s('a', at('2026-11-25', '09:00'), at('2026-11-25', '10:00')), s('b', at('2026-11-25', '09:30'), at('2026-11-25', '10:30'))])
  assert.equal(total(map.get('2026-11-25')) / 60000, 90)
})

test('a running timer counts up to now, and is listed in order', () => {
  const now = at('2026-11-25', '12:00')
  const map = byDay([s('a', at('2026-11-25', '08:00'), at('2026-11-25', '09:00'))], { kind: 'other', ref: null, label: 'run', color: 'gray', start: at('2026-11-25', '11:00') }, now)
  const segs = map.get('2026-11-25')
  assert.deepEqual(segs.map((g) => g.session.id), ['a', 'running'])
  assert.equal(total(segs) / 60000, 120)
})

test('time per thing, biggest first; habits group by habit', () => {
  const h = (id, from, to) => s(id, at('2026-11-25', from), at('2026-11-25', to), { kind: 'habit', ref: 'read', label: 'Read' })
  const map = byDay([h('a', '08:00', '08:30'), h('b', '20:00', '20:20'), s('w', at('2026-11-25', '12:00'), at('2026-11-25', '13:00'), { kind: 'workout', label: 'Push' })])
  const parts = breakdown(map.get('2026-11-25'))
  assert.deepEqual(parts.map((p) => [p.label, p.ms / 60000, p.count]), [['Push', 60, 1], ['Read', 50, 2]])
})

test('durations and the live clock read well', () => {
  assert.equal(duration(0), '0m')
  assert.equal(duration(20000), '<1m')
  assert.equal(duration(40 * 60000), '40m')
  assert.equal(duration(95 * 60000), '1h 35m')
  assert.equal(duration(120 * 60000), '2h 00m')
  assert.equal(clock(3725000), '1:02:05')
  assert.equal(clock(-5), '0:00:00')
})

test('the last n days end on the given day, oldest first', () => {
  const map = byDay([s('a', at('2026-11-25', '09:00'), at('2026-11-25', '10:00'))])
  const days = lastDays(map, '2026-11-25', 3)
  assert.deepEqual(days.map((d) => [d.key, d.ms / 60000]), [['2026-11-23', 0], ['2026-11-24', 0], ['2026-11-25', 60]])
})

test('what a picker choice means', () => {
  const habits = [{ id: 'read', name: 'Read', color: 'red', days: [] }]
  assert.deepEqual(whatOf('h:read', habits, 'Push', ''), { kind: 'habit', ref: 'read', label: 'Read', color: 'red' })
  assert.equal(whatOf('h:gone', habits, 'Push', ''), null)
  assert.equal(whatOf('workout', habits, 'Push', '').label, 'Push')
  assert.equal(whatOf('other', habits, 'Push', '   '), null)
  assert.equal(whatOf('other', habits, 'Push', ' Chess ').label, 'Chess')
  assert.equal(atTime('2026-11-25', 'nope'), null)
})

test('sessions kept with habits, with workout days and loose are gathered into one list; an id is counted once', async () => {
  const { collect } = await import('../../src/lib/time.js')
  const habits = [{ id: 'read', name: 'Read', color: 'red', days: [], sessions: [{ id: 'a', start: 1000, end: 2000 }, { id: 'dup', start: 3000, end: 4000 }] }]
  const log = {
    '2026-11-25': { name: 'Push', plan: 'p1', entries: [], sessions: [{ id: 'b', start: 5000, end: 6000 }] },
    '2026-11-24': { name: 'Freestyle', plan: null, entries: [] },
  }
  const plans = [{ id: 'p1', color: 'orange' }]
  const loose = [{ id: 'c', kind: 'other', ref: null, label: 'Chess', color: 'gray', start: 7000, end: 8000 }, { id: 'dup', kind: 'habit', ref: 'read', label: 'Read', color: 'red', start: 3000, end: 4000 }]
  const all = collect(habits, log, plans, loose)
  assert.deepEqual(all.map((s) => [s.id, s.kind, s.label, s.color, s.src.type]), [
    ['a', 'habit', 'Read', 'red', 'habit'],
    ['dup', 'habit', 'Read', 'red', 'habit'],
    ['b', 'workout', 'Push', 'orange', 'workout'],
    ['c', 'other', 'Chess', 'gray', 'time'],
  ])
  assert.deepEqual(all[2].src, { type: 'workout', day: '2026-11-25' })
})

test('heatmap shading by hours tracked', () => {
  const m = 60000
  assert.deepEqual([0, 1, 59 * m, 60 * m, 119 * m, 120 * m, 239 * m, 240 * m, 900 * m].map(level), [0, 1, 1, 2, 2, 3, 3, 4, 4])
})

test('a habit is done on the days its time reaches its target (the running timer counts, live); no target, never done', () => {
  const d1 = '2026-11-24'
  const d2 = nextDay(d1)
  const h = {
    id: 'h', target: 30,
    sessions: [
      { id: 'a', start: at(d1, '09:00'), end: at(d1, '09:20') },
      { id: 'b', start: at(d1, '23:50'), end: at(d2, '00:15') }, // across midnight: 10m on d1, 15m on d2
    ],
  }
  assert.equal(habitTimeOn(h, d1), 30 * 60000)
  assert.equal(habitTimeOn(h, d2), 15 * 60000)
  assert.deepEqual(habitDoneDays(h), [d1]) // d1 reaches 30m exactly; d2 has 15m
  // timing it on d2: done the moment the target is reached, not when the timer stops
  const running = { kind: 'habit', ref: 'h', start: at(d2, '10:00') }
  assert.deepEqual(habitDoneDays(h, running, at(d2, '10:14')), [d1])
  assert.deepEqual(habitDoneDays(h, running, at(d2, '10:15')), [d1, d2])
  assert.equal(habitTimeOn(h, d2, running, at(d2, '10:15')), 30 * 60000)
  // another habit's timer doesn't count
  assert.deepEqual(habitDoneDays(h, { ...running, ref: 'other' }, at(d2, '11:00')), [d1])
  assert.deepEqual(habitDoneDays({ ...h, target: null }), [])
  assert.deepEqual(habitDoneDays({ ...h, target: 60 }), [])
})
