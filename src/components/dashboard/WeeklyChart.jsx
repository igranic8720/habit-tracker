import { monthDay, pct } from '../../lib/format.js'
import BarChart from '../charts/BarChart.jsx'
import Panel from '../shared/Panel.jsx'
import WeeklyTable from './WeeklyTable.jsx'

// weekly completion: share of all habit-days done in each week, one thin column per week
export default function WeeklyChart({ rows, year }) {
  return (
    <Panel title={<>Weekly completion · {year}</>} label={`Weekly completion ${year}`}>
      <BarChart
        rows={rows.map((r) => ({ from: r.from, to: r.to, value: r.rate }))}
        max={1}
        yLabels={['100%', '50%', '0%']}
        barLabel={(r) => pct(r.value)}
        renderTip={(_, i) => (
          <>
            <span className="tip-range">
              {monthDay(rows[i].from)} – {monthDay(rows[i].to)}
            </span>
            <strong>{pct(rows[i].rate)}</strong>
            <span className="tip-sub">
              {rows[i].done} of {rows[i].possible} habit-days
            </span>
          </>
        )}
      />
      <WeeklyTable rows={rows} />
    </Panel>
  )
}
