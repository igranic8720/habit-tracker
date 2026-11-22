import { useState } from 'react'
import { MONTHS } from '../../lib/dates.js'
import { pct } from '../../lib/format.js'
import Panel from '../shared/Panel.jsx'
import ChartTooltip from './ChartTooltip.jsx'
import WeeklyTable from './WeeklyTable.jsx'
import './WeeklyChart.css'

// weekly completion: share of all habit-days done in each week, one thin column per week
export default function WeeklyChart({ rows, year }) {
  const [hover, setHover] = useState(null) // { i, x, y }: hovered week + where to anchor its tooltip on screen
  const lastIdx = rows.reduce((last, r, i) => (r.rate === null ? last : i), -1)
  return (
    <Panel title={<>Weekly completion · {year}</>} label={`Weekly completion ${year}`}>
      <div className="plot-wrap">
        <div className="y-axis" aria-hidden="true">
          <span>100%</span>
          <span>50%</span>
          <span>0%</span>
        </div>
        <div className="plot" onPointerLeave={() => setHover(null)}>
          <div className="gridline" style={{ top: 0 }} />
          <div className="gridline" style={{ top: '50%' }} />
          <div className="gridline" style={{ bottom: 0 }} />
          <div className="cols">
            {rows.map((r, i) => (
              <div
                key={i}
                className={`col${hover?.i === i ? ' hover' : ''}`}
                onPointerEnter={(e) => {
                  if (r.rate === null) return
                  const b = e.currentTarget.getBoundingClientRect()
                  setHover({ i, x: b.left + b.width / 2, y: b.top })
                }}
              >
                {r.rate > 0 && (
                  <span className="bar" style={{ height: `${Math.max(r.rate * 100, 2)}%` }}>
                    {i === lastIdx && <span className="bar-label">{pct(r.rate)}</span>}
                  </span>
                )}
              </div>
            ))}
          </div>
          {hover && <ChartTooltip row={rows[hover.i]} x={hover.x} y={hover.y} />}
        </div>
      </div>
      <div className="x-axis" aria-hidden="true">
        {rows.map((r, i) => {
          const first = i === 0 || r.from.getMonth() !== rows[i - 1].from.getMonth()
          return (
            <span key={i} className={first && r.from.getMonth() % 3 === 0 ? 'q' : ''}>
              {first ? MONTHS[r.from.getMonth()] : ''}
            </span>
          )
        })}
      </div>
      <WeeklyTable rows={rows} />
    </Panel>
  )
}
