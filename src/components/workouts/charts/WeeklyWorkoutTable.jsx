import { monthDay } from '../../../lib/format.js'
import '../../dashboard/WeeklyTable.css'

// the weekly graphs' table twin: every week so far, for keyboard and screen-reader use
export default function WeeklyWorkoutTable({ rows }) {
  return (
    <details className="table-view">
      <summary>Table view</summary>
      <div className="tv-scroll">
        <table>
          <thead>
            <tr>
              <th>Week</th>
              <th>Workouts</th>
              <th>Sets</th>
            </tr>
          </thead>
          <tbody>
            {rows
              .filter((r) => !r.future)
              .map((r, i) => (
                <tr key={i}>
                  <td>
                    {monthDay(r.from)} – {monthDay(r.to)}
                  </td>
                  <td>{r.workouts}</td>
                  <td>{r.sets}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </details>
  )
}
