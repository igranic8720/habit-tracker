// the "what is this time for" dropdown: one of your habits, a workout, or anything else (typed). State: hooks/usePicker.js
import { habitName } from '../../lib/habits.js'

export default function WhatPicker({ habits, workoutName, value, onChange, other, onOther }) {
  return (
    <>
      <select className="chevron time-select" aria-label="What are you spending time on?" value={value} onChange={(e) => onChange(e.target.value)}>
        <optgroup label="Habits">
          {habits.map((h) => (
            <option key={h.id} value={`h:${h.id}`}>{habitName(h)}</option>
          ))}
        </optgroup>
        <optgroup label="Other">
          <option value="workout">{workoutName}</option>
          <option value="other">Something else…</option>
        </optgroup>
      </select>
      {value === 'other' && (
        <input className="time-input" aria-label="What is it?" placeholder="What is it?" maxLength={80} value={other} onChange={(e) => onOther(e.target.value)} />
      )}
    </>
  )
}
