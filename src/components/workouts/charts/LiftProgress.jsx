import { useState } from 'react'
import { MONTHS } from '../../../lib/dates.js'
import { fromKey } from '../../../lib/format.js'
import { GRADES, UNIT, compact, e1rm, exerciseKind, exerciseNames, fmt, gradeNum, isClimb, liftSeries, setText } from '../../../lib/workouts.js'
import LineChart from '../../charts/LineChart.jsx'
import Panel from '../../shared/Panel.jsx'
import Segmented from '../../shared/Segmented.jsx'
import LiftTable from './LiftTable.jsx'
import './LiftProgress.css'

const day = (key) => {
  const d = fromKey(key)
  return `${MONTHS[d.getMonth()]} ${d.getDate()}`
}

// one lift over time: pick an exercise, see its heaviest set (or estimated 1-rep max) at every session this year. climbs: the same
// graph for your climbs (a board, a wall), the hardest grade sent each session. Each graph lists only its own kind of exercise
// (timed ones, like a plank, are in neither).
export default function LiftProgress({ habit, year, climbs = false }) {
  const names = exerciseNames(habit).filter((n) => exerciseKind(habit, n) === (climbs ? 'climb' : 'lift'))
  const what = climbs ? 'Climbing progress' : 'Lift progress'
  const [pick, setPick] = useState(null)
  const [metric, setMetric] = useState('top') // top | est
  const name = names.includes(pick) ? pick : names.find((n) => liftSeries(habit, n, year).length) ?? names[0]
  const all = name ? liftSeries(habit, name, year) : []
  const climb = all.length > 0 && all.every((s) => isClimb(s.top)) // MoonBoard: the hardest send, sessions without one left out
  const series = climb ? all.filter((s) => s.top.sent) : all
  const bodyweight = !climb && series.length > 0 && series.every((s) => s.top.weight === 0) // pull-ups etc: graph reps instead
  const plain = climb || bodyweight // one measure only: no top set / 1RM switch
  const value = (s) => (climb ? gradeNum(s.top.grade) : bodyweight ? s.top.reps : metric === 'est' ? s.est : s.top.weight)
  const points = series.map((s) => ({ ...s, date: fromKey(s.key), y: metric === 'est' && !plain ? Math.round(value(s)) : value(s) }))
  const unit = bodyweight ? 'reps' : UNIT
  const gradeAt = (y) => GRADES[Math.round(y)]?.v ?? ''
  const show = (y) => (climb ? `${gradeAt(y)} · ${GRADES[y]?.font}` : `${fmt(y)} ${unit === 'reps' && y === 1 ? 'rep' : unit}`)

  let summary = null
  if (points.length > 1) {
    const d = points.at(-1).y - points[0].y
    const sign = d > 0 ? '+' : d < 0 ? '−' : '±'
    summary = climb ? `${d === 0 ? 'same as' : `${sign}${Math.abs(d)} ${Math.abs(d) === 1 ? 'grade' : 'grades'} since`} ${day(points[0].key)}` : `${sign}${fmt(Math.abs(d))} ${unit === 'reps' && Math.abs(d) === 1 ? 'rep' : unit} since ${day(points[0].key)}`
  }

  return (
    <Panel title={`${what} · ${year}`} label={`${what} ${year}`}>
      {names.length === 0 ? (
        <p className="lp-empty">{climbs ? 'Log a climb (Done for: Climb in a plan) and its hardest send per session shows up here.' : 'Log a lift and its progress line shows up here.'}</p>
      ) : (
        <>
          <div className="lp-controls">
            <select className="lp-select chevron" aria-label={climbs ? 'Climb' : 'Exercise'} value={name} onChange={(e) => setPick(e.target.value)}>
              {names.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
            {!plain && (
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
            <p className="lp-empty">{climb ? `No ${name} sends in ${year} yet.` : `No ${name} sessions in ${year}.`}</p>
          ) : (
            <>
              <p className="lp-sum">
                <strong>{show(points.at(-1).y)}</strong> {climb ? 'hardest send' : bodyweight ? 'best set' : metric === 'est' ? 'estimated max' : 'top set'} on {day(points.at(-1).key)}
                {summary && <span className={points.at(-1).y >= points[0].y ? ' up' : ''}> · {summary}</span>}
              </p>
              <LineChart
                year={year}
                points={points}
                yFormat={climb ? gradeAt : compact}
                whole={climb}
                renderTip={(p) => (
                  <>
                    <span className="tip-range">{fromKey(p.key).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                    <strong>{show(p.y)}</strong>
                    <span className="tip-sub">
                      {climb ? `${p.sets.filter((s) => s.sent).length} of ${p.sets.length} sent` : bodyweight ? `${p.sets.length} ${p.sets.length === 1 ? 'set' : 'sets'}` : `${setText(p.top)} top set · ${fmt(Math.round(e1rm(p.top)))} est. 1RM`}
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
