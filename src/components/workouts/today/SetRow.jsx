import { UNIT } from '../../../lib/workouts.js'
import NumField from '../../shared/NumField.jsx'
import { CheckOutlined, CloseOutlined } from '@ant-design/icons'

// one set: weight × reps, the tick for "done", a PR badge when it is a personal best, and remove
export default function SetRow({ set, n, isNext, pr, onChange, onTick, onRemove }) {
  const done = set.done !== false
  return (
    <li className={done ? 'is-done' : isNext ? 'is-next' : ''}>
      <span className="wl-n">{n}</span>
      <NumField decimal max={5000} label={`Set ${n} weight in ${UNIT}`} placeholder="BW" value={set.weight} onChange={(weight) => onChange({ weight })} />
      <span className="wl-times">{UNIT} ×</span>
      <NumField max={1000} label={`Set ${n} reps`} placeholder="reps" value={set.reps} onChange={(reps) => onChange({ reps })} />
      <button type="button" className="wl-ok" aria-pressed={done} aria-label={`Set ${n} done`} title={done ? 'Done: tap to untick' : 'Tap when you have done this set'} onClick={onTick}>
        <CheckOutlined />
      </button>
      {pr && (
        <span className="wl-pr" title="Personal best: heavier than any earlier session (or the same weight for more reps)">
          PR
        </span>
      )}
      <button type="button" className="wl-x" aria-label={`Remove set ${n}`} title="Remove set" onClick={onRemove}>
        <CloseOutlined />
      </button>
    </li>
  )
}
