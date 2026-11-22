import { useEffect, useRef, useState } from 'react'
import { newHabit } from '../lib/habits.js'

// owns the habit list: loads it from the dev server, and saves it back (debounced) after every change
export function useHabits() {
  const [habits, setHabits] = useState([])
  const [loaded, setLoaded] = useState(false)
  const [saveState, setSaveState] = useState('idle') // idle | saving | saved | error
  const dirty = useRef(false)

  useEffect(() => {
    fetch('/api/habit')
      .then((r) => r.json())
      .then((data) => setHabits(data.habits.length ? data.habits : [newHabit()]))
      .catch(() => setHabits([newHabit()]))
      .finally(() => setLoaded(true))
  }, [])

  // saved shortly after any change (debounced so typing a name or note isn't a write per key)
  useEffect(() => {
    if (!dirty.current) return
    setSaveState('saving')
    const t = setTimeout(() => {
      fetch('/api/habit', { method: 'POST', body: JSON.stringify({ habits }) })
        .then((r) => setSaveState(r.ok ? 'saved' : 'error'))
        .catch(() => setSaveState('error'))
    }, 300)
    return () => clearTimeout(t)
  }, [habits])

  const update = (fn) => {
    dirty.current = true
    setHabits(fn)
  }

  return {
    habits,
    loaded,
    saveState,
    change: (id, next) => update((hs) => hs.map((x) => (x.id === id ? next : x))),
    patch: (id, changes) => update((hs) => hs.map((x) => (x.id === id ? { ...x, ...changes } : x))),
    add: () => update((hs) => [...hs, newHabit(hs.length)]),
    remove: (id) => update((hs) => hs.filter((x) => x.id !== id)),
  }
}
