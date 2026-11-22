import { iso, today, todayKey } from '../../lib/dates.js'
import { habitColor, habitName } from '../../lib/habits.js'
import Panel from '../shared/Panel.jsx'
import './LastSevenDays.css'

const WEEKDAY = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

// last 7 days, one row per habit (a real table, so it reads fine to screen readers too)
export default function LastSevenDays({ habits }) {
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today)
    d.setDate(d.getDate() - (6 - i))
    return d
  })
  return (
    <Panel title="Last 7 days">
      <table className="wk-table">
        <thead>
          <tr>
            <th scope="col">
              <span className="sr-only">Habit</span>
            </th>
            {days.map((d) => (
              <th scope="col" key={iso(d)} className={iso(d) === todayKey ? 'now' : ''} title={d.toDateString()}>
                {WEEKDAY[d.getDay()]}
              </th>
            ))}
            <th scope="col">
              <span className="sr-only">Done</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {habits.map((h) => {
            const count = days.filter((d) => h.set.has(iso(d))).length
            const name = habitName(h)
            return (
              <tr key={h.id} className="wk-row habit-color" data-color={habitColor(h)}>
                <th scope="row">
                  <span className="dot" />
                  <span className="wk-name">{name}</span>
                </th>
                {days.map((d) => {
                  const on = h.set.has(iso(d))
                  return (
                    <td key={iso(d)} title={`${name} · ${d.toDateString()}${on ? ' ✓' : ''}`}>
                      <span className={`pip${on ? ' on' : ''}${iso(d) === todayKey ? ' now' : ''}`}>
                        <span className="sr-only">{on ? 'done' : 'not done'}</span>
                      </span>
                    </td>
                  )
                })}
                <td className="wk-count">{count}/7</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </Panel>
  )
}
