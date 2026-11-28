// the Pomodoro timer: where it stands is worked out from the clock, so devices agree without saving on every phase change
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { POMODORO, clockText, pause, pomodoroAt, reset, skip, start } from '../../src/lib/pomodoro.js'

const MIN = 60000
const T0 = 1_800_000_000_000

test('not started: 25:00 of focus, nothing done', () => {
  assert.deepEqual(pomodoroAt(POMODORO, T0), { phase: 'focus', left: 25 * MIN, done: 0, running: false, started: false })
})

test('it runs focus, break, focus… on its own, counting the focuses finished', () => {
  const p = start(POMODORO, T0)
  assert.deepEqual(pomodoroAt(p, T0 + 10 * MIN), { phase: 'focus', left: 15 * MIN, done: 0, running: true, started: true })
  assert.deepEqual(pomodoroAt(p, T0 + 26 * MIN), { phase: 'break', left: 4 * MIN, done: 1, running: true, started: true })
  assert.deepEqual(pomodoroAt(p, T0 + 31 * MIN), { phase: 'focus', left: 24 * MIN, done: 1, running: true, started: true })
  assert.equal(pomodoroAt(p, T0 + 3 * 30 * MIN + 25 * MIN).done, 4) // the fourth focus just finished
})

test('pause keeps the time done; resume carries on from there', () => {
  let p = start(POMODORO, T0)
  p = pause(p, T0 + 10 * MIN)
  assert.equal(p.runningSince, null)
  assert.equal(pomodoroAt(p, T0 + 99 * MIN).left, 15 * MIN) // the clock doesn't move while paused
  p = start(p, T0 + 50 * MIN)
  assert.equal(pomodoroAt(p, T0 + 55 * MIN).left, 10 * MIN)
  assert.equal(start(p, T0 + 60 * MIN), p) // already running: unchanged
})

test('skip jumps to the next phase; reset goes back to the start', () => {
  let p = start(POMODORO, T0)
  p = skip(p, T0 + 3 * MIN) // focus cut short: on to the break
  assert.deepEqual(pomodoroAt(p, T0 + 3 * MIN), { phase: 'break', left: 5 * MIN, done: 1, running: true, started: true })
  p = skip(p, T0 + 4 * MIN) // break cut short: the next focus
  assert.equal(pomodoroAt(p, T0 + 4 * MIN).phase, 'focus')
  assert.equal(pomodoroAt(p, T0 + 4 * MIN).left, 25 * MIN)
  const paused = skip(pause(p, T0 + 5 * MIN), T0 + 6 * MIN) // skipping while paused stays paused
  assert.equal(paused.runningSince, null)
  assert.deepEqual(reset(p), { ...POMODORO })
  assert.equal(clockText(25 * MIN), '25:00')
  assert.equal(clockText(61500), '1:02') // (rounds up: it never shows 0:00 while time is left)
})
