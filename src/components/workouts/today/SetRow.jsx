import { UNIT } from '../../../lib/workouts.js'
import NumField from '../../shared/NumField.jsx'
import { durText } from '../../../lib/workouts.js'
import { CaretRightFilled, CheckOutlined, CloseOutlined, StopFilled } from '@ant-design/icons'

// one set: weight × reps (or, for a timed exercise, weight × seconds with ▶ to start its time on: the countdown runs in the bar at the
// top, like the rest, and ticks the set when it ends; running: this set's is running, so the button stops it), the tick for "done",
// a PR badge when it is a personal best, and remove
export default function SetRow({ set, n, isNext, pr, running = false, onChange, onTick, onTimeOn, onStopOn, onRemove }) {
  const done = set.done !== false
  const timed = set.secs !== undefined
  return (
    <li className={done ? 'is-done' : isNext ? 'is-next' : ''}>
      <span className="wl-n">{n}</span>
      <NumField decimal max={5000} label={`Set ${n} weight in ${UNIT}`} placeholder="BW" value={set.weight} onChange={(weight) => onChange({ weight })} />
      <span className="wl-times">{UNIT} ×</span>
      {timed ? (
        <>
          <NumField max={3600} label={`Set ${n} seconds`} placeholder="sec" value={set.secs} onChange={(secs) => onChange({ secs })} />
          <span className="wl-times">s</span>
          {!done && (
            <button
              type="button"
              className={`btn btn-sm hold-btn${running ? ' running' : ''}`}
              disabled={!set.secs}
              aria-label={running ? `Stop set ${n}’s time on` : `Start set ${n}’s time on: ${durText(set.secs)}`}
              onClick={running ? onStopOn : onTimeOn}
            >
              {running ? <><StopFilled /> Stop</> : <><CaretRightFilled /> {durText(set.secs)}</>}
            </button>
          )}
        </>
      ) : (
        <NumField max={1000} label={`Set ${n} reps`} placeholder="reps" value={set.reps} onChange={(reps) => onChange({ reps })} />
      )}
      <button type="button" className="wl-ok" aria-pressed={done} aria-label={`Set ${n} done`} title={done ? 'Done: tap to untick' : 'Tap when you have done this set'} onClick={onTick}>
        <CheckOutlined />
      </button>
      {pr && (
        <span className="wl-pr" title={timed ? 'Personal best: longer time on (or heavier) than any earlier session' : 'Personal best: heavier than any earlier session (or the same weight for more reps)'}>
          PR
        </span>
      )}
      <button type="button" className="wl-x" aria-label={`Remove set ${n}`} title="Remove set" onClick={onRemove}>
        <CloseOutlined />
      </button>
    </li>
  )
}
