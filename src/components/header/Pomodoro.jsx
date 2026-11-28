import { useEffect, useRef } from 'react'
import { usePomodoro } from '../../hooks/usePomodoro.js'
import { useNow } from '../../hooks/useNow.js'
import { clockText, pause, pomodoroAt, reset, skip, start } from '../../lib/pomodoro.js'
import NumField from '../shared/NumField.jsx'
import './Pomodoro.css'
import { CaretRightFilled, PauseOutlined, StepForwardFilled, UndoOutlined } from '@ant-design/icons'

// the sound at the turn of a phase (focus to break, and back): a "done" chime (Kenney's Interface Sounds, public domain:
// public/sounds/LICENSE.txt), played twice so a short sound isn't missed. Browsers only play sound once the page has been clicked
// or tapped; until then the buzz and the screen still say it.
function chime() {
  const play = () => new Audio('/sounds/chime.wav').play().catch(() => {})
  play()
  setTimeout(play, 900)
}

// a Pomodoro timer in the At a glance header, attached to nothing: focus, then a break, round and round (25 and 5 minutes to begin
// with: before it starts, or after a reset, both lengths can be changed). ▶ starts (or resumes) it; while it runs: pause, skip to the
// next phase, reset. Synced across devices (only the button presses and lengths are saved; each device works out the time left). The
// tab's title shows the countdown while it runs.
export default function Pomodoro() {
  const { state, ready, set } = usePomodoro()
  const now = useNow(state.runningSince !== null, 500)
  const p = pomodoroAt(state, now) // (just after ▶, the clock may lag a moment: it then shows the full time, never a negative one)
  const clock = clockText(p.left)
  const label = p.phase === 'focus' ? 'Focus' : 'Break'

  // the turn from one phase to the next (while it runs, on this device): the chime, and a buzz
  const last = useRef(null)
  const key = `${p.phase}-${p.done}`
  useEffect(() => {
    if (last.current && last.current !== key && p.running) {
      chime()
      navigator.vibrate?.([200, 100, 200])
    }
    last.current = key
  }, [key, p.running])

  // the countdown in the tab's title while it runs
  useEffect(() => {
    if (!p.running) return
    const before = document.title
    document.title = `${clock} ${label} · Habit Tracker`
    return () => {
      document.title = before
    }
  }, [p.running, clock, label])

  if (!ready) return null
  return (
    <div className={`pomo ${p.phase}${p.running ? ' running' : ''}`} role="timer" aria-label={`Pomodoro: ${label}, ${clock} left${p.done ? `, ${p.done} done` : ''}`}>
      {p.running ? (
        <button type="button" className="pomo-btn" aria-label="Pause" title="Pause" onClick={() => set((s) => pause(s, Date.now()))}>
          <PauseOutlined />
        </button>
      ) : (
        <button type="button" className="pomo-btn play" aria-label={p.started ? 'Resume' : 'Start a pomodoro'} title={p.started ? 'Resume' : 'Start'} onClick={() => set((s) => start(s, Date.now()))}>
          <CaretRightFilled />
        </button>
      )}
      {p.started ? (
        <span className="pomo-what">
          <span className="pomo-label">{label}</span>
          <strong className="pomo-clock">{clock}</strong>
        </span>
      ) : (
        // not started yet: the two lengths, in minutes (a blank or 0 isn't saved: the last good length stays)
        <span className="pomo-what pomo-setup">
          <label className="pomo-len">
            <span className="pomo-label">Focus</span>
            <NumField max={180} label="Focus length in minutes" placeholder="25" value={state.focusMins} onChange={(m) => m >= 1 && set((s) => ({ ...s, focusMins: m }))} />
            <span className="pomo-unit">min</span>
          </label>
          <label className="pomo-len">
            <span className="pomo-label">Break</span>
            <NumField max={60} label="Break length in minutes" placeholder="5" value={state.breakMins} onChange={(m) => m >= 1 && set((s) => ({ ...s, breakMins: m }))} />
            <span className="pomo-unit">min</span>
          </label>
        </span>
      )}
      {p.done > 0 && <span className="pomo-done" title="Focuses finished">{p.done} done</span>}
      {p.started && (
        <>
          <button type="button" className="pomo-btn" aria-label={p.phase === 'focus' ? 'Skip to the break' : 'Skip to the next focus'} title="Skip" onClick={() => set((s) => skip(s, Date.now()))}>
            <StepForwardFilled />
          </button>
          <button type="button" className="pomo-btn" aria-label="Reset" title="Reset" onClick={() => set((s) => reset(s))}>
            <UndoOutlined />
          </button>
        </>
      )}
    </div>
  )
}
