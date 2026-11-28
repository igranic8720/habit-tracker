import { useRef, useState } from 'react'
import { YEAR, todayKey } from '../../lib/dates.js'
import { checkedTime, habitColor, habitName, isCheck, toggleCheck } from '../../lib/habits.js'
import DayDetail from '../calendar/DayDetail.jsx'
import Heatmap from '../calendar/Heatmap.jsx'
import HabitTitle from './HabitTitle.jsx'
import NotesLog from '../calendar/NotesLog.jsx'
import TodayNote from '../shared/TodayNote.jsx'
import TimerButton from '../time/TimerButton.jsx'
import HabitGoal from './HabitGoal.jsx'
import CheckButton from './CheckButton.jsx'
import { CheckSquareOutlined } from '@ant-design/icons'
import { useNow } from '../../hooks/useNow.js'
import { habitTimeOn } from '../../lib/time.js'
import './HabitCard.css'

// one habit: title row, its daily target and today's progress (a checklist habit: just what it is), today's note + its timer or
// tick, the year heatmap, and the day / log panels. A timed habit's day is done once its tracked time reaches the target; a
// checklist habit's once you tick it off (habit.days is worked out from either). The kind is set when the habit is added.
export default function HabitCard({ habit, year, time, taken, onChange, onArchive }) {
  const [logOpen, setLogOpen] = useState(false)
  const [selected, setSelected] = useState(null) // a clicked past day, opened to read its note (past notes are locked)
  const todayRef = useRef(null) // the always-visible note box for today

  const done = new Set(habit.days)
  const timing = time?.running?.kind === 'habit' && time.running.ref === habit.id
  const now = useNow(timing, 5000) // the progress bar moves while it is being timed
  const todayMs = habitTimeOn(habit, todayKey, time?.running, now)
  const check = isCheck(habit)
  const doneToday = check ? done.has(todayKey) : habit.target > 0 && todayMs >= habit.target * 60000 // (live, a little ahead of habit.days)
  const notes = habit.notes ?? {}
  const inYear = (k) => k.startsWith(`${year}-`)
  const total = habit.days.filter(inYear).length
  const noteCount = Object.keys(notes).filter(inYear).length
  const log = Object.entries(notes)
    .filter(([k]) => inYear(k) && !(year === YEAR && k === todayKey))
    .sort(([a], [b]) => b.localeCompare(a))
  const sel = selected && inYear(selected) && selected <= todayKey ? selected : null

  // an empty note removes the entry so the file stays tidy
  const setNote = (key, text) => {
    const next = { ...notes }
    if (text.trim()) next[key] = text
    else delete next[key]
    onChange({ ...habit, notes: next })
  }

  // today's square jumps to the note box; any other day opens (or closes) its read-only panel
  const pickDay = (key) => {
    if (key === todayKey) {
      setSelected(null)
      todayRef.current?.focus()
    } else setSelected(key === sel ? null : key)
  }

  return (
    <section className="card surface habit-color" data-color={habitColor(habit)}>
      <HabitTitle
        habit={habit}
        taken={taken}
        onChange={onChange}
        logOpen={logOpen}
        onToggleLog={() => setLogOpen(!logOpen)}
        noteCount={noteCount}
        onArchive={onArchive}
      />

      {year === YEAR &&
        (check ? (
          <div className={`goal${doneToday ? ' is-done' : ''}`}>
            <span className="goal-kind"><CheckSquareOutlined /> Checklist</span>
            <span className="goal-text goal-check">{doneToday ? `Done today at ${checkedTime(habit, todayKey)}` : 'Tick it off once you’ve done it today'}</span>
          </div>
        ) : (
          <HabitGoal habit={habit} ms={todayMs} done={doneToday} onTarget={(target) => onChange({ ...habit, target })} />
        ))}

      {year === YEAR && (
        <TodayNote
          inputRef={todayRef}
          note={notes[todayKey] ?? ''}
          onNote={(text) => setNote(todayKey, text)}
          extra={
            check ? (
              <CheckButton done={doneToday} label={habitName(habit)} onToggle={() => onChange({ ...habit, ...toggleCheck(habit, todayKey) })} />
            ) : (
            <TimerButton
              t={time}
              what={{ kind: 'habit', ref: habit.id, label: habitName(habit), color: habitColor(habit) }}
              blocked={habit.target ? null : 'Choose a daily target first'}
            />
            )
          }
        />
      )}

      <h3 className="summary">
        <strong>{total}</strong> {total === 1 ? 'day' : 'days'} done in {year}
      </h3>

      <Heatmap habit={habit} year={year} selected={sel} onPick={pickDay} />

      {sel && <DayDetail dateKey={sel} done={done.has(sel)} at={check ? checkedTime(habit, sel) : null} note={notes[sel]} onClose={() => setSelected(null)} />}

      {logOpen && <NotesLog entries={log} onPick={setSelected} />}
    </section>
  )
}
