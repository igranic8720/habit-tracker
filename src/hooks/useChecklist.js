import { useCallback } from 'react'
import { firstFree, newCheck, recolor } from '../lib/habits.js'
import { useAutosave } from './useAutosave.js'

// checklist habits (ticked off by hand), loaded from and saved to /api/checklist: a store of their own, apart from the timed
// habits (see useAutosave for how saving stays safe). Items with a retired colour get a current one.
const fix = (items) => {
  const colored = recolor(items)
  return [colored, colored.some((h, i) => h !== items[i])]
}
const options = { fromServer: (body) => body.items, toServer: (items) => ({ items }), fix }

export function useChecklist() {
  const { data, status, saveState, update, flush } = useAutosave('/api/checklist', options)
  const map = useCallback((fn) => update((hs) => hs.map(fn)), [update])
  return {
    items: data ?? [],
    status,
    saveState,
    flush,
    change: (id, next) => map((x) => (x.id === id ? next : x)),
    patch: (id, changes) => map((x) => (x.id === id ? { ...x, ...changes } : x)),
    // a new one takes the first colour nothing else (`taken`: habits, plans) uses
    add: (taken = []) => update((hs) => [...hs, newCheck(firstFree([...hs.map((h) => h.color), ...taken]))]),
    remove: (id) => update((hs) => hs.filter((x) => x.id !== id)),
  }
}
