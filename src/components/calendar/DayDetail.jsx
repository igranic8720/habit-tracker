import { fromKey } from '../../lib/format.js'
import './DayDetail.css'
import { CheckOutlined, CloseOutlined } from '@ant-design/icons'

// read-only panel for a clicked past day: its date (and the workout's name), whether it was done, anything else the
// page passes in (the workout's sets), and the note
export default function DayDetail({ dateKey, done, note, name, onClose, children }) {
  return (
    <div className="day">
      <div className="day-head">
        <span className="day-label">
          {fromKey(dateKey).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
          {name && <> · {name}</>}
        </span>
        <span className={`day-status${done ? ' yes' : ''}`}>{done ? <><CheckOutlined /> done</> : 'not done'}</span>
        <button className="day-close" aria-label="Close" onClick={onClose}>
          <CloseOutlined />
        </button>
      </div>
      {children}
      {(note || !children) && <p className={`day-note${note ? '' : ' empty'}`}>{note ?? 'No note for this day.'}</p>}
    </div>
  )
}
