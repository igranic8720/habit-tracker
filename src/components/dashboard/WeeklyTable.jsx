import { monthDay, pct } from '../../lib/format.js'
import './WeeklyTable.css'

// the chart's table twin: every elapsed week as a row, for keyboard and screen-reader use
export default function WeeklyTable({ rows }) {
  return (
    <details className="table-view">
      <summary>Table view</summary>
      <div className="tv-scroll">
        <table>
          <thead>
            <tr>
              <th>Week</th>
              <th>Done</th>
              <th>Possible</th>
              <th>Rate</th>
            </tr>
          </thead>
          <tbody>
            {rows
              .filter((r) => r.rate !== null)
              .map((r, i) => (
                <tr key={i}>
                  <td>
                    {monthDay(r.from)} – {monthDay(r.to)}
                  </td>
                  <td>{r.done}</td>
                  <td>{r.possible}</td>
                  <td>{pct(r.rate)}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </details>
  )
}
