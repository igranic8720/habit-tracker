// calendar events on the day view: clipping to a day, and side-by-side columns for overlaps
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { forDay, layout } from '../../src/lib/calendar.js'
import { atTime } from '../../src/lib/time.js'

const D = '2026-11-25'
const ev = (id, from, to, over = {}) => ({ id, title: id, start: atTime(D, from), end: atTime(D, to), allDay: false, ...over })

test('events are clipped to the day, all-day ones are set apart, other days are left out', () => {
  const over = { id: 'night', title: 'night', start: atTime('2026-11-24', '22:00'), end: atTime(D, '01:00'), allDay: false }
  const later = { id: 'late', title: 'late', start: atTime(D, '23:00'), end: atTime('2026-11-26', '02:00'), allDay: false }
  const other = { id: 'tmrw', title: 'tmrw', start: atTime('2026-11-26', '09:00'), end: atTime('2026-11-26', '10:00'), allDay: false }
  const holiday = { id: 'hol', title: 'hol', start: Date.UTC(2026, 10, 25), end: Date.UTC(2026, 10, 26), allDay: true } // all-day: whole UTC days, matched by date
  const week = { id: 'wk', title: 'wk', start: Date.UTC(2026, 10, 23), end: Date.UTC(2026, 10, 30), allDay: true }
  const gone = { id: 'gone', title: 'gone', start: Date.UTC(2026, 10, 24), end: Date.UTC(2026, 10, 25), allDay: true }
  const { allDay, timed } = forDay([later, other, ev('a', '09:00', '10:00'), over, holiday, week, gone], D)
  assert.deepEqual(allDay.map((e) => e.id), ['hol', 'wk'])
  assert.deepEqual(timed.map((e) => [e.id, e.cutStart, e.cutEnd]), [['night', true, false], ['a', false, false], ['late', false, true]])
  assert.equal(timed[0].start, atTime(D, '00:00')) // clipped to midnight
  assert.equal(timed[2].end, atTime('2026-11-26', '00:00'))
})

test('events that touch end-to-start share a column; overlapping ones sit side by side', () => {
  const placed = layout([ev('a', '09:00', '10:00'), ev('b', '10:00', '11:00'), ev('c', '10:30', '12:00'), ev('d', '10:45', '11:15'), ev('e', '14:00', '15:00')])
  const at = Object.fromEntries(placed.map((p) => [p.event.id, [p.col, p.cols]]))
  assert.deepEqual(at.a, [0, 1]) // alone
  assert.deepEqual(at.b, [0, 3]) // b, c and d overlap one another
  assert.deepEqual(at.c, [1, 3])
  assert.deepEqual(at.d, [2, 3])
  assert.deepEqual(at.e, [0, 1])
  assert.deepEqual(layout([]), [])
})

test('events are counted on each day they fall on (all-day ones by date, overnight ones on both days)', async () => {
  const { eventCounts } = await import('../../src/lib/calendar.js')
  const at2 = (k, hhmm) => atTime(k, hhmm)
  const events = [
    { id: 'a', title: 'a', start: at2('2026-11-27', '09:00'), end: at2('2026-11-27', '10:00'), allDay: false },
    { id: 'b', title: 'b', start: at2('2026-11-27', '23:00'), end: at2('2026-11-28', '01:00'), allDay: false },
    { id: 'c', title: 'c', start: Date.UTC(2026, 10, 30), end: Date.UTC(2026, 11, 2), allDay: true },
  ]
  const counts = eventCounts(events, ['2026-11-26', '2026-11-27', '2026-11-28', '2026-11-30', '2026-12-01', '2026-12-02'])
  assert.deepEqual([...counts], [['2026-11-27', 2], ['2026-11-28', 1], ['2026-11-30', 1], ['2026-12-01', 1]])
})
