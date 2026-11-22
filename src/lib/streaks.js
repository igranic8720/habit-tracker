import { iso, today } from './dates.js'

// consecutive done days ending today (or yesterday: not having done today yet doesn't break it)
export function currentStreak(done) {
  const d = new Date(today)
  if (!done.has(iso(d))) d.setDate(d.getDate() - 1)
  let n = 0
  while (done.has(iso(d))) {
    n++
    d.setDate(d.getDate() - 1)
  }
  return n
}

// the longest run of consecutive days in a list of YYYY-MM-DD keys
export function longestStreak(days) {
  let best = 0
  let run = 0
  let prev = null
  for (const key of [...days].sort()) {
    const d = new Date(key + 'T00:00:00')
    if (prev) prev.setDate(prev.getDate() + 1)
    run = prev && iso(prev) === key ? run + 1 : 1
    best = Math.max(best, run)
    prev = d
  }
  return best
}
