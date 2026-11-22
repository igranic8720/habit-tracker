import { YEAR } from './dates.js'

export const COLORS = ['green', 'blue', 'purple', 'orange', 'pink']

export const newHabit = (n = 0) => ({ id: crypto.randomUUID(), name: '', color: COLORS[n % COLORS.length], days: [], notes: {} })

export const habitName = (h) => h.name || 'Unnamed habit'
export const habitColor = (h) => h.color ?? 'green'

// years you can browse: this year back to the earliest year with any data (always at least last year)
export function browsableYears(habits) {
  const dataYears = habits.flatMap((h) => [...h.days, ...Object.keys(h.notes ?? {})]).map((k) => Number(k.slice(0, 4)))
  const firstYear = Math.min(YEAR - 1, ...dataYears)
  return { firstYear, years: Array.from({ length: YEAR - firstYear + 1 }, (_, i) => YEAR - i) }
}
