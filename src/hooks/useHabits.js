import { useCallback } from 'react'
import { firstFree, newHabit, recolor } from '../lib/habits.js'
import { useAutosave } from './useAutosave.js'

// a first visit starts with one blank habit (saved only once you change it); habits with a retired colour get a current one
const fix = (habits) => {
  const colored = recolor(habits)
  const changed = colored.some((h, i) => h !== habits[i])
  return [colored.length ? colored : [newHabit()], changed]
}
const options = { fromServer: (body) => body.habits, toServer: (habits) => ({ habits }), fix }

// the habit list, loaded from and saved to /api/habit (see useAutosave for how saving stays safe)
export function useHabits() {
  const { data, status, saveState, update, flush } = useAutosave('/api/habit', options)
  const map = useCallback((fn) => update((hs) => hs.map(fn)), [update])
  return {
    habits: data ?? [],
    status,
    saveState,
    flush,
    change: (id, next) => map((x) => (x.id === id ? next : x)),
    patch: (id, changes) => map((x) => (x.id === id ? { ...x, ...changes } : x)),
    add: () => update((hs) => [...hs, newHabit(firstFree(hs.map((h) => h.color)))]),
    remove: (id) => update((hs) => hs.filter((x) => x.id !== id)),
  }
}
