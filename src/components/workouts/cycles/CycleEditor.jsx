import { useState } from 'react'
import { moveItem, removeAt, replaceAt } from '../../../lib/arrays.js'
import EditorActions from '../EditorActions.jsx'
import ReorderButtons from '../ReorderButtons.jsx'

// create / edit one cycle: a name and an ordered list of plans (the same plan can appear more than once).
// It edits a draft; nothing is saved until you press Save.
export default function CycleEditor({ initial, plans, onSave, onCancel, onDelete }) {
  const [draft, setDraft] = useState(initial)
  const steps = draft.steps
  const setSteps = (next) => setDraft({ ...draft, steps: next })
  const valid = draft.name.trim() !== '' && steps.length > 0

  return (
    <form
      className="pe surface"
      onSubmit={(e) => {
        e.preventDefault()
        if (valid) onSave({ id: draft.id, name: draft.name.trim().slice(0, 60), steps })
      }}
    >
      <h2 className="pv-title">{onDelete ? 'Edit cycle' : 'New cycle'}</h2>
      <label className="pe-label" htmlFor="cycle-name">
        Cycle name
      </label>
      <input id="cycle-name" className="pe-input" value={draft.name} maxLength={60} placeholder="e.g. Push / Pull / Legs" autoFocus={!onDelete} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />

      <h3 className="pe-sub">Days in the cycle, in order</h3>
      {plans.length === 0 ? (
        <p className="pe-hint">
          You need at least one plan first. <a href="#/workouts/plans">Create a plan</a>.
        </p>
      ) : (
        <>
          <ol className="ce-steps">
            {steps.map((id, i) => (
              <li key={i}>
                <span className="ce-n">Day {i + 1}</span>
                <select className="pe-input chevron" aria-label={`Day ${i + 1} plan`} value={id} onChange={(e) => setSteps(replaceAt(steps, i, e.target.value))}>
                  {plans.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name || 'Untitled plan'}
                    </option>
                  ))}
                </select>
                <ReorderButtons index={i} count={steps.length} onMove={(d) => setSteps(moveItem(steps, i, d))} onRemove={() => setSteps(removeAt(steps, i))} removeLabel="Remove day" />
              </li>
            ))}
          </ol>
          <button type="button" className="btn btn-sm" onClick={() => setSteps([...steps, plans[Math.min(steps.length, plans.length - 1)].id])}>
            + Add day
          </button>
          <p className="pe-hint">When the last day is done, the cycle starts again from Day 1.</p>
        </>
      )}

      <EditorActions what="cycle" valid={valid} onCancel={onCancel} onDelete={onDelete} />
    </form>
  )
}
