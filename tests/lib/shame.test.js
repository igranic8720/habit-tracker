// the year tracker's line of shame: picks the worst true thing, in order
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { runs, shameLine as line, trackingStart } from '../../src/lib/shame.js'
import { nextDay } from '../../src/lib/time.js'

const TODAY = '2026-06-15'
const days = (...keys) => new Map(keys.map((k) => [k, 3600000]))
const back = (n) => nextDay(TODAY, -n)
const run = (from, to) => Array.from({ length: from - to + 1 }, (_, i) => back(from - i)) // back(from) .. back(to)
const at = (h) => new Date(2026, 5, 15, h, 30)
// (tracking started on Jan 1 unless a test says otherwise)
const shameLine = (m, today, now, since = '2026-01-01') => line(m, today, now, since)

test('runs: the current run and the best this year', () => {
  const m = days(...run(30, 21), ...run(3, 0)) // a 10-day run, a gap, then 4 days up to today
  assert.deepEqual(runs(m, TODAY, '2026-01-01'), { streak: 4, best: 10 })
  assert.equal(runs(days(...run(3, 1)), TODAY, '2026-01-01').streak, 3) // today not tracked yet: the run up to yesterday stands
})

test('the line of shame, worst first', () => {
  assert.match(shameLine(new Map(), TODAY, at(9)).text, /Nothing tracked in 2026/)
  assert.deepEqual(line(new Map(), TODAY, at(15), null), { tone: 'ok', text: 'Nothing tracked yet. The clock starts the day you do something.' })
  assert.equal(shameLine(days(back(5)), TODAY, at(9)).text, '5 days since you last tracked anything.')
  assert.match(shameLine(days(...run(5, 1)), TODAY, at(15)).text, /today is still empty\. Your 5-day run ends at midnight\./)
  assert.equal(shameLine(days(back(2), TODAY), TODAY, at(9)).text, 'Yesterday was a blank. Don’t make it two.')
  assert.equal(shameLine(days(...run(30, 21), ...run(3, 0)), TODAY, at(9)).text, 'Your best run this year was 10 days. You’re on 4.')
  const solid = days(...run(165, 0)) // every day of the year so far
  const good = shameLine(solid, TODAY, at(9))
  assert.equal(good.tone, 'ok')
  assert.match(good.text, /^166 days straight, your best this year/)
  // all bad lines are 'bad'
  assert.equal(shameLine(days(back(5)), TODAY, at(9)).tone, 'bad')
})

test('gaps earlier in the week, or across the year', () => {
  // a 2-day run now, but 3 of the last 7 days missed, and no earlier run of 3+
  const week = days(back(7), back(5), back(3), back(2), back(1), TODAY)
  assert.match(shameLine(week, TODAY, at(9)).text, /of the last 7 days: nothing|best run/)
  // every day for the last 2 weeks, nothing before: the year's waste
  const lately = days(...run(13, 0))
  assert.match(shameLine(lately, TODAY, at(9)).text, /^\d+% of 2026 so far has nothing to show for it\.$/)
})

test('tracking starts on the first day anything was recorded', () => {
  assert.equal(trackingStart(['2026-03-05', '2026-02-01'], ['2026-02-10'], []), '2026-02-01')
  assert.equal(trackingStart([], ['2026-04-01'], ['2026-03-30']), '2026-03-30')
  assert.equal(trackingStart([], [], []), null)
})

test('nothing before the start counts against you', () => {
  // started 14 days ago and tracked every day since: no waste, no gaps (Jan 1 to now would be ~92% empty)
  const since = back(13)
  const lately = days(...run(13, 0))
  const l = line(lately, TODAY, at(9), since)
  assert.equal(l.tone, 'ok', l.text)
  // started 10 days ago, 6 of those empty: the share is of the days since the start, and says so
  const patchy = days(back(9), back(7), back(5), back(1), TODAY)
  assert.match(line(patchy, TODAY, at(9), back(9)).text, /of the last 7 days|of the days since Jun 6/)
  // the best run only counts runs since the start
  assert.deepEqual(runs(days(...run(40, 31), ...run(2, 0)), TODAY, back(20)), { streak: 3, best: 3 })
})
