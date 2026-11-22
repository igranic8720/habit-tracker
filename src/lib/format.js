import { MONTHS } from './dates.js'

export const pct = (r) => `${Math.round(r * 100)}%`
export const monthDay = (d) => `${MONTHS[d.getMonth()]} ${d.getDate()}`
export const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`

// 'YYYY-MM-DD' -> Date at local midnight
export const fromKey = (key) => new Date(`${key}T00:00:00`)
