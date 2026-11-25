import { useEffect, useState } from 'react'
import './RestTimer.css'

const clock = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

// the countdown after a ticked set, pinned to the top while you scroll. When it runs out it says so (and buzzes, where the phone allows).
export default function RestTimer({ rest, onAdjust, onStop }) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 250)
    return () => clearInterval(t)
  }, [])
  const left = Math.max(0, Math.ceil((rest.end - now) / 1000))
  const over = left === 0
  useEffect(() => {
    if (!over) return
    navigator.vibrate?.([200, 100, 200])
    const t = setTimeout(onStop, 8000) // the "rest over" note clears itself
    return () => clearTimeout(t)
  }, [over, onStop])
  const progress = over ? 1 : Math.min(1, (now - rest.start) / (rest.end - rest.start))

  return (
    <div className={`rt${over ? ' over' : ''}`} role="timer" aria-label="Rest timer">
      <span className="rt-fill" style={{ transform: `scaleX(${progress})` }} />
      <span className="rt-label">{over ? 'Rest over · next set' : 'Rest'}</span>
      <strong className="rt-time">{clock(left)}</strong>
      <span className="rt-buttons">
        {!over && (
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
          {over ? 'OK' : 'Skip'}
        </button>
      </span>
    </div>
  )
}
