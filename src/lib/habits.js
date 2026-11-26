import { YEAR } from './dates.js'

// the 28 colours a habit or a plan can have (each item has its own): the first 14 (red, orange, yellow, blue, violet, white, then 8
// extras), then 14 more from green on. A new habit / plan takes the first one not used yet. The values live in styles/theme.css (--hc-*).
export const COLORS = [
  'red', 'orange', 'yellow', 'blue', 'violet', 'white', 'pink', 'cyan', 'brown', 'magenta', 'sky', 'navy', 'wine', 'peach',
  'green', 'lime', 'teal', 'mint', 'olive', 'forest', 'lavender', 'plum', 'slate', 'maroon', 'sand', 'rust', 'steel', 'salmon',
]

// the first colour none of `used` has (after all 28, they repeat)
export const firstFree = (used) => COLORS.find((c) => !used.includes(c)) ?? COLORS[used.length % COLORS.length]
// colours from earlier palettes map to their nearest current colour; no colour gets a free one
const RENAMED = { aqua: 'blue', purple: 'violet', indigo: 'navy', rose: 'wine', coral: 'peach', gold: 'yellow' }
// every habit and every plan has a colour of its own: no two items share one. When some do (older data, another device), the first
// claimant keeps it (habits in order, then plans; a blank starter habit last) and the others get a free colour. With all 28
// taken there is nothing free, so the rest are left as they are.
export function claimColors(habits, plans) {
  const blank = (h) => !h.name && !h.target && !h.sessions?.length && !Object.keys(h.notes ?? {}).length
  const items = [...habits.map((x, i) => ({ x, i, rank: blank(x) ? 2 : 0 })), ...plans.map((x, i) => ({ x, i: habits.length + i, rank: 1 }))]
  const order = [...items].sort((a, b) => a.rank - b.rank || a.i - b.i)
  const used = []
  const keep = new Set()
  for (const it of order) {
    if (COLORS.includes(it.x.color) && !used.includes(it.x.color)) {
      used.push(it.x.color)
      keep.add(it.i)
    }
  }
  const out = items.map((it) => it.x)
  for (const it of order) {
    if (keep.has(it.i)) continue
    const color = COLORS.find((c) => !used.includes(c))
    if (!color) break
    used.push(color)
    out[it.i] = { ...it.x, color }
  }
  return { habits: out.slice(0, habits.length), plans: out.slice(habits.length) }
}
// the first colour nobody has claimed, or null when all 28 are taken
export const freeColor = (claimed) => COLORS.find((c) => !claimed.includes(c)) ?? null

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

// a habit's daily target, in minutes (required: it is how a day gets done): 15 minutes to 24 hours, in steps of 15
export const TARGET_STEP = 15
export const TARGET_MAX = 24 * 60
// one step up or down from a target (none yet: up starts at 15m); an odd value from elsewhere snaps onto the 15-minute steps
export const stepTarget = (min, dir) =>
  !min ? (dir > 0 ? TARGET_STEP : null)
    : dir > 0 ? Math.min(TARGET_MAX, Math.floor(min / TARGET_STEP) * TARGET_STEP + TARGET_STEP)
      : Math.max(TARGET_STEP, Math.ceil(min / TARGET_STEP) * TARGET_STEP - TARGET_STEP)
export const targetText = (min) => (min < 60 ? `${min}m` : min % 60 ? `${Math.floor(min / 60)}h ${min % 60}m` : `${min / 60}h`)

// a new habit: no target yet (it asks for one before it can be timed). Its done days are never stored: see habitDoneDays.
export const newHabit = (color = COLORS[0]) => ({ id: newId(), name: '', color, target: null, notes: {} })

export const habitName = (h) => h.name || 'Unnamed habit'
export const habitColor = (h) => (COLORS.includes(h.color) ? h.color : 'blue')

// years you can browse: the years that have something tracked in them (habit days, notes, workouts, time), plus this year;
// newest first. Years with nothing in them are left out.
export function browsableYears(habits) {
  const dataYears = habits.flatMap((h) => [...(h.days ?? []), ...Object.keys(h.notes ?? {})]).map((k) => Number(k.slice(0, 4)))
  return { years: [...new Set([YEAR, ...dataYears.filter((y) => y <= YEAR)])].sort((a, b) => b - a) }
}
