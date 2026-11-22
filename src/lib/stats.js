import { elapsedDays, getYear, iso, todayKey } from './dates.js'
import { habitName } from './habits.js'
import { currentStreak, longestStreak } from './streaks.js'

// headline numbers for the active habits in one year
export function summarize(habits, year) {
  const list = habits.map((h) => ({ ...h, set: new Set(h.days) }))
  const N = list.length
  const inYear = (h) => h.days.filter((k) => k.startsWith(`${year}-`))
  const doneInYear = list.reduce((n, h) => n + inYear(h).length, 0)
  const possible = N * elapsedDays(year)
  const top = (items) => items.reduce((a, b) => (b.n > a.n ? b : a), items[0])
  return {
    list,
    N,
    doneInYear,
    possible,
    rate: possible ? doneInYear / possible : 0,
    doneToday: list.filter((h) => h.set.has(todayKey)).length,
    topStreak: top(list.map((h) => ({ name: habitName(h), n: currentStreak(h.set) }))),
    bestInYear: top(list.map((h) => ({ name: habitName(h), n: longestStreak(inYear(h)) }))),
  }
}

// one row per week of the year, aligned to the habit grids (Sun–Sat); weeks that haven't happened have no rate
export function weekly(habits, year) {
  return getYear(year).grid.map((week) => {
    const days = week.filter((d) => d && iso(d) <= todayKey)
    const possible = days.length * habits.length
    const done = days.reduce((n, d) => n + habits.filter((h) => h.set.has(iso(d))).length, 0)
    const real = week.filter(Boolean)
    return { from: real[0], to: real[real.length - 1], done, possible, rate: possible ? done / possible : null }
  })
}
