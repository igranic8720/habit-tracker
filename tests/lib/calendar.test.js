// dates, streaks and the habit dashboard numbers
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { YEAR, buildGrid, elapsedDays, getYear, iso, today, todayKey } from '../../src/lib/dates.js'
import { summarize, weekly } from '../../src/lib/stats.js'
import { currentStreak, longestStreak } from '../../src/lib/streaks.js'

const daysAgo = (n) => {
  const d = new Date(today)
  d.setDate(d.getDate() - n)
  return iso(d)
}

test('iso formats a local date as YYYY-MM-DD', () => {
  assert.equal(iso(new Date(2026, 0, 5)), '2026-01-05')
  assert.equal(todayKey, iso(new Date()))
})

test('a year grid is Sun–Sat weeks holding every day of the year exactly once', () => {
  for (const year of [2024, 2025, 2026, 2027]) {
    const grid = buildGrid(year)
    assert.ok(grid.length === 53 || grid.length === 54, `${year}: ${grid.length} weeks`)
    assert.ok(grid.every((w) => w.length === 7))
    const days = grid.flat().filter(Boolean)
    assert.equal(days.length, year % 4 === 0 ? 366 : 365)
    assert.ok(days.every((d) => d.getFullYear() === year))
    assert.equal(iso(days[0]), `${year}-01-01`)
    assert.equal(grid[0].findIndex(Boolean), new Date(year, 0, 1).getDay()) // Jan 1 sits on its weekday
  }
})

test('month labels appear once each, on the week holding the 1st', () => {
  const labels = getYear(2026).monthLabels.filter(Boolean)
  assert.deepEqual(labels, ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'])
})

test('elapsed days: a whole past year, or up to today', () => {
  assert.equal(elapsedDays(2024), 366)
  assert.equal(elapsedDays(2023), 365)
  const start = new Date(YEAR, 0, 1)
  assert.equal(elapsedDays(YEAR), Math.round((today - start) / 86400000) + 1)
})

test('current streak counts back from today, or from yesterday when today is not done yet', () => {
  assert.equal(currentStreak(new Set([daysAgo(0), daysAgo(1), daysAgo(2)])), 3)
  assert.equal(currentStreak(new Set([daysAgo(1), daysAgo(2)])), 2) // today still to do: the streak isn't broken
  assert.equal(currentStreak(new Set([daysAgo(2), daysAgo(3)])), 0) // missed yesterday
  assert.equal(currentStreak(new Set()), 0)
})

test('longest streak finds the longest run of consecutive days, in any order', () => {
  assert.equal(longestStreak(['2026-03-05', '2026-03-01', '2026-03-02', '2026-03-04', '2026-03-03', '2026-03-10']), 5)
  assert.equal(longestStreak(['2026-02-28', '2026-03-01']), 2) // across a month end
  assert.equal(longestStreak(['2024-12-31', '2025-01-01']), 2) // across a year end
  assert.equal(longestStreak([]), 0)
})

test('dashboard summary: done today, completion rate, best streaks', () => {
  const habits = [
    { id: 'a', name: 'Read', days: [daysAgo(0), daysAgo(1)] },
    { id: 'b', name: '', days: [daysAgo(1)] },
  ]
  const m = summarize(habits, YEAR)
  assert.equal(m.N, 2)
  assert.equal(m.doneToday, 1)
  const inYear = [daysAgo(0), daysAgo(1), daysAgo(1)].filter((k) => k.startsWith(`${YEAR}-`)).length
  assert.equal(m.doneInYear, inYear)
  assert.equal(m.possible, 2 * elapsedDays(YEAR))
  assert.equal(m.topStreak.name, 'Read')
  assert.equal(m.topStreak.n, 2)
  assert.equal(summarize([{ id: 'x', name: 'x', days: [] }], YEAR).rate, 0)
})

test('weekly completion: one row per grid week; weeks that have not started have no rate', () => {
  const habits = [{ id: 'a', name: 'a', days: [todayKey], set: new Set([todayKey]) }]
  const rows = weekly(habits, YEAR)
  assert.equal(rows.length, buildGrid(YEAR).length)
  const now = rows.find((r) => r.from <= today && today <= r.to)
  assert.ok(now.done >= 1 && now.rate > 0)
  if (rows.at(-1).from > today) assert.equal(rows.at(-1).rate, null)
})
