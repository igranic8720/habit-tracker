// the Pomodoro timer on At a glance: focus, then a break, round and round, until you pause or reset it. Attached to nothing (it
// tracks no time against a habit); synced across devices by saving only what changes when you press a button:
//   { focusMins, breakMins, runningSince: ms | null (null: paused / not started), elapsedMs: time done before the current run }
// Where you are (focus or break, time left, focuses finished) is worked out from that and the clock, so every device agrees and
// nothing is saved when one phase turns into the next.
export const POMODORO = { focusMins: 25, breakMins: 5, runningSince: null, elapsedMs: 0 }
const MIN = 60000

// how long the timer has run in total
export const elapsed = (p, now) => p.elapsedMs + (p.runningSince === null ? 0 : Math.max(0, now - p.runningSince))

// where it stands: { phase: 'focus' | 'break', left (ms in this phase), done (focuses finished), running, started }
export function pomodoroAt(p, now) {
  const focus = p.focusMins * MIN
  const cycle = focus + p.breakMins * MIN
  const e = elapsed(p, now)
  const into = e % cycle
  const rounds = Math.floor(e / cycle)
  const inFocus = into < focus
  return {
    phase: inFocus ? 'focus' : 'break',
    left: inFocus ? focus - into : cycle - into,
    done: rounds + (inFocus ? 0 : 1),
    running: p.runningSince !== null,
    started: e > 0 || p.runningSince !== null,
  }
}

// the buttons: each returns the new state to save
export const start = (p, now) => (p.runningSince === null ? { ...p, runningSince: now } : p)
export const pause = (p, now) => (p.runningSince === null ? p : { ...p, runningSince: null, elapsedMs: elapsed(p, now) })
// jump to the start of the next phase (a focus cut short still counts once its break begins)
export const skip = (p, now) => {
  const { left } = pomodoroAt(p, now)
  const e = elapsed(p, now) + left
  return { ...p, elapsedMs: e, runningSince: p.runningSince === null ? null : now }
}
export const reset = (p) => ({ ...p, runningSince: null, elapsedMs: 0 })

// mm:ss
export const clockText = (ms) => {
  const s = Math.ceil(ms / 1000)
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}
