import { useEffect, useRef, useState } from 'react'
import './TimerBar.css'

const clock = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

// the training log's countdown, pinned to the top while you scroll: one at a time, either
//   on:   a timed set's time on ({ start, end }, label "Plank · set 2"); at zero it buzzes and calls onDone (the set is ticked and its
//         rest starts); Stop ends it early without ticking
//   rest: the rest after a ticked set; when it runs out it says so (and buzzes), then clears itself
export default function TimerBar({ kind, timer, label, onAdjust, onStop, onDone }) {
  const [now, setNow] = useState(() => Date.now())
  const done = useRef(onDone)
  useEffect(() => {
    done.current = onDone
  })
  useEffect(() => {
    const t = setInterval(() => {
      const at = Date.now()
      setNow(at)
      if (kind === 'on' && at >= timer.end) {
        clearInterval(t)
        navigator.vibrate?.([200, 100, 200])
        done.current?.()
      }
    }, 250)
    return () => clearInterval(t)
  }, [kind, timer.end])
  const left = Math.max(0, Math.ceil((timer.end - now) / 1000))
  const over = kind === 'rest' && left === 0
  useEffect(() => {
    if (!over) return
    navigator.vibrate?.([200, 100, 200])
    const t = setTimeout(onStop, 8000) // the "rest over" note clears itself
    return () => clearTimeout(t)
  }, [over, onStop])
  const progress = over ? 1 : Math.min(1, (now - timer.start) / (timer.end - timer.start))
  const title = kind === 'on' ? `Time on${label ? ` · ${label}` : ''}` : over ? 'Rest over · next set' : 'Rest'

  return (
    <div className={`rt ${kind}${over ? ' over' : ''}`} role="timer" aria-label={kind === 'on' ? 'Time on timer' : 'Rest timer'}>
      <span className="rt-fill" style={{ transform: `scaleX(${progress})` }} />
      <span className="rt-label">{title}</span>
      <strong className="rt-time">{clock(left)}</strong>
      <span className="rt-buttons">
        {kind === 'rest' && !over && (
          <>
            <button type="button" onClick={() => onAdjust(-15)} aria-label="15 seconds less">
              −15s
            </button>
            <button type="button" onClick={() => onAdjust(15)} aria-label="15 seconds more">
              +15s
            </button>
          </>
        )}
        <button type="button" onClick={onStop}>
          {kind === 'on' ? 'Stop' : over ? 'OK' : 'Skip'}
        </button>
      </span>
    </div>
  )
}
