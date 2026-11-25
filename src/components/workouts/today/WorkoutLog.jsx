import { useId, useState } from 'react'
import { addedSet, changeSet, nextSet, openCount, prIndexes } from '../../../lib/session.js'
import { hasSets, setCount, setTotal, topSet, workText } from '../../../lib/workouts.js'
import ExerciseEntry from './ExerciseEntry.jsx'
import './WorkoutLog.css'

// the set editor for today's session: exercises, each with sets of weight × reps, and a tick on each set when you have done it.
// Only ticked sets count (towards the day, the heatmap and the graphs). Past days are read-only (see WorkoutDay).
// onTicked(setsLeft) is called when a set is ticked, so the page can start the rest timer.
export default function WorkoutLog({ color, title, tag, action, entries, names, lastTime, bestBefore, onChange, onTicked }) {
  const listId = useId()
  const [draft, setDraft] = useState('')
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
    if (on) onTicked?.(open - 1)
  }
  const tickAll = (i) => {
    const sets = entries[i].sets
    const all = sets.every((s) => s.done !== false)
    setSets(i, (ss) => ss.map((s) => ({ ...s, done: !all })))
    if (!all) onTicked?.(open - sets.filter((s) => s.done === false).length)
  }
  const removeExercise = (i) => {
    const e = entries[i]
    if (e.sets.some((s) => s.done !== false && s.reps > 0) && !confirm(`Remove ${e.exercise || 'this exercise'} and the sets you ticked?`)) return
    onChange(entries.filter((_, k) => k !== i))
  }
  // a new exercise starts from last time's best set, spelled the way you spelled it before
  const addExercise = (raw) => {
    const typed = raw.trim().slice(0, 80)
    if (!typed) return
    const name = names.find((n) => n.toLowerCase() === typed.toLowerCase()) ?? typed
    const prev = lastTime(name)
    const start = prev ? topSet(prev) : { weight: 0, reps: 0 }
    onChange([...entries, { exercise: name, sets: [{ weight: start.weight, reps: start.reps, done: false }] }])
    setDraft('')
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
            {logged ? `✓ ${done} of ${total} sets done · ${workText(entries)}` : total ? `${total} ${total === 1 ? 'set' : 'sets'} to do · tick each one as you finish it` : 'Nothing logged yet'}
          </span>
        </div>
      </div>

      {total > 0 && open === 0 && logged && (
        <p className="wl-complete" role="status">
          <strong>Workout complete</strong> · {done} {done === 1 ? 'set' : 'sets'} · {workText(entries)}
          {prCount > 0 && ` · ${prCount} ${prCount === 1 ? 'PR' : 'PRs'}`}
        </p>
      )}

      {entries.map((e, i) => (
        <ExerciseEntry
          key={i}
          entry={e}
          listId={listId}
          lastSets={lastTime(e.exercise)}
          nextJ={next?.i === i ? next.j : -1}
          prJ={prs[i]}
          onRename={(exercise) => setEntry(i, { exercise })}
          onRemove={() => removeExercise(i)}
          onSet={(j, patch) => setSets(i, (sets) => changeSet(sets, j, patch))}
          onTick={(j) => tick(i, j)}
          onRemoveSet={(j) => setSets(i, (sets) => sets.filter((_, k) => k !== j))}
          onAddSet={() => setSets(i, (sets) => [...sets, addedSet(sets, lastTime(e.exercise))])}
          onTickAll={() => tickAll(i)}
        />
      ))}

      <form
        className="wl-add"
        onSubmit={(ev) => {
          ev.preventDefault()
          addExercise(draft)
        }}
      >
        <input className="wl-new" list={listId} value={draft} maxLength={80} placeholder="Add an exercise…" aria-label="Add an exercise" enterKeyHint="done" onChange={(ev) => setDraft(ev.target.value)} />
        <button type="submit" className="btn btn-sm" disabled={!draft.trim()}>
          Add
        </button>
      </form>
      <datalist id={listId}>
        {names.map((n) => (
          <option key={n} value={n} />
        ))}
      </datalist>
    </div>
  )
}
