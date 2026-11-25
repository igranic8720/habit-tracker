// editing today's workout session: entries = [{ exercise, sets: [{ weight, reps, done }] }]
// (pure functions, so the set editor stays simple and this logic is tested on its own)
import { beats, topSet } from './workouts.js'

const isOpen = (s) => s.done === false // a planned set not ticked yet (sets with no flag are from before ticks existed: done)

export const openCount = (entries) => entries.reduce((n, e) => n + e.sets.filter(isOpen).length, 0)

// the set you are on: the first one not ticked yet, as { i, j } (or null when everything is done)
export function nextSet(entries) {
  const i = entries.findIndex((e) => e.sets.some(isOpen))
  return i < 0 ? null : { i, j: entries[i].sets.findIndex(isOpen) }
}

// change one set; the later sets not done yet follow a weight / reps change when they still had the old value,
// so moving your working weight up is one edit, not three
export function changeSet(sets, j, patch) {
  const old = sets[j]
  return sets.map((s, k) => {
    if (k === j) return { ...s, ...patch }
    if (k < j || !isOpen(s)) return s
    return { ...s, ...Object.fromEntries(Object.entries(patch).filter(([f]) => f !== 'done' && s[f] === old[f])) }
  })
}

// a new set repeats the last one (or last time's best set): the common case is "same again"
export function addedSet(sets, lastSets) {
  const from = sets.at(-1) ?? (lastSets ? topSet(lastSets) : { weight: 0, reps: 0 })
  return { weight: from.weight, reps: from.reps, done: false }
}

// per exercise: the index of today's personal-best set (its heaviest ticked set, when that beats every earlier session), or -1
export function prIndexes(entries, bestBefore) {
  return entries.map((e) => {
    const best = bestBefore(e.exercise)
    const ok = e.sets.filter((s) => beats(s, best))
    return ok.length ? e.sets.indexOf(topSet(ok)) : -1
  })
}
