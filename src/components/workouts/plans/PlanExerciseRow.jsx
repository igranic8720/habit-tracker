import NumField from '../../shared/NumField.jsx'
import ReorderButtons from '../ReorderButtons.jsx'

// one exercise in the plan editor: its name, then planned sets × reps and an optional starting weight
export default function PlanExerciseRow({ row, index, count, listId, onChange, onMove, onRemove }) {
  const n = index + 1
  return (
    <li className="pe-row">
      <div className="pe-top">
        <input
          className="pe-input pe-ex"
          list={listId}
          value={row.exercise}
          maxLength={80}
          placeholder="Exercise (e.g. Bench press)"
          aria-label={`Exercise ${n}`}
          onChange={(e) => onChange({ exercise: e.target.value })}
        />
        <ReorderButtons index={index} count={count} onMove={onMove} onRemove={onRemove} removeLabel="Remove exercise" />
      </div>
      <div className="pe-nums">
        <label>
          <span>Sets</span>
          <NumField max={20} label={`Exercise ${n} sets`} placeholder="3" value={row.sets} onChange={(sets) => onChange({ sets })} />
        </label>
        <label>
          <span>Reps</span>
          <NumField max={100} label={`Exercise ${n} reps`} placeholder="8" value={row.reps} onChange={(reps) => onChange({ reps })} />
        </label>
        <label>
          <span>Start lb</span>
          <NumField decimal max={5000} label={`Exercise ${n} starting weight in lb`} placeholder="–" value={row.weight ?? 0} onChange={(weight) => onChange({ weight })} />
        </label>
      </div>
    </li>
  )
}
