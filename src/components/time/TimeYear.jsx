import { useMemo } from 'react'
import { lastDay } from '../../lib/calendar.js'
import { duration, level, nextDay, total } from '../../lib/time.js'
import { todayKey } from '../../lib/dates.js'
import Heatmap from '../calendar/Heatmap.jsx'
import './time.css'

const KEY = [['None', 0], ['Under 1h', 1], ['1–2h', 2], ['2–4h', 3], ['4h or more', 4]]

// the year so far, to keep you honest: the days gone by (today isn't over yet) with nothing tracked, and the run of days in a row
// with something tracked up to today (today counts once it has time; until then the run ending yesterday still stands)
function tally(perDay, year) {
  const first = `${year}-01-01`
  const end = todayKey.startsWith(`${year}-`) ? todayKey : todayKey > first ? `${year}-12-31` : null
  let missed = 0
  let past = 0
  for (let k = first; end && k < end; k = nextDay(k)) {
    past++
    if (!perDay.has(k)) missed++
  }
  if (end && end !== todayKey) { past++; if (!perDay.has(end)) missed++ } // a finished year: its last day counts too
  let streak = 0
  let k = perDay.has(todayKey) ? todayKey : nextDay(todayKey, -1)
  while (k >= first && perDay.has(k)) { streak++; k = nextDay(k, -1) }
  return { missed, past, streak }
}

// the GitHub-style yearly graph of time tracked: each square is a day, darker for more; click a day to open it below
export default function TimeYear({ map, year, selected, onPick }) {
  const perDay = useMemo(() => {
    const out = new Map()
    for (const [key, segs] of map) {
      if (!key.startsWith(`${year}-`)) continue
      const ms = total(segs)
      if (ms > 0) out.set(key, ms)
    }
    return out
  }, [map, year])
  const all = [...perDay.values()].reduce((a, b) => a + b, 0)
  const { missed, past, streak } = tally(perDay, year)
  const legend = (
    <ul className="legend plan-legend" aria-label="Legend">
      {KEY.map(([label, n]) => (
        <li key={n}>
          <i className={n ? 'lg on' : 'lg'} data-level={n || undefined} /> {label}
        </li>
      ))}
    </ul>
  )
  return (
    <section className="card surface time-year" data-color="blue" aria-label={`Time tracked in ${year}`}>
      <div className="ty-head">
        <h3 className="summary">
          <strong>{duration(all)}</strong> tracked in {year}
        </h3>
        {past > 0 && (
          <p className="ty-shame">
            <span className={missed ? 'ty-missed' : 'ty-good'}>
              <strong>{missed}</strong> of {past} {past === 1 ? 'day' : 'days'} with nothing tracked
            </span>
            <span className={streak ? 'ty-good' : 'ty-missed'}>
              <strong>{streak}</strong> {streak === 1 ? 'day' : 'days'} in a row
            </span>
          </p>
        )}
      </div>
      <Heatmap
        habit={{ days: [...perDay.keys()], notes: {} }}
        year={year}
        selected={selected}
        onPick={onPick}
        openUntil={lastDay()} // upcoming days open too (to see what's scheduled); nothing can be ticked there
        levelOf={(k) => level(perDay.get(k) ?? 0)}
        tipOf={(k, label) => `${label}: ${perDay.has(k) ? duration(perDay.get(k)) : k > todayKey ? 'upcoming' : 'nothing tracked'}`}
        stat={<span><strong>{perDay.size}</strong> {perDay.size === 1 ? 'day' : 'days'} with time tracked</span>}
        legend={legend}
      />
    </section>
  )
}
