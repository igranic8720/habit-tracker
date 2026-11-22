import { COLORS, habitColor } from '../../lib/habits.js'
import Swatch from '../shared/Swatch.jsx'
import HabitMenu from './HabitMenu.jsx'
import './HabitTitle.css'

// the card's top row: colour dot, editable name, log toggle, options menu
export default function HabitTitle({ habit, onChange, logOpen, onToggleLog, noteCount, onArchive }) {
  const nextColor = () => {
    const i = COLORS.indexOf(habitColor(habit))
    onChange({ ...habit, color: COLORS[(i + 1) % COLORS.length] })
  }
  return (
    <div className="title">
      <Swatch onClick={nextColor} />
      <input
        className="name"
        value={habit.name}
        placeholder="Name this habit…"
        aria-label="Habit name"
        maxLength={60}
        onChange={(e) => onChange({ ...habit, name: e.target.value })}
      />
      <button className="notes-toggle" aria-expanded={logOpen} onClick={onToggleLog}>
        {logOpen ? '▾' : '▸'} Log{noteCount > 0 ? ` (${noteCount})` : ''}
      </button>
      <HabitMenu onArchive={onArchive} />
    </div>
  )
}
