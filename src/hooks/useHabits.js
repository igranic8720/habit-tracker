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
    // files a tracked session { id, start, end } with its habit (that is all "done" needs: see habitDoneDays)
    recordSession: (id, session) =>
      map((x) => {
        if (x.id !== id || (x.sessions ?? []).some((s) => s.id === session.id)) return x
        const { days: _stored, ...rest } = x // done days are worked out, never stored
        return { ...rest, sessions: [...(x.sessions ?? []), session] }
      }),
    removeSession: (id, sessionId) => map((x) => (x.id === id ? { ...x, sessions: (x.sessions ?? []).filter((s) => s.id !== sessionId) } : x)),
    // a new habit takes the first colour no habit and no plan (`taken`) uses
    add: (taken = []) => update((hs) => [...hs, newHabit(firstFree([...hs.map((h) => h.color), ...taken]))]),
    remove: (id) => update((hs) => hs.filter((x) => x.id !== id)),
  }
}
