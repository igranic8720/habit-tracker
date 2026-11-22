import { fromKey } from '../../lib/format.js'
import './DayDetail.css'

// read-only panel for a clicked past day: its date, whether it was done, and its note
export default function DayDetail({ dateKey, done, note, onClose }) {
  return (
    <div className="day">
      <div className="day-head">
        <span className="day-label">
          {fromKey(dateKey).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
        </span>
        <span className={`day-status${done ? ' yes' : ''}`}>{done ? '✓ done' : 'not done'}</span>
        <button className="day-close" aria-label="Close" onClick={onClose}>
          ✕
        </button>
      </div>
      <p className={`day-note${note ? '' : ' empty'}`}>{note ?? 'No note for this day.'}</p>
    </div>
  )
}
