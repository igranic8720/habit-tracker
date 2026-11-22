import { monthDay, pct } from '../../lib/format.js'
import './ChartTooltip.css'

// hover readout for one week of the chart; fixed-position so the scrolling side pane can't clip it
export default function ChartTooltip({ row, x, y }) {
  return (
    <div className="tip" role="status" style={{ left: Math.min(Math.max(x, 90), window.innerWidth - 90), top: y - 6 }}>
      <span className="tip-range">
        {monthDay(row.from)} – {monthDay(row.to)}
      </span>
      <strong>{pct(row.rate)}</strong>
      <span className="tip-sub">
        {row.done} of {row.possible} habit-days
      </span>
    </div>
  )
}
