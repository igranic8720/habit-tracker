import { useState } from 'react'
import { fromKey } from '../../../lib/format.js'
import { cycleStatus, newCycle, planColor } from '../../../lib/plans.js'
import CycleEditor from './CycleEditor.jsx'
import '../manage.css'

// the Cycles tab: plans grouped in a repeating order; one cycle at a time can be active (it decides what is "up next" each day)
export default function CyclesView({ w }) {
  const [editing, setEditing] = useState(null)
  const exists = editing && w.cycles.some((c) => c.id === editing.id)

  if (editing) {
    return (
      <CycleEditor
        initial={editing}
        plans={w.plans}
        onSave={(c) => {
          w.saveCycle(c)
          if (!w.cycles.length && !w.active) w.setActive(c.id) // your first cycle starts out active
          setEditing(null)
        }}
        onCancel={() => setEditing(null)}
        onDelete={
          exists
            ? () => {
                if (confirm(`Delete the cycle “${editing.name}”? Your plans and logged workouts are kept.`)) {
                  w.removeCycle(editing.id)
                  setEditing(null)
                }
              }
            : undefined
        }
      />
    )
  }

  return (
    <section className="pv surface" aria-label="Cycles">
      <div className="pv-head">
        <h2 className="pv-title">Cycles</h2>
        <button type="button" className="btn" onClick={() => setEditing(newCycle())}>
          + New cycle
        </button>
      </div>
      <p className="pv-hint">A cycle is a group of plans in a repeating order, such as Push, Pull, Legs. The active cycle suggests what to train next.</p>
      {w.cycles.length === 0 ? (
        <p className="pv-empty">{w.plans.length ? 'No cycles yet. Create one from your plans.' : 'No cycles yet. Start by creating a few plans, then group them here.'}</p>
      ) : (
        <ul className="pv-list">
          {w.cycles.map((c) => {
            const active = w.active === c.id
            const status = cycleStatus(c, w.plans, w.log)
            return (
              <li key={c.id} className={active ? 'is-active' : ''}>
                <div className="pv-main">
                  <strong>
                    {c.name} {active && <span className="pv-badge">Active</span>}
                  </strong>
                  <ol className="cv-steps">
                    {c.steps.map((id, i) => {
                      const plan = w.plans.find((p) => p.id === id)
                      return (
                        <li key={i} className={active && status.next?.step === i ? 'next' : ''} data-color={plan ? planColor(plan) : undefined}>
                          <span className="dot" /> {i + 1}. {plan ? plan.name || 'Untitled plan' : 'Deleted plan'}
                        </li>
                      )
                    })}
                  </ol>
                  <span className="pv-use">
                    {status.next ? (active ? `Up next: ${status.next.plan.name} (day ${status.next.step + 1} of ${c.steps.length})` : `${c.steps.length} ${c.steps.length === 1 ? 'day' : 'days'}`) : 'No plans in this cycle yet'}
                    {status.last && ` · last trained ${fromKey(status.last.key).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`}
                  </span>
                </div>
                <div className="pv-buttons">
                  <button type="button" className="btn btn-sm" aria-pressed={active} onClick={() => w.setActive(active ? null : c.id)}>
                    {active ? '✓ Active' : 'Make active'}
                  </button>
                  <button type="button" className="btn btn-sm" onClick={() => setEditing(structuredClone(c))}>
                    Edit
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
