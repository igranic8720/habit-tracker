import { withColors } from '../lib/plans.js'
import { useAutosave } from './useAutosave.js'

const EMPTY = { plans: [], cycles: [], active: null, log: {} }
// plans with a retired colour get a current one
const fix = (d) => {
  const plans = withColors(d.plans)
  return [{ ...d, plans }, plans.some((p, i) => p !== d.plans[i])]
}
const options = {
  fromServer: ({ plans, cycles, active, log }) => ({ plans, cycles, active: active ?? null, log }),
  toServer: (d) => d,
  fix,
}
const upsert = (list, item) => (list.some((x) => x.id === item.id) ? list.map((x) => (x.id === item.id ? item : x)) : [...list, item])

// the workout data: plans, cycles, which cycle is active, and the day-by-day log; loaded from and saved to /api/workouts
export function useWorkouts() {
  const { data, status, saveState, update, flush } = useAutosave('/api/workouts', options)
  return {
    ...(data ?? EMPTY),
    status,
    saveState,
    flush,
    // one day of the log (null removes it)
    setDay: (key, day) =>
      update((d) => {
        const log = { ...d.log }
        if (day) log[key] = day
        else delete log[key]
        return { ...d, log }
      }),
    // tracked time { id, start, end } is kept with the day it started on (ignored when there is no workout that day)
    addSession: (key, session) =>
      update((d) => {
        const day = d.log[key]
        if (!day || (day.sessions ?? []).some((s) => s.id === session.id)) return d
        return { ...d, log: { ...d.log, [key]: { ...day, sessions: [...(day.sessions ?? []), session] } } }
      }),
    removeSession: (key, id) =>
      update((d) => {
        const day = d.log[key]
        if (!day) return d
        const { sessions = [], ...rest } = day
        const left = sessions.filter((s) => s.id !== id)
        return { ...d, log: { ...d.log, [key]: left.length ? { ...rest, sessions: left } : rest } }
      }),
    // changes one day from its latest state (so two quick changes, e.g. ticking a set and starting the rest, never undo each other)
    patchDay: (key, fn) =>
      update((d) => {
        const day = d.log[key]
        if (!day) return d
        return { ...d, log: { ...d.log, [key]: fn(day) } }
      }),
    savePlan: (plan) => update((d) => ({ ...d, plans: upsert(d.plans, plan) })),
    // a deleted plan also leaves every cycle (past log days keep the name they were done under)
    removePlan: (id) => update((d) => ({ ...d, plans: d.plans.filter((p) => p.id !== id), cycles: d.cycles.map((c) => ({ ...c, steps: c.steps.filter((s) => s !== id) })) })),
    saveCycle: (cycle) => update((d) => ({ ...d, cycles: upsert(d.cycles, cycle) })),
    removeCycle: (id) => update((d) => ({ ...d, cycles: d.cycles.filter((c) => c.id !== id), active: d.active === id ? null : d.active })),
    setActive: (id) => update((d) => ({ ...d, active: id })),
  }
}
