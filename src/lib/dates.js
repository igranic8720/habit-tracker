// calendar helpers: "today", the current year, and the Sun–Sat week grid of a year
export const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export const iso = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

export const today = new Date()
today.setHours(0, 0, 0, 0)
export const todayKey = iso(today)

export const YEAR = today.getFullYear() // the current year

// every week (Sun–Sat) of a year; days outside that year are null
export function buildGrid(year) {
  const start = new Date(year, 0, 1)
  start.setDate(start.getDate() - start.getDay())
  const end = new Date(year, 11, 31)
  const days = Math.round((end - start) / (24 * 3600 * 1000)) // round: DST shifts the ms difference by an hour
  const weeks = Math.floor(days / 7) + 1
  return Array.from({ length: weeks }, (_, w) =>
    Array.from({ length: 7 }, (_, d) => {
      const date = new Date(start)
      date.setDate(start.getDate() + w * 7 + d)
      return date.getFullYear() === year ? date : null
    }),
  )
}

// the week grid plus the month label to show above each week column
export function getYear(year) {
  const grid = buildGrid(year)
  const monthLabels = grid.map((week) => {
    const first = week.find((d) => d && d.getDate() === 1)
    return first ? MONTHS[first.getMonth()] : ''
  })
  return { grid, monthLabels }
}

// days of `year` that have happened so far
export function elapsedDays(year) {
  const end = year < YEAR ? new Date(year, 11, 31) : today
  return Math.round((end - new Date(year, 0, 1)) / 86400000) + 1
}
