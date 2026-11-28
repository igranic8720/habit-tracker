import { restText } from '../../../lib/plans.js'
import { durText, isClimb, setText } from '../../../lib/workouts.js'
import ClimbRow from './ClimbRow.jsx'
import SetRow from './SetRow.jsx'
import { CheckOutlined, CloseOutlined } from '@ant-design/icons'

// one exercise of today's session: its name (fixed: it comes from the plan or "Add an exercise"), what you did last time, its sets,
// and "✓ All sets". Sets come from the plan: none can be added during a workout. A climb (MoonBoard problems) has one row per problem,
// logged as sent or not (onClimb). Its times (rest, and time on for a timed exercise) show beside its name; activeJ is the set whose
// time on is running (onTimeOn / onStopOn start and stop one).
export default function ExerciseEntry({ entry, lastSets, nextJ, prJ, onRemove, onSet, onTick, onRemoveSet, onTickAll, onClimb, activeJ = -1, onTimeOn, onStopOn }) {
  const allDone = entry.sets.length > 0 && entry.sets.every((s) => s.done !== false)
  const climbs = entry.sets.length > 0 && entry.sets.every(isClimb)
  const timeOn = entry.sets.find((s) => s.secs)?.secs
  const times = [timeOn && `Time on ${durText(timeOn)}`, entry.rest && `Rest ${restText(entry.rest)}`].filter(Boolean).join(' · ')
  return (
    <div className="wl-ex">
      <div className="wl-ex-head">
        <h4 className="wl-name">{entry.exercise || 'Exercise'}</h4>
        {times && <span className="wl-ex-times">{times}</span>}
        <button type="button" className="wl-x" aria-label={`Remove ${entry.exercise || 'exercise'}`} title="Remove exercise" onClick={onRemove}>
          <CloseOutlined />
        </button>
      </div>
      {lastSets && <p className="wl-last">Last time: {lastSets.map(setText).join(', ')}</p>}
      <ol className="wl-sets">
        {entry.sets.map((s, j) =>
          isClimb(s) ? (
            <ClimbRow key={j} set={s} n={j + 1} isNext={j === nextJ} pr={j === prJ} onGrade={(grade) => onSet(j, { grade })} onLog={(sent) => onClimb(j, sent)} onRemove={() => onRemoveSet(j)} />
          ) : (
            <SetRow key={j} set={s} n={j + 1} isNext={j === nextJ} pr={j === prJ} running={j === activeJ} onChange={(patch) => onSet(j, patch)} onTick={() => onTick(j)} onTimeOn={() => onTimeOn?.(j)} onStopOn={onStopOn} onRemove={() => onRemoveSet(j)} />
          ),
        )}
      </ol>
      {entry.sets.length > 1 && !climbs && (
        <div className="wl-ex-actions">
          <button type="button" className="btn btn-sm" onClick={onTickAll}>
            {allDone ? 'Untick all' : <><CheckOutlined /> All sets</>}
          </button>
        </div>
      )}
    </div>
  )
}
