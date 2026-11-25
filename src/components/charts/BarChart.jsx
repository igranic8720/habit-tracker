import { useChartHover } from '../../hooks/useChartHover.js'
import { MONTHS } from '../../lib/dates.js'
import ChartTooltip from './ChartTooltip.jsx'
import './BarChart.css'

// one thin column per week of a year. rows: [{ from, to, value }] (value null = hasn't happened yet).
// max is the top of the axis; yLabels the three axis labels; renderTip(row, i) fills the tooltip.
// With `accent`, bars take the surrounding habit's colour instead of green.
export default function BarChart({ rows, max, yLabels, barLabel, renderTip, accent = false }) {
  const lastIdx = rows.reduce((last, r, i) => (r.value === null ? last : i), -1)
  // the week under the pointer, its readout anchored above its column
  const { plotRef, hover, handlers } = useChartHover((e, b) => {
    const i = Math.min(rows.length - 1, Math.max(0, Math.floor(((e.clientX - b.left) / b.width) * rows.length)))
    return rows[i].value === null ? null : { i, x: b.left + ((i + 0.5) * b.width) / rows.length, y: b.top }
  })

  return (
    <>
      <div className="plot-wrap" style={accent ? { '--bar': 'var(--on)' } : undefined}>
        <div className="y-axis" aria-hidden="true">
          {yLabels.map((l, i) => (
            <span key={i}>{l}</span>
          ))}
        </div>
        <div className="plot" ref={plotRef} {...handlers}>
          <div className="gridline" style={{ top: 0 }} />
          <div className="gridline" style={{ top: '50%' }} />
          <div className="gridline" style={{ bottom: 0 }} />
          <div className="cols">
            {rows.map((r, i) => (
              <div key={i} className={`col${hover?.i === i ? ' hover' : ''}`}>
                {r.value > 0 && (
                  <span className="bar" style={{ height: `${Math.min(100, Math.max((r.value / max) * 100, 2))}%` }}>
                    {i === lastIdx && barLabel && <span className="bar-label">{barLabel(r)}</span>}
                  </span>
                )}
              </div>
            ))}
          </div>
          {hover && (
            <ChartTooltip x={hover.x} y={hover.y}>
              {renderTip(rows[hover.i], hover.i)}
            </ChartTooltip>
          )}
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
    </>
  )
}
