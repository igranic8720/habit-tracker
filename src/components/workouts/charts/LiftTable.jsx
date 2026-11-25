import { UNIT, setText } from '../../../lib/workouts.js'

// the lift graph's table twin: every session of the lift this year, newest first
export default function LiftTable({ series, day }) {
  return (
    <details className="table-view">
      <summary>Table view</summary>
      <div className="tv-scroll">
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Sets</th>
              <th>Top set</th>
              <th>Est. 1RM</th>
            </tr>
          </thead>
          <tbody>
            {[...series].reverse().map((s) => (
              <tr key={s.key}>
                <td>{day(s.key)}</td>
                <td>{s.sets.map(setText).join(', ')}</td>
                <td>{setText(s.top)}</td>
                <td>{s.top.weight ? `${Math.round(s.est)} ${UNIT}` : '–'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  )
}
