import { useState } from 'react'
import { resolveStep } from '../../../lib/plans.js'
import CycleDayCard from './CycleDayCard.jsx'
import './WorkoutChooser.css'

// the top of Today until a workout is loaded: the active cycle's days ("up next" / "today" marked; any day is one tap to load)
// and a picker for any other plan (a workout is always a plan's: its exercises can't be added to). Which cycle is active is chosen on
// the Cycles tab.
export default function WorkoutChooser({ w, cycle, status, session, onLoad, onCancel }) {
  const [pick, setPick] = useState('')
  const todayStep = session && cycle && session.cycle === cycle.id ? resolveStep(cycle, session) : -1

  return (
    <div className="wc">
      <div className="wc-top">
        <h3 className="wc-title">{session ? 'Change today’s plan' : 'What are you training today?'}</h3>
        {onCancel && (
          <button type="button" className="btn btn-sm" onClick={onCancel}>
            Cancel
          </button>
        )}
      </div>

      {cycle ? (
        <section className="wc-cycle" aria-label={`Cycle: ${cycle.name}`}>
          <div className="wc-cycle-head">
            <span>
              Cycle <strong>{cycle.name}</strong>
            </span>
            <a href="#/workouts/cycles">Change in Cycles</a>
          </div>
          {status.steps.length > 0 ? (
            <ol className="wc-days">
              {status.steps.map(({ step, plan }) => (
                <CycleDayCard
                  key={step}
                  plan={plan}
                  step={step}
                  count={cycle.steps.length}
                  today={step === todayStep}
                  next={todayStep < 0 && status.next?.step === step}
                  onLoad={() => onLoad(plan, step)}
                />
              ))}
            </ol>
          ) : (
            <p className="wc-hint">
              “{cycle.name}” has no plans in it yet. Add some under <a href="#/workouts/cycles">Cycles</a>.
            </p>
          )}
        </section>
      ) : (
        <p className="wc-hint">
          {w.cycles.length ? 'No cycle is active. ' : ''}
          <a href="#/workouts/cycles">{w.cycles.length ? 'Make one active in Cycles' : 'Group your plans into a cycle'}</a>
          {w.cycles.length ? ' to see which day is up next.' : ' (for example Push, Pull, Legs) and the day that is up next shows here.'}
        </p>
      )}

      <div className="wc-other">
        <label htmlFor="wc-plan">{cycle ? 'Or load any plan' : 'Load a plan'}</label>
        <div className="wc-row">
          <select id="wc-plan" className="wc-select chevron" value={pick} onChange={(e) => setPick(e.target.value)}>
            <option value="">{w.plans.length ? 'Choose a plan…' : 'No plans yet'}</option>
            {w.plans.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name || 'Untitled plan'}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="btn"
            disabled={!pick}
            onClick={() => {
              onLoad(w.plans.find((p) => p.id === pick))
              setPick('')
            }}
          >
            Load
          </button>
        </div>
        {w.plans.length === 0 && (
          <p className="wc-hint">
            A plan is a reusable workout you set up once. <a href="#/workouts/plans">Create your first plan</a>.
          </p>
        )}
      </div>
    </div>
  )
}
