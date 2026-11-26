import { fmt } from '../../../lib/workouts.js'
import SetRow from './SetRow.jsx'
import { CheckOutlined, CloseOutlined } from '@ant-design/icons'

// one exercise of today's session: its name (fixed: it comes from the plan or "Add an exercise"), what you did last time, its sets,
// and "✓ All sets". Sets come from the plan: none can be added during a workout.
export default function ExerciseEntry({ entry, lastSets, nextJ, prJ, onRemove, onSet, onTick, onRemoveSet, onTickAll }) {
  const allDone = entry.sets.length > 0 && entry.sets.every((s) => s.done !== false)
  return (
    <div className="wl-ex">
      <div className="wl-ex-head">
        <h4 className="wl-name">{entry.exercise || 'Exercise'}</h4>
        <button type="button" className="wl-x" aria-label={`Remove ${entry.exercise || 'exercise'}`} title="Remove exercise" onClick={onRemove}>
          <CloseOutlined />
        </button>
      </div>
      {lastSets && <p className="wl-last">Last time: {lastSets.map((s) => `${s.weight ? fmt(s.weight) : 'BW'}×${s.reps}`).join(', ')}</p>}
      <ol className="wl-sets">
        {entry.sets.map((s, j) => (
          <SetRow key={j} set={s} n={j + 1} isNext={j === nextJ} pr={j === prJ} onChange={(patch) => onSet(j, patch)} onTick={() => onTick(j)} onRemove={() => onRemoveSet(j)} />
        ))}
      </ol>
      {entry.sets.length > 1 && (
        <div className="wl-ex-actions">
          <button type="button" className="btn btn-sm" onClick={onTickAll}>
            {allDone ? 'Untick all' : <><CheckOutlined /> All sets</>}
          </button>
        </div>
      )}
    </div>
  )
}
