import fs from 'node:fs'
import path from 'node:path'
import { DATA, dataApi, versionOf, writeAtomic } from './storage.js'

// The Pomodoro timer on At a glance, synced across devices: data/pomodoro/state.json
//   { focusMins, breakMins, runningSince (ms since 1970, or null while paused / stopped), elapsedMs (time done before the current run) }
// The phase and the time left are worked out from these (src/lib/pomodoro.js), so nothing is saved when focus turns into a break.
const DIR = path.join(DATA, 'pomodoro')
const FILE = path.join(DIR, 'state.json')
const DEFAULT = { focusMins: 25, breakMins: 5, runningSince: null, elapsedMs: 0 }
const int = (v, lo, hi) => Number.isInteger(v) && v >= lo && v <= hi

export const isValid = (d) =>
  d !== null && typeof d === 'object' &&
  int(d.focusMins, 1, 180) && int(d.breakMins, 1, 60) &&
  (d.runningSince === null || int(d.runningSince, 0, 4102444800000)) &&
  int(d.elapsedMs, 0, 365 * 24 * 3600000)

const tidy = (d) => ({ focusMins: d.focusMins, breakMins: d.breakMins, runningSince: d.runningSince, elapsedMs: d.elapsedMs })

function load() {
  try {
    const d = { ...DEFAULT, ...JSON.parse(fs.readFileSync(FILE, 'utf8')) }
    return isValid(d) ? tidy(d) : DEFAULT
  } catch {
    return DEFAULT
  }
}

function save(d) {
  fs.mkdirSync(DIR, { recursive: true })
  writeAtomic(FILE, JSON.stringify(tidy(d), null, 2) + '\n')
}

// GET /api/pomodoro -> { focusMins, breakMins, runningSince, elapsedMs, version }   POST the same -> saves it (see dataApi)
export const pomodoroApi = dataApi({ name: 'pomodoro', load, isValid, save, version: () => versionOf([FILE]) })
