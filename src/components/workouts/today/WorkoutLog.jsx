import { changeSet, nextSet, openCount, prIndexes } from '../../../lib/session.js'
import { hasSets, isClimb, setCount, setTotal, workText } from '../../../lib/workouts.js'
import ExerciseEntry from './ExerciseEntry.jsx'
import './WorkoutLog.css'
import { CheckOutlined } from '@ant-design/icons'

// the set editor for today's session: the plan's exercises (none can be added on the day), each with its sets, and a tick on each
// set when you have done it.
// Only ticked sets count (towards the day, the heatmap and the graphs). Past days are read-only (see WorkoutDay).
// onTicked(setsLeft, i) is called when a set of exercise i is ticked, so the page can start the rest timer (that exercise's rest).
// locked: nothing can be typed or ticked yet (the workout hasn't been started); gate is shown above the locked sets instead.
// activeOn: the timed set whose time on is running ({ i, j }); onTimeOn(i, j) / onStopOn start and stop one (the countdown is the page's).
export default function WorkoutLog({ color, title, tag, action, entries, lastTime, bestBefore, onChange, onTicked, activeOn, onTimeOn, onStopOn, locked = false, gate }) {
  const logged = hasSets(entries)
  const done = setCount(entries)
  const total = setTotal(entries)
  const open = openCount(entries)
  const next = nextSet(entries)
  const prs = prIndexes(entries, bestBefore)
  const prCount = prs.filter((j) => j >= 0).length

  const setEntry = (i, patch) => onChange(entries.map((e, k) => (k === i ? { ...e, ...patch } : e)))
  const setSets = (i, fn) => setEntry(i, { sets: fn(entries[i].sets) })
  const tick = (i, j) => {
    const on = entries[i].sets[j].done === false
    setSets(i, (sets) => changeSet(sets, j, { done: on }))
    if (on) onTicked?.(open - 1, i)
  }
  // a climb is logged in one go: sent or not, and done (a second press of the same answer un-logs it)
  const logClimb = (i, j, sent) => {
    const s = entries[i].sets[j]
    if (s.done !== false && s.sent === sent) return setSets(i, (sets) => changeSet(sets, j, { done: false }))
    setSets(i, (sets) => changeSet(sets, j, { sent, done: true }))
    if (s.done === false) onTicked?.(open - 1, i)
  }
  const tickAll = (i) => {
    const sets = entries[i].sets
    const all = sets.every((s) => s.done !== false)
    setSets(i, (ss) => ss.map((s) => ({ ...s, done: !all })))
    if (!all) onTicked?.(open - sets.filter((s) => s.done === false).length, i)
  }
  const removeExercise = (i) => {
    const e = entries[i]
    if (e.sets.some((s) => s.done !== false && (isClimb(s) || s.reps > 0)) && !confirm(`Remove ${e.exercise || 'this exercise'} and the sets you ticked?`)) return
    onChange(entries.filter((_, k) => k !== i))
  }


  return (
    <div className="wl" data-color={color}>
      <div className="wl-head">
        <strong>
          <span className="dot" /> {title}
        </strong>
        {action && <span className="wl-action">{action}</span>}
        <div className="wl-sub">
          {tag && <span className="wl-tag">{tag}</span>}
          <span className={`wl-sum${logged ? ' yes' : ''}`}>
            {logged ? <><CheckOutlined /> {done} of {total} sets done · {workText(entries)}</> : total ? `${total} ${total === 1 ? 'set' : 'sets'} to do · tick each one as you finish it` : 'Nothing logged yet'}
          </span>
        </div>
      </div>

      {total > 0 && open === 0 && logged && (
        <p className="wl-complete" role="status">
          <strong>Workout complete</strong> · {done} {done === 1 ? 'set' : 'sets'} · {workText(entries)}
          {prCount > 0 && ` · ${prCount} ${prCount === 1 ? 'PR' : 'PRs'}`}
        </p>
      )}

      {locked && gate}

      <fieldset className="wl-body" disabled={locked}>
      {entries.map((e, i) => (
        <ExerciseEntry
          key={i}
          entry={e}
          lastSets={lastTime(e.exercise)}
          nextJ={next?.i === i ? next.j : -1}
          prJ={prs[i]}
          onRemove={() => removeExercise(i)}
          onSet={(j, patch) => setSets(i, (sets) => changeSet(sets, j, patch))}
          onTick={(j) => tick(i, j)}
          onRemoveSet={(j) => setSets(i, (sets) => sets.filter((_, k) => k !== j))}
          onTickAll={() => tickAll(i)}
          onClimb={(j, sent) => logClimb(i, j, sent)}
          activeJ={activeOn?.i === i ? activeOn.j : -1}
          onTimeOn={(j) => onTimeOn?.(i, j)}
          onStopOn={onStopOn}
        />
      ))}

      </fieldset>
    </div>
  )
}
