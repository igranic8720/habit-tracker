import { DEFAULT_REST, HOLDS, RESTS, restText } from '../../../lib/plans.js'
import { GRADES, durText } from '../../../lib/workouts.js'
import NumField from '../../shared/NumField.jsx'
import Segmented from '../../shared/Segmented.jsx'
import ReorderButtons from '../ReorderButtons.jsx'

const KINDS = [
  { id: 'reps', label: 'Reps' },
  { id: 'time', label: 'Time' },
  { id: 'climb', label: 'Climb' },
]
// switching kind keeps the name (as you typed it), sets and rest; each kind brings its own amount (and a climb has no weight)
const asKind = (row, k) => {
  const { reps: _r, secs: _s, grade: _g, ...base } = row
  if (k === 'time') return { ...base, secs: row.secs || 30 }
  if (k === 'climb') {
    const { weight: _w, ...rest } = base
    return { ...rest, grade: row.grade || 'V4' }
  }
  return { ...base, reps: row.reps || 8 }
}

// one exercise in the plan editor: its name; whether it's done for reps, for time (a hold: plank, dead hang) or is a climb (MoonBoard
// problems at a target grade); its sets × reps, the length of each hold or how many problems at what grade; an optional starting
// weight (not for climbs), and the rest between its sets (counted down after each one you tick)
export default function PlanExerciseRow({ row, index, count, listId, onChange, onMove, onRemove }) {
  const n = index + 1
  const kind = row.grade ? 'climb' : row.secs ? 'time' : 'reps'
  const timed = kind === 'time'
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
        <div className="pe-kind">
          <span>Done for</span>
          <Segmented
            label={`Exercise ${n}: reps, time or climb`}
            value={kind}
            options={KINDS}
            onChange={(k) => k !== kind && onChange(asKind(row, k), true)}
          />
        </div>
        <label>
          <span>{kind === 'climb' ? 'Problems' : 'Sets'}</span>
          <NumField max={20} label={`Exercise ${n} ${kind === 'climb' ? 'problems' : 'sets'}`} placeholder="3" value={row.sets} onChange={(sets) => onChange({ sets })} />
        </label>
        {kind === 'climb' ? (
          <label>
            <span>Target grade</span>
            <select className="pe-input chevron pe-small" aria-label={`Exercise ${n} target grade`} value={row.grade} onChange={(e) => onChange({ grade: e.target.value })}>
              {GRADES.map((g) => (
                <option key={g.v} value={g.v}>
                  {g.v} · {g.font}
                </option>
              ))}
            </select>
          </label>
        ) : timed ? (
          <label>
            <span>Time on</span>
            <select className="pe-input chevron pe-small" aria-label={`Exercise ${n} time on`} value={row.secs} onChange={(e) => onChange({ secs: Number(e.target.value) })}>
              {HOLDS.map((s) => (
                <option key={s} value={s}>
                  {durText(s)}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <label>
            <span>Reps</span>
            <NumField max={100} label={`Exercise ${n} reps`} placeholder="8" value={row.reps} onChange={(reps) => onChange({ reps })} />
          </label>
        )}
        {kind !== 'climb' && (
          <label>
            <span>Start lb</span>
            <NumField decimal max={5000} label={`Exercise ${n} starting weight in lb`} placeholder="–" value={row.weight ?? 0} onChange={(weight) => onChange({ weight })} />
          </label>
        )}
        <label>
          <span>Rest</span>
          <select
            className="pe-input chevron pe-small"
            aria-label={`Exercise ${n} rest between sets`}
            value={RESTS.includes(row.rest) ? row.rest : DEFAULT_REST}
            onChange={(e) => onChange({ rest: Number(e.target.value) })}
          >
            {RESTS.map((s) => (
              <option key={s} value={s}>
                {restText(s)}
              </option>
            ))}
          </select>
        </label>
      </div>
    </li>
  )
}
