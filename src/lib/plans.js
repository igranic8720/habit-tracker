// workout plans (a named day of exercises) and cycles (plans in a repeating order)
import { firstFree, newId, recolor } from './habits.js'
import { hasSets, lastTime, topSet } from './workouts.js'

// each plan has a colour of its own (from the same 14 as habits; no habit or other plan uses it); a new plan takes the first free one
// (also skipping colours in `taken`: the habits' colours, so no two items ever share one)
export const nextColor = (plans, taken = []) => firstFree([...plans.map((p) => p.color), ...taken])
export const newPlan = (plans = [], taken = []) => ({ id: newId(), name: '', color: nextColor(plans, taken), exercises: [{ exercise: '', sets: 3, reps: 8 }] })
// plans with no colour, or one from an earlier palette, get one when loaded
export const withColors = recolor
export const planColor = (plan) => plan?.color ?? 'gray' // a freestyle day, or a deleted plan: neutral grey, so it never looks like a plan
export const newCycle = () => ({ id: newId(), name: '', steps: [] })

export const planLine = (plan) => plan.exercises.map((e) => `${e.exercise} ${e.sets}×${e.reps}`).join(' · ') || 'No exercises yet'

// the rest between sets a plan can have, in seconds, and how they read (90 -> "1:30")
export const RESTS = [30, 45, 60, 75, 90, 120, 150, 180, 240, 300]
export const restText = (s) => (s < 60 ? `${s}s` : `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`)

// today's entries for a plan: each exercise with its planned sets and reps, weight carried over from last time
// (or the plan's starting weight). The sets start un-ticked: they count once you tick them.
export function sessionFromPlan(plan, diary, key) {
  return plan.exercises.map((ex) => {
    const prev = lastTime(diary, ex.exercise, key)
    const weight = prev ? topSet(prev).weight : (ex.weight ?? 0)
    return { exercise: ex.exercise, sets: Array.from({ length: ex.sets }, () => ({ weight, reps: ex.reps, done: false })) }
  })
}

// a cycle's days whose plan still exists: [{ step, plan }] (step = position in the cycle)
export const cycleSteps = (cycle, plans) => cycle.steps.map((id, step) => ({ step, plan: plans.find((p) => p.id === id) })).filter((s) => s.plan)

// which day of the cycle a logged session was. The step number saved with it can go stale when the cycle is edited
// (a plan removed or moved), so check it still points at that plan, else use the nearest day holding that plan.
export function resolveStep(cycle, day) {
  if (cycle.steps[day.step] === day.plan) return day.step
  const near = cycle.steps
    .map((id, i) => [id, i])
    .filter(([id]) => id === day.plan)
    .map(([, i]) => i)
    .sort((a, b) => Math.abs(a - day.step) - Math.abs(b - day.step))[0]
  return near ?? Math.max(0, Math.min(day.step, cycle.steps.length - 1))
}

// where a cycle stands. The last day trained as part of it (a day only counts once a set was ticked) decides what is up next,
// wrapping round to the start after the last step.
export function cycleStatus(cycle, plans, log) {
  const steps = cycleSteps(cycle, plans)
  const key = Object.keys(log)
    .filter((k) => log[k].cycle === cycle.id && log[k].step !== undefined && hasSets(log[k].entries))
    .sort()
    .at(-1)
  const lastStep = key ? resolveStep(cycle, log[key]) : -1
  return { steps, next: steps.find((s) => s.step > lastStep) ?? steps[0] ?? null, last: key ? { key, step: lastStep } : null }
}

// the step to record when you start a plan inside the active cycle: the soonest matching step from "up next" onwards, or -1
export function stepFor(status, planId) {
  if (!status.next) return -1
  const order = [...status.steps.filter((s) => s.step >= status.next.step), ...status.steps.filter((s) => s.step < status.next.step)]
  return order.find((s) => s.plan.id === planId)?.step ?? -1
}

// how often a plan has been done and when last
export function planUse(planId, log) {
  const keys = Object.keys(log).filter((k) => log[k].plan === planId && hasSets(log[k].entries)).sort()
  return { times: keys.length, last: keys.at(-1) ?? null }
}

// the log day for starting `plan` today (null = a freestyle workout). Inside the active cycle it records which day of the cycle this is.
// w is the workout data { plans, cycles, active, log }
export function newSession(plan, w, diary, key, step) {
  if (!plan) return { name: 'Workout', plan: null, cycle: null, entries: [] }
  const cycle = w.cycles.find((c) => c.id === w.active)
  const s = step ?? (cycle ? stepFor(cycleStatus(cycle, w.plans, w.log), plan.id) : -1)
  return {
    name: plan.name || 'Workout',
    plan: plan.id,
    cycle: s >= 0 ? cycle.id : null,
    ...(s >= 0 ? { step: s } : {}),
    entries: sessionFromPlan(plan, diary, key),
  }
}
