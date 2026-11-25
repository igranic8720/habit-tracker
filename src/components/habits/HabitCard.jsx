import { useRef, useState } from 'react'
import { YEAR, todayKey } from '../../lib/dates.js'
import { habitColor } from '../../lib/habits.js'
import DayDetail from '../calendar/DayDetail.jsx'
import Heatmap from '../calendar/Heatmap.jsx'
import HabitTitle from './HabitTitle.jsx'
import NotesLog from '../calendar/NotesLog.jsx'
import TodayNote from '../shared/TodayNote.jsx'
import './HabitCard.css'

// one habit: title row, today's note + done button, the year heatmap, and the day / log panels
export default function HabitCard({ habit, year, onChange, onArchive }) {
  const [logOpen, setLogOpen] = useState(false)
  const [selected, setSelected] = useState(null) // a clicked past day, opened to read its note (past notes are locked)
  const todayRef = useRef(null) // the always-visible note box for today

  const done = new Set(habit.days)
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

  const toggleDone = (key) => {
    const next = new Set(done)
    if (next.has(key)) next.delete(key)
    else next.add(key)
    onChange({ ...habit, days: [...next] })
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
        onChange={onChange}
        logOpen={logOpen}
        onToggleLog={() => setLogOpen(!logOpen)}
        noteCount={noteCount}
        onArchive={onArchive}
      />

      {year === YEAR && (
        <TodayNote
          inputRef={todayRef}
          note={notes[todayKey] ?? ''}
          done={done.has(todayKey)}
          onNote={(text) => setNote(todayKey, text)}
          onToggle={() => toggleDone(todayKey)}
        />
      )}

      <h3 className="summary">
        <strong>{total}</strong> {total === 1 ? 'day' : 'days'} tracked in {year}
      </h3>

      <Heatmap habit={habit} year={year} selected={sel} onPick={pickDay} />

      {sel && <DayDetail dateKey={sel} done={done.has(sel)} note={notes[sel]} onClose={() => setSelected(null)} />}

      {logOpen && <NotesLog entries={log} onPick={setSelected} />}
    </section>
  )
}
