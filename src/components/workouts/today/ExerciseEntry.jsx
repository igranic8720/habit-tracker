import { fmt } from '../../../lib/workouts.js'
import SetRow from './SetRow.jsx'

// one exercise of today's session: its name, what you did last time, its sets, and "+ Set" / "✓ All sets"
export default function ExerciseEntry({ entry, listId, lastSets, nextJ, prJ, onRename, onRemove, onSet, onTick, onRemoveSet, onAddSet, onTickAll }) {
  const allDone = entry.sets.length > 0 && entry.sets.every((s) => s.done !== false)
  return (
    <div className="wl-ex">
      <div className="wl-ex-head">
        <input className="wl-name" list={listId} value={entry.exercise} maxLength={80} aria-label="Exercise name" onChange={(ev) => onRename(ev.target.value)} />
        <button type="button" className="wl-x" aria-label={`Remove ${entry.exercise || 'exercise'}`} title="Remove exercise" onClick={onRemove}>
          ✕
        </button>
      </div>
      {lastSets && <p className="wl-last">Last time: {lastSets.map((s) => `${s.weight ? fmt(s.weight) : 'BW'}×${s.reps}`).join(', ')}</p>}
      <ol className="wl-sets">
        {entry.sets.map((s, j) => (
          <SetRow key={j} set={s} n={j + 1} isNext={j === nextJ} pr={j === prJ} onChange={(patch) => onSet(j, patch)} onTick={() => onTick(j)} onRemove={() => onRemoveSet(j)} />
        ))}
      </ol>
      <div className="wl-ex-actions">
        <button type="button" className="btn btn-sm" onClick={onAddSet}>
          + Set
        </button>
        {entry.sets.length > 1 && (
          <button type="button" className="btn btn-sm" onClick={onTickAll}>
            {allDone ? 'Untick all' : '✓ All sets'}
          </button>
        )}
      </div>
    </div>
  )
}
