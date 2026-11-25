import { habitColor, habitName } from '../../lib/habits.js'
import { plural } from '../../lib/format.js'
import Swatch from '../shared/Swatch.jsx'
import './ArchivedList.css'

// archived habits, each with Unarchive and (confirmed) permanent Delete
export default function ArchivedList({ habits, onRestore, onDelete }) {
  return (
    <section className="archived surface" aria-label="Archived habits">
      <h2>Archived</h2>
      <ul>
        {habits.map((h) => {
          const name = habitName(h)
          return (
            <li key={h.id} className="habit-color" data-color={habitColor(h)}>
              <Swatch />
              <span className="a-name">{name}</span>
              <span className="a-meta">{plural(h.days.length, 'day')} logged</span>
              <button className="btn btn-sm" onClick={() => onRestore(h)}>
                Unarchive
              </button>
              <button
                className="btn btn-sm btn-danger"
                onClick={() => {
                  if (confirm(`Permanently delete "${name}" and all its history? This can't be undone.`)) onDelete(h)
                }}
              >
                Delete
              </button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
