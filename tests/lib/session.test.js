// editing today's session in the set editor
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { addedSet, changeSet, nextSet, openCount, prIndexes } from '../../src/lib/session.js'

const S = (weight, reps, done = false) => ({ weight, reps, done })

test('changing a set: later sets not done yet follow, when they still had the old value', () => {
  const sets = [S(135, 8), S(135, 8), S(135, 8)]
  assert.deepEqual(changeSet(sets, 0, { weight: 140 }).map((s) => s.weight), [140, 140, 140])
  assert.deepEqual(changeSet(sets, 1, { reps: 6 }).map((s) => s.reps), [8, 6, 6]) // earlier sets never change
  const mixed = [S(135, 8), S(135, 8, true), S(130, 8)]
  assert.deepEqual(changeSet(mixed, 0, { weight: 140 }).map((s) => s.weight), [140, 135, 130]) // done, or different: left alone
  assert.deepEqual(changeSet(sets, 0, { done: true }).map((s) => s.done), [true, false, false]) // a tick never spreads
})

test('the set you are on, and how many are left', () => {
  const e = [{ exercise: 'a', sets: [S(1, 1, true), S(1, 1)] }, { exercise: 'b', sets: [S(1, 1)] }]
  assert.deepEqual(nextSet(e), { i: 0, j: 1 })
  assert.equal(openCount(e), 2)
  assert.equal(nextSet([{ exercise: 'a', sets: [S(1, 1, true)] }]), null)
})

test('a new set repeats the last one, or last time’s best', () => {
  assert.deepEqual(addedSet([S(140, 6, true)], null), S(140, 6))
  assert.deepEqual(addedSet([], [S(130, 8, true), S(135, 5, true)]), S(135, 5))
  assert.deepEqual(addedSet([], null), S(0, 0))
})

test('PRs: today’s heaviest ticked set of an exercise, when it beats every earlier session', () => {
  const entries = [
    { exercise: 'Squat', sets: [S(140, 8, true), S(145, 5, true), S(150, 3)] },
    { exercise: 'Row', sets: [S(95, 8, true)] },
  ]
  const best = { Squat: { weight: 140, reps: 8, done: true }, Row: { weight: 95, reps: 8, done: true } }
  assert.deepEqual(prIndexes(entries, (name) => best[name]), [1, -1])
})
