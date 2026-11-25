import { useState } from 'react'
import { MONTHS } from '../../../lib/dates.js'
import { fromKey } from '../../../lib/format.js'
import { UNIT, compact, e1rm, exerciseNames, fmt, liftSeries, setText } from '../../../lib/workouts.js'
import LineChart from '../../charts/LineChart.jsx'
import Panel from '../../shared/Panel.jsx'
import Segmented from '../../shared/Segmented.jsx'
import LiftTable from './LiftTable.jsx'
import './LiftProgress.css'

const day = (key) => {
  const d = fromKey(key)
  return `${MONTHS[d.getMonth()]} ${d.getDate()}`
}

// one lift over time: pick an exercise, see its heaviest set (or estimated 1-rep max) at every session this year
export default function LiftProgress({ habit, year }) {
  const names = exerciseNames(habit)
  const [pick, setPick] = useState(null)
  const [metric, setMetric] = useState('top') // top | est
  const name = names.includes(pick) ? pick : names.find((n) => liftSeries(habit, n, year).length) ?? names[0]
  const series = name ? liftSeries(habit, name, year) : []
  const bodyweight = series.length > 0 && series.every((s) => s.top.weight === 0) // pull-ups etc: graph reps instead
  const value = (s) => (bodyweight ? s.top.reps : metric === 'est' ? s.est : s.top.weight)
  const points = series.map((s) => ({ ...s, date: fromKey(s.key), y: metric === 'est' && !bodyweight ? Math.round(value(s)) : value(s) }))
  const unit = bodyweight ? 'reps' : UNIT

  let summary = null
  if (points.length > 1) {
    const d = points.at(-1).y - points[0].y
    const noun = unit === 'reps' && Math.abs(d) === 1 ? 'rep' : unit
    summary = `${d > 0 ? '+' : d < 0 ? '−' : '±'}${fmt(Math.abs(d))} ${noun} since ${day(points[0].key)}`
  }

  return (
    <Panel title={<>Lift progress · {year}</>} label={`Lift progress ${year}`}>
      {names.length === 0 ? (
        <p className="lp-empty">Log an exercise and its progress line shows up here.</p>
      ) : (
        <>
          <div className="lp-controls">
            <select className="lp-select chevron" aria-label="Exercise" value={name} onChange={(e) => setPick(e.target.value)}>
              {names.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
            {!bodyweight && (
              <Segmented
                label="What to graph"
                value={metric}
                onChange={setMetric}
                options={[
                  { id: 'top', label: 'Top set' },
                  { id: 'est', label: 'Est. 1RM' },
                ]}
              />
            )}
          </div>
          {points.length === 0 ? (
            <p className="lp-empty">No {name} sessions in {year}.</p>
          ) : (
            <>
              <p className="lp-sum">
                <strong>
                  {fmt(points.at(-1).y)} {unit === 'reps' && points.at(-1).y === 1 ? 'rep' : unit}
                </strong>{' '}
                {bodyweight ? 'best set' : metric === 'est' ? 'estimated max' : 'top set'} on {day(points.at(-1).key)}
                {summary && <span className={points.at(-1).y >= points[0].y ? ' up' : ''}> · {summary}</span>}
              </p>
              <LineChart
                year={year}
                points={points}
                yFormat={compact}
                renderTip={(p) => (
                  <>
                    <span className="tip-range">{fromKey(p.key).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                    <strong>
                      {fmt(p.y)} {unit}
                    </strong>
                    <span className="tip-sub">
                      {bodyweight ? `${p.sets.length} ${p.sets.length === 1 ? 'set' : 'sets'}` : `${setText(p.top)} top set · ${fmt(Math.round(e1rm(p.top)))} est. 1RM`}
                    </span>
                  </>
                )}
              />
              <LiftTable series={series} day={day} />
            </>
          )}
        </>
      )}
    </Panel>
  )
}
