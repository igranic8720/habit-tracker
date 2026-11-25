import { useChartHover } from '../../hooks/useChartHover.js'
import { MONTHS } from '../../lib/dates.js'
import ChartTooltip from './ChartTooltip.jsx'
import './LineChart.css'

// round axis ticks around the data (about 3 intervals), e.g. 175–205 -> 170, 180, 190, 200, 210
function axis(min, max) {
  if (min === max) {
    min -= 5
    max += 5
  }
  const raw = (max - min) / 3
  const mag = 10 ** Math.floor(Math.log10(raw))
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw)
  const lo = Math.max(0, Math.floor(min / step) * step)
  const hi = Math.ceil(max / step) * step
  const ticks = []
  for (let t = lo; t <= hi + 1e-9; t += step) ticks.push(t)
  return { lo, hi, ticks }
}

// a line over one calendar year. points: [{ date: Date, y }]. renderTip(point) fills the tooltip.
// The line is an SVG stretched to the plot; the dots and labels are HTML so they never get squashed.
export default function LineChart({ year, points, yFormat = String, renderTip }) {
  const start = new Date(year, 0, 1).getTime()
  const span = new Date(year + 1, 0, 1).getTime() - start
  const { lo, hi, ticks } = axis(Math.min(...points.map((p) => p.y)), Math.max(...points.map((p) => p.y)))
  const dots = points.length <= 20 // a dense series is just the line: dots only on hover and on the latest point
  const left = (p) => ((p.date.getTime() - start) / span) * 100
  const top = (p) => (1 - (p.y - lo) / (hi - lo)) * 100

  // the nearest point to the pointer, its readout anchored on the point
  const { plotRef, hover, handlers } = useChartHover((e, b) => {
    const px = ((e.clientX - b.left) / b.width) * 100
    let best = 0
    points.forEach((p, i) => {
      if (Math.abs(left(p) - px) < Math.abs(left(points[best]) - px)) best = i
    })
    return { i: best, x: b.left + (left(points[best]) / 100) * b.width, y: b.top + (top(points[best]) / 100) * b.height }
  })

  return (
    <>
      <div className="plot-wrap">
        <div className="lc-y" aria-hidden="true">
          {ticks.map((t) => (
            <span key={t} style={{ top: `${(1 - (t - lo) / (hi - lo)) * 100}%` }}>
              {yFormat(t)}
            </span>
          ))}
        </div>
        <div className="plot lc-plot" ref={plotRef} {...handlers}>
          {ticks.map((t) => (
            <div key={t} className="gridline" style={{ top: `${(1 - (t - lo) / (hi - lo)) * 100}%` }} />
          ))}
          <svg className="lc-svg" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
            <polyline points={points.map((p) => `${left(p)},${top(p)}`).join(' ')} />
          </svg>
          {points.map(
            (p, i) =>
              (dots || i === points.length - 1 || hover?.i === i) && (
                <span key={i} className={`lc-pt${hover?.i === i ? ' hover' : ''}`} style={{ left: `${left(p)}%`, top: `${top(p)}%` }} />
              ),
          )}
          {hover && (
            <ChartTooltip x={hover.x} y={hover.y}>
              {renderTip(points[hover.i])}
            </ChartTooltip>
          )}
        </div>
      </div>
      <div className="lc-x" aria-hidden="true">
        {[0, 3, 6, 9].map((m) => (
          <span key={m} style={{ left: `${((new Date(year, m, 1).getTime() - start) / span) * 100}%` }}>
            {MONTHS[m]}
          </span>
        ))}
      </div>
    </>
  )
}
