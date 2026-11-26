import { newId } from '../lib/habits.js'
import { useAutosave } from './useAutosave.js'

const EMPTY = { running: null, sessions: [] }
const options = { fromServer: ({ running, sessions }) => ({ running: running ?? null, sessions }), toServer: (d) => d }

// time tracking: the running timer, and any time not kept with a habit or workout (see lib/time.js collect); loaded from and saved to /api/time
export function useTime() {
  const { data, status, saveState, update, flush } = useAutosave('/api/time', options)
  const d = data ?? EMPTY
  return {
    ...d,
    status,
    saveState,
    flush,
    // what = { kind, ref, label, color }; one timer at a time
    start: (what) => update((x) => (x.running ? x : { ...x, running: { ...what, start: Date.now() } })),
    // ends the running timer and returns the finished session { id, kind, ref, label, color, start, end }; the caller files it with its
    // habit or workout (or adds it here with add)
    finish: () => {
      if (!d.running) return null
      update((x) => ({ ...x, running: null }))
      return { ...d.running, id: newId(), end: Math.max(Date.now(), d.running.start) }
    },
    discard: () => update((x) => ({ ...x, running: null })),
    add: (session) => update((x) => ({ ...x, sessions: [...x.sessions, { ...session, id: session.id ?? newId() }] })),
    remove: (id) => update((x) => ({ ...x, sessions: x.sessions.filter((s) => s.id !== id) })),
    removeMany: (ids) => update((x) => ({ ...x, sessions: x.sessions.filter((s) => !ids.includes(s.id)) })),
  }
}
