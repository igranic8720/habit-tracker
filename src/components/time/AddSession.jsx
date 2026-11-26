import './time.css'
import { useState } from 'react'
import { MIN, atTime, nextDay, startOfDay, whatOf } from '../../lib/time.js'
import { usePicker } from '../../hooks/usePicker.js'
import WhatPicker from './WhatPicker.jsx'

// add time you forgot to track: what, and when it started and finished on the chosen day (finishing earlier = after midnight).
// disabled (a day that hasn't happened): shown, so the card keeps its size, but it can't be opened.
export default function AddSession({ habits, workoutName, dayKey, onAdd, disabled = false }) {
  const pick = usePicker(habits)
  const [from, setFrom] = useState('09:00')
  const [to, setTo] = useState('10:00')
  const what = whatOf(pick.value, habits, workoutName, pick.other)
  const start = atTime(dayKey, from)
  let end = atTime(dayKey, to)
  if (start !== null && end !== null && end <= start) end = atTime(nextDay(dayKey), to)
  const ok = !!what && start !== null && end !== null && end > start && end - start <= 24 * 60 * MIN && start >= startOfDay(dayKey)

  return (
    <details className="time-add">
      <summary aria-disabled={disabled} title={disabled ? 'This day hasn’t happened yet' : undefined} onClick={(e) => disabled && e.preventDefault()}>
        Add time I forgot to track
      </summary>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          if (!ok) return
          onAdd({ ...what, start, end })
        }}
      >
        <WhatPicker habits={habits} workoutName={workoutName} value={pick.value} onChange={pick.setValue} other={pick.other} onOther={pick.setOther} />
        <label>From <input type="time" className="time-input" value={from} onChange={(e) => setFrom(e.target.value)} required /></label>
        <label>To <input type="time" className="time-input" value={to} onChange={(e) => setTo(e.target.value)} required /></label>
        <button type="submit" className="btn btn-sm" disabled={!ok}>Add</button>
      </form>
    </details>
  )
}
