import { POMODORO } from '../lib/pomodoro.js'
import { useAutosave } from './useAutosave.js'

// the Pomodoro timer's state (lib/pomodoro.js), loaded from and saved to /api/pomodoro: synced across devices like everything else
const options = {
  fromServer: ({ focusMins, breakMins, runningSince, elapsedMs }) => ({ focusMins, breakMins, runningSince, elapsedMs }),
  toServer: (d) => d,
  delay: 0, // a button press is saved straight away, so another device follows within a moment
}

export function usePomodoro() {
  const { data, status, update } = useAutosave('/api/pomodoro', options)
  return { state: data ?? POMODORO, ready: status === 'ready', set: (fn) => update(fn) }
}
