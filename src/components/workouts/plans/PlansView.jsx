import { useState } from 'react'
import { fromKey } from '../../../lib/format.js'
import { newId } from '../../../lib/habits.js'
import { newPlan, planColor, planLine, planUse } from '../../../lib/plans.js'
import ColorPicker from '../../shared/ColorPicker.jsx'
import PlanEditor from './PlanEditor.jsx'
import '../manage.css'

// the Plans tab: your named workouts, and where you create and edit them
export default function PlansView({ w, names, hasSessionToday, onDo }) {
  const [editing, setEditing] = useState(null) // a plan being created / edited, or null
  const exists = editing && w.plans.some((p) => p.id === editing.id)

  if (editing) {
    return (
      <PlanEditor
        initial={editing}
        names={names}
        onSave={(p) => {
          w.savePlan(p)
          setEditing(null)
        }}
        onCancel={() => setEditing(null)}
        onDelete={
          exists
            ? () => {
                if (confirm(`Delete the plan “${editing.name || 'Untitled plan'}”? It is also removed from any cycle. Workouts you already did stay in your log.`)) {
                  w.removePlan(editing.id)
                  setEditing(null)
                }
              }
            : undefined
        }
      />
    )
  }

  return (
    <section className="pv surface" aria-label="Plans">
      <div className="pv-head">
        <h2 className="pv-title">Plans</h2>
        <button type="button" className="btn" onClick={() => setEditing(newPlan(w.plans))}>
          + New plan
        </button>
      </div>
      <p className="pv-hint">A plan is a named workout for a day: its exercises, sets and reps. Choose one on the Today tab, or put several in a cycle.</p>
      {w.plans.length === 0 ? (
        <p className="pv-empty">No plans yet. Create one, for example “Push day”.</p>
      ) : (
        <ul className="pv-list">
          {w.plans.map((p) => {
            const use = planUse(p.id, w.log)
            return (
              <li key={p.id} data-color={planColor(p)}>
                <div className="pv-main">
                  <span className="pv-name">
                    <ColorPicker value={planColor(p)} onChange={(color) => w.savePlan({ ...p, color })} />
                    <strong>{p.name || 'Untitled plan'}</strong>
                  </span>
                  <span className="pv-line">{planLine(p)}</span>
                  <span className="pv-use">
                    {use.times ? `Done ${use.times}× · last ${fromKey(use.last).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}` : 'Not done yet'}
                  </span>
                </div>
                <div className="pv-buttons">
                  <button type="button" className="btn btn-sm" disabled={hasSessionToday} title={hasSessionToday ? 'Today already has a workout: change it on the Today tab first' : 'Start this plan today'} onClick={() => onDo(p)}>
                    Do today
                  </button>
                  <button type="button" className="btn btn-sm" onClick={() => setEditing(structuredClone(p))}>
                    Edit
                  </button>
                  <button type="button" className="btn btn-sm" onClick={() => setEditing({ ...structuredClone(p), id: newId(), name: `${p.name} copy`.slice(0, 60), color: newPlan(w.plans).color })}>
                    Copy
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
