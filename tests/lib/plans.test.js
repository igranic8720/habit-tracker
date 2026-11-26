// plans and cycles: starting a session from a plan, where a cycle stands, and what is up next
import assert from 'node:assert/strict'
import { test } from 'node:test'
import * as p from '../../src/lib/plans.js'
import { diaryOf } from '../../src/lib/workouts.js'

const S = (weight, reps, done = true) => ({ weight, reps, done })
const plans = [
  { id: 'push', name: 'Push', color: 'orange', exercises: [{ exercise: 'Bench press', sets: 3, reps: 8, weight: 95 }] },
  { id: 'pull', name: 'Pull', color: 'violet', exercises: [{ exercise: 'Row', sets: 2, reps: 10 }] },
  { id: 'legs', name: 'Legs', color: 'red', exercises: [{ exercise: 'Squat', sets: 3, reps: 5, weight: 135 }] },
]
const day = (plan, step, done = true) => ({ name: plan, plan, cycle: 'c', step, entries: [{ exercise: 'x', sets: [S(1, 1, done)] }] })
const ppl = { id: 'c', name: 'PPL', steps: ['push', 'pull', 'legs'] }

test('starting a plan fills its sets, weights from last time (else the plan’s start weight), all un-ticked', () => {
  const diary = diaryOf({ '2026-11-20': { name: 'Push', entries: [{ exercise: 'Bench press', sets: [S(135, 8)] }] } })
  assert.deepEqual(p.sessionFromPlan(plans[0], diary, '2026-11-25')[0].sets, [S(135, 8, false), S(135, 8, false), S(135, 8, false)])
  assert.deepEqual(p.sessionFromPlan(plans[2], diary, '2026-11-25')[0].sets[0], S(135, 5, false))
  assert.equal(p.sessionFromPlan(plans[1], diary, '2026-11-25')[0].sets[0].weight, 0)
  assert.equal(p.planLine(plans[0]), 'Bench press 3×8')
})

test('a cycle: up next follows the last day trained in it (a day counts once a set was ticked), wrapping round', () => {
  assert.equal(p.cycleStatus(ppl, plans, {}).next.plan.id, 'push')
  assert.equal(p.cycleStatus(ppl, plans, { '2026-11-20': day('push', 0) }).next.plan.id, 'pull')
  assert.equal(p.cycleStatus(ppl, plans, { '2026-11-20': day('push', 0), '2026-11-22': day('pull', 1, false) }).next.plan.id, 'pull')
  assert.equal(p.cycleStatus(ppl, plans, { '2026-11-24': day('legs', 2) }).next.plan.id, 'push')
  assert.equal(p.cycleStatus({ id: 'e', name: 'empty', steps: [] }, plans, {}).next, null)
})

test('cycle position survives edits: the plan decides, not a stale step number', () => {
  const edited = { id: 'c', name: 'PPL', steps: ['push', 'legs'] } // Pull removed after Legs was done as day 3
  assert.equal(p.resolveStep(edited, day('legs', 2)), 1)
  assert.equal(p.cycleStatus(edited, plans, { d: day('legs', 2) }).next.plan.id, 'push')
  const reordered = { id: 'c', name: 'PPL', steps: ['legs', 'push', 'pull'] }
  assert.equal(p.cycleStatus(reordered, plans, { d: day('push', 0) }).next.plan.id, 'pull')
  const twice = { id: 'c', name: 'UL', steps: ['push', 'legs', 'push', 'legs'] }
  assert.equal(p.resolveStep(twice, day('push', 2)), 2)
  assert.ok(p.resolveStep({ id: 'c', name: 'x', steps: ['push'] }, day('legs', 2)) <= 0)
})

test('starting a plan inside the active cycle records which day it was (the soonest match from up next)', () => {
  const st = p.cycleStatus(ppl, plans, {})
  assert.equal(p.stepFor(st, 'pull'), 1)
  assert.equal(p.stepFor(st, 'nope'), -1)
  const w = { plans, cycles: [ppl], active: 'c', log: {} }
  const s = p.newSession(plans[2], w, diaryOf({}), '2026-11-25')
  assert.equal(s.cycle, 'c')
  assert.equal(s.step, 2)
  assert.equal(s.name, 'Legs')
  assert.deepEqual(p.newSession(null, w, diaryOf({}), '2026-11-25'), { name: 'Workout', plan: null, cycle: null, entries: [] })
  const noCycle = p.newSession(plans[0], { ...w, active: null }, diaryOf({}), '2026-11-25')
  assert.equal(noCycle.cycle, null)
  assert.ok(!('step' in noCycle))
})

test('plan use, colours and new plans', () => {
  assert.deepEqual(p.planUse('push', { a: day('push', 0), b: day('push', 0, false) }), { times: 1, last: 'a' })
  assert.equal(p.planColor(undefined), 'gray') // freestyle / deleted plan
  assert.equal(p.newPlan([{ color: 'red' }]).color, 'orange')
  assert.deepEqual(p.withColors([{ id: 'x', color: 'nope' }, { id: 'y', color: 'red' }, { id: 'z', color: 'green' }]).map((x) => x.color), ['orange', 'red', 'green'])
})

test('rest times read as seconds or minutes', async () => {
  const { RESTS, restText } = await import('../../src/lib/plans.js')
  assert.deepEqual([30, 45, 60, 90, 150, 300].map(restText), ['30s', '45s', '1:00', '1:30', '2:30', '5:00'])
  assert.ok(RESTS.every((s) => s >= 5 && s <= 900)) // all accepted by the server
})
