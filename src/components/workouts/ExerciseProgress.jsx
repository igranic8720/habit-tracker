import { UNIT, progress, setText } from '../../lib/workouts.js'
import { fromKey } from '../../lib/format.js'
import './ExerciseProgress.css'

const day = (k) => fromKey(k).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })

// per-exercise progress: best set ever, the latest session, and the change since the session before it
export default function ExerciseProgress({ habit }) {
  const rows = progress(habit)
  if (!rows.length) return null
  return (
    <details className="prog">
      <summary>Progress by exercise ({rows.length})</summary>
      <div className="prog-scroll">
        <table>
          <thead>
            <tr>
              <th>Exercise</th>
              <th>Best</th>
              <th>Latest</th>
              <th>Change</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.name}>
                <th scope="row">
                  {r.name}
                  <span>{r.sessions} {r.sessions === 1 ? 'session' : 'sessions'}</span>
                </th>
                <td title={`Set on ${day(r.best.key)}`}>{setText(r.best.top)}</td>
                <td title={`Session on ${day(r.last.key)}`}>{setText(r.last.top)}</td>
                <td className={r.change ? `chg${r.change.dir > 0 ? ' up' : r.change.dir < 0 ? ' down' : ''}` : 'chg'}>
                  {r.change ? `${r.change.dir > 0 ? '▲ ' : r.change.dir < 0 ? '▼ ' : ''}${r.change.text}` : '–'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="prog-note">Top set per session in {UNIT} × reps. Best = heaviest set ever (ties: more reps).</p>
    </details>
  )
}
