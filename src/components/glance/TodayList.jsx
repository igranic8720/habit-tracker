import { useNow } from '../../hooks/useNow.js'
import { todayKey } from '../../lib/dates.js'
import { habitColor, habitName, targetText } from '../../lib/habits.js'
import { planColor } from '../../lib/plans.js'
import { breakdown, duration, habitTimeOn } from '../../lib/time.js'
import { isComplete, setCount, setTotal } from '../../lib/workouts.js'
import Panel from '../shared/Panel.jsx'
import TimerButton from '../time/TimerButton.jsx'
import TodayNote from '../shared/TodayNote.jsx'
import './glance.css'
import { CheckOutlined } from '@ant-design/icons'

// a ring that fills as the day's progress goes (pct 0-100), with a tick once it's done
function Ring({ pct, done, label }) {
  return (
    <span className={`glance-ring${done ? ' on' : ''}`} style={{ '--p': `${done ? 100 : Math.min(99, pct)}%` }} role="img" aria-label={label}>
      {done && <CheckOutlined />}
    </span>
  )
}

// today in one list: every habit (how far it is towards its daily target, its timer) and today's workout (sets ticked).
// Nothing is marked by hand: a habit is done once today's tracked time reaches its target, a workout once every set is ticked.
// Whatever is being timed moves to the top, with today's note open under it (the same note as on its own page).
export default function TodayList({ habits, segs, time, workout, plans, onHabitNote, onWorkoutNote }) {
  const timing = time.running?.kind === 'habit'
  const now = useNow(timing, 5000)
  const parts = breakdown(segs)
  const workoutMs = parts.filter((p) => p.id.startsWith('workout:')).reduce((n, p) => n + p.ms, 0)
  const rows = habits.map((h) => {
    const ms = habitTimeOn(h, todayKey, time.running, now)
    const goal = (h.target ?? 0) * 60000
    return { h, ms, goal, done: goal > 0 && ms >= goal }
  })
  const doneCount = rows.filter((r) => r.done).length
  const plan = workout && plans.find((p) => p.id === workout.plan)
  const sets = workout ? setTotal(workout.entries) : 0
  const ticked = workout ? setCount(workout.entries) : 0
  const workoutDone = !!workout && isComplete(workout.entries)
  const runningHabit = time.running?.kind === 'habit' ? time.running.ref : null
  const workoutRunning = time.running?.kind === 'workout'
  const ordered = [...rows].sort((a, b) => (b.h.id === runningHabit) - (a.h.id === runningHabit)) // the one being timed first
  const note = (value, onNote, label) => (
    <div className="glance-note">
      <TodayNote note={value ?? ''} onNote={onNote} label={label} />
    </div>
  )

  return (
    <Panel title="Today’s habits" label="Today’s habits">
      <p className="glance-sum">
        <strong>{doneCount}</strong> of {habits.length} {habits.length === 1 ? 'habit' : 'habits'} done
      </p>
      <ul className="glance-list">
        {ordered.map(({ h, ms, goal, done }) => (
          <li key={h.id} className={`${done ? 'is-done' : ''}${h.id === runningHabit ? ' is-running' : ''}`} data-color={habitColor(h)}>
            <Ring pct={goal ? (ms / goal) * 100 : 0} done={done} label={done ? 'Done today' : goal ? `${Math.floor((ms / goal) * 100)}% of today’s target` : 'No daily target yet'} />
            <div className="glance-what">
              <strong>{habitName(h)}</strong>
              <span>
                {!goal ? <a href="#/habits">Choose a daily target</a> : done ? `Done · ${duration(ms)}` : `${ms ? duration(ms) : '0m'} of ${targetText(h.target)}`}
              </span>
            </div>
            <TimerButton t={time} what={{ kind: 'habit', ref: h.id, label: habitName(h), color: habitColor(h) }} compact blocked={goal ? null : 'Choose a daily target first'} />
            {h.id === runningHabit && note(h.notes?.[todayKey], (text) => onHabitNote(h, text), `Note for ${habitName(h)} today`)}
          </li>
        ))}
        {habits.length === 0 && (
          <li className="glance-empty">
            No habits yet. <a href="#/habits">Add one</a>
          </li>
        )}
        <li className={`glance-workout${workoutDone ? ' is-done' : ''}${workoutRunning ? ' is-running' : ''}`} data-color={workout ? planColor(plan) : 'gray'}>
          {workout ? <Ring pct={sets ? (ticked / sets) * 100 : 0} done={workoutDone} label={workoutDone ? 'Workout done' : `${ticked} of ${sets} sets`} /> : <span className="glance-icon" aria-hidden="true"><i className="dot" /></span>}
          <div className="glance-what">
            <strong>{workout ? workout.name || 'Workout' : 'No workout today'}</strong>
            <span>
              {workout
                ? [workoutDone ? 'Done' : sets ? `${ticked} of ${sets} sets` : null, workoutMs ? `${duration(workoutMs)} today` : null].filter(Boolean).join(' · ') || 'Not started'
                : 'Pick a plan or start one freestyle'}
            </span>
          </div>
          {workout && <TimerButton t={time} what={{ kind: 'workout', ref: null, label: workout.name || 'Workout', color: planColor(plan) }} compact />}
          <a className="btn btn-sm" href="#/workouts">{workout ? 'Open' : 'Choose'}</a>
          {workout && workoutRunning && note(workout.note, onWorkoutNote, `Note for ${workout.name || 'the workout'} today`)}
        </li>
      </ul>
    </Panel>
  )
}
