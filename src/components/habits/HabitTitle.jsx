import { habitColor } from '../../lib/habits.js'
import ColorPicker from '../shared/ColorPicker.jsx'
import HabitMenu from './HabitMenu.jsx'
import './HabitTitle.css'

// the card's top row: colour dot, editable name, log toggle, options menu
export default function HabitTitle({ habit, onChange, logOpen, onToggleLog, noteCount, onArchive }) {
  return (
    <div className="title">
      <ColorPicker value={habitColor(habit)} onChange={(color) => onChange({ ...habit, color })} />
      <input
        className="name"
        value={habit.name}
        placeholder={habit.type === 'strength' ? 'Name this workout…' : 'Name this habit…'}
        aria-label="Habit name"
        maxLength={60}
        onChange={(e) => onChange({ ...habit, name: e.target.value })}
      />
      <button className="notes-toggle" aria-expanded={logOpen} onClick={onToggleLog}>
        {logOpen ? '▾' : '▸'} Log{noteCount > 0 ? ` (${noteCount})` : ''}
      </button>
      {onArchive && <HabitMenu onArchive={onArchive} />}
    </div>
  )
}
