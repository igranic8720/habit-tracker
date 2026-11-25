import { YEAR } from './dates.js'

// the colours a habit or a plan can have: red, orange, yellow, blue, violet, white first (the rainbow minus green: green means "done"
// in this app), then 8 extras. A new habit / plan takes the first one not used yet. The values live in styles/theme.css (--hc-*).
export const COLORS = ['red', 'orange', 'yellow', 'blue', 'violet', 'white', 'pink', 'cyan', 'brown', 'magenta', 'sky', 'navy', 'wine', 'peach']

// the first colour none of `used` has (after all 14, they repeat)
export const firstFree = (used) => COLORS.find((c) => !used.includes(c)) ?? COLORS[used.length % COLORS.length]
// colours from earlier palettes map to their nearest current colour; green (retired) or no colour gets a free one
const RENAMED = { aqua: 'blue', purple: 'violet', indigo: 'navy', rose: 'wine', coral: 'peach', gold: 'yellow' }
// anything without a valid colour gets one
export function recolor(list) {
  const used = list.map((x) => x.color).filter((c) => COLORS.includes(c))
  return list.map((x) => {
    if (COLORS.includes(x.color)) return x
    const color = RENAMED[x.color] ?? firstFree(used)
    used.push(color)
    return { ...x, color }
  })
}

// randomUUID only exists on localhost/HTTPS; getRandomValues works over plain HTTP on the LAN
export const newId = () => {
  if (crypto.randomUUID) return crypto.randomUUID()
  return Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) => b.toString(16).padStart(2, '0')).join('')
}

export const newHabit = (color = COLORS[0]) => ({ id: newId(), name: '', color, days: [], notes: {} })

export const habitName = (h) => h.name || 'Unnamed habit'
export const habitColor = (h) => (COLORS.includes(h.color) ? h.color : 'blue')

// years you can browse: this year back to the earliest year with any data (always at least last year)
export function browsableYears(habits) {
  const dataYears = habits.flatMap((h) => [...h.days, ...Object.keys(h.notes ?? {})]).map((k) => Number(k.slice(0, 4)))
  const firstYear = Math.min(YEAR - 1, ...dataYears)
  return { firstYear, years: Array.from({ length: YEAR - firstYear + 1 }, (_, i) => YEAR - i) }
}
