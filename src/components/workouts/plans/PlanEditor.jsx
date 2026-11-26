import { useId, useState } from 'react'
import { moveItem, removeAt, replaceAt } from '../../../lib/arrays.js'
import { RESTS, restText } from '../../../lib/plans.js'
import ColorPicker from '../../shared/ColorPicker.jsx'
import EditorActions from '../EditorActions.jsx'
import PlanExerciseRow from './PlanExerciseRow.jsx'

// create / edit one plan: a name, the rest between sets (required: it runs the rest timer), and its exercises with planned
// sets × reps (and an optional starting weight).
// It edits a draft; nothing is saved until you press Save.
export default function PlanEditor({ initial, taken, names, onSave, onCancel, onDelete }) {
  const [draft, setDraft] = useState(initial)
  // everyone else's colours are crossed out; this plan's own saved colour stays choosable
  const others = new Map(taken)
  if (onDelete) others.delete(initial.color)
  const listId = useId()
  const rows = draft.exercises
  const setRows = (exercises) => setDraft({ ...draft, exercises })
  // blank rows are dropped; sets / reps always end up at least 1
  const clean = rows
    .filter((r) => r.exercise.trim())
    .map((r) => ({
      exercise: r.exercise.trim().slice(0, 80),
      sets: Math.min(20, Math.max(1, r.sets || 0)),
      reps: Math.min(100, Math.max(1, r.reps || 0)),
      ...(r.weight > 0 ? { weight: r.weight } : {}),
    }))
  const valid = draft.name.trim() !== '' && clean.length > 0 && RESTS.includes(draft.rest)

  return (
    <form
      className="pe surface"
      onSubmit={(e) => {
        e.preventDefault()
        if (valid) onSave({ id: draft.id, name: draft.name.trim().slice(0, 60), color: draft.color, rest: draft.rest, exercises: clean })
      }}
    >
      <h2 className="pv-title">{onDelete ? 'Edit plan' : 'New plan'}</h2>
      <label className="pe-label" htmlFor={`${listId}-name`}>
        Plan name
      </label>
      <div className="pe-name" data-color={draft.color}>
        <ColorPicker value={draft.color} taken={others} onChange={(color) => setDraft({ ...draft, color })} />
        <input
          id={`${listId}-name`}
          className="pe-input"
          value={draft.name}
          maxLength={60}
          placeholder="e.g. Push day, Legs, Upper A"
          autoFocus={!onDelete}
          onChange={(e) => setDraft({ ...draft, name: e.target.value })}
        />
      </div>
      <p className="pe-hint">Tap the dot to choose the plan’s colour.</p>

      <label className="pe-label" htmlFor={`${listId}-rest`}>
        Rest between sets
      </label>
      <select
        id={`${listId}-rest`}
        className="pe-input chevron pe-rest"
        required
        value={draft.rest ?? ''}
        onChange={(e) => setDraft({ ...draft, rest: Number(e.target.value) })}
      >
        <option value="" disabled>
          Choose a rest time…
        </option>
        {RESTS.map((s) => (
          <option key={s} value={s}>
            {restText(s)}
          </option>
        ))}
      </select>
      {!RESTS.includes(draft.rest) && <p className="pe-hint">Required. The rest timer counts this down after each set you tick.</p>}

      <h3 className="pe-sub">Exercises</h3>
      <ol className="pe-rows">
        {rows.map((r, i) => (
          <PlanExerciseRow
            key={i}
            row={r}
            index={i}
            count={rows.length}
            listId={listId}
            onChange={(patch) => setRows(replaceAt(rows, i, { ...r, ...patch }))}
            onMove={(d) => setRows(moveItem(rows, i, d))}
            onRemove={() => setRows(removeAt(rows, i))}
          />
        ))}
      </ol>
      <datalist id={listId}>
        {names.map((n) => (
          <option key={n} value={n} />
        ))}
      </datalist>
      <button type="button" className="btn btn-sm" onClick={() => setRows([...rows, { exercise: '', sets: 3, reps: 8 }])}>
        + Exercise
      </button>
      <p className="pe-hint">“Start lb” is only used the first time. After that, the weight from your last session is filled in for you.</p>

      <EditorActions what="plan" valid={valid} onCancel={onCancel} onDelete={onDelete} />
    </form>
  )
}
