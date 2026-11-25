import { fromKey } from '../../lib/format.js'
import './NotesLog.css'

// earlier notes for the year, newest first; clicking one opens its read-only day panel
export default function NotesLog({ entries, onPick }) {
  return (
    <div className="notes">
      {entries.length > 0 ? (
        <ul className="log">
          {entries.map(([k, text]) => (
            <li key={k}>
              <button className="log-row" title="View this note" onClick={() => onPick(k)}>
                <time dateTime={k}>{fromKey(k).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</time>
                <span>{text}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="log-empty">Nothing logged on earlier days yet.</p>
      )}
    </div>
  )
}
