import { describe, setCount, workText } from '../../lib/workouts.js'
import './WorkoutDay.css'

// a finished day's workout, read-only: one line per exercise
export default function WorkoutDay({ entries }) {
  const lines = describe(entries)
  if (!lines.length) return null
  const n = setCount(entries)
  return (
    <div className="wd">
      <ul>
        {lines.map((l, i) => (
          <li key={i}>
            <strong>{l.exercise}</strong>
            <span>{l.text}</span>
          </li>
        ))}
      </ul>
      <p className="wd-total">
        {n} {n === 1 ? 'set' : 'sets'} · {workText(entries)}
      </p>
    </div>
  )
}
