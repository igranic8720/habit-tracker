import { useMemo } from 'react'
import { lastDay } from '../../lib/calendar.js'
import { duration, level, nextDay, total } from '../../lib/time.js'
import { YEAR, todayKey } from '../../lib/dates.js'
import { runs, shameLine } from '../../lib/shame.js'
import { useNow } from '../../hooks/useNow.js'
import { WarningFilled } from '@ant-design/icons'
import Heatmap from '../calendar/Heatmap.jsx'
import './time.css'

const KEY = [['None', 0], ['Under 1h', 1], ['1–2h', 2], ['2–4h', 3], ['4h or more', 4]]

// the year so far, to keep you honest: the days gone by (today isn't over yet) with nothing tracked, and the run of days in a row
// with something tracked up to today (today counts once it has time; until then the run ending yesterday still stands)
function tally(perDay, year, since) {
  const jan1 = `${year}-01-01`
  const first = since && since > jan1 ? since : jan1 // nothing before tracking started counts as missed
  const end = !since || since > `${year}-12-31` ? null : todayKey.startsWith(`${year}-`) ? todayKey : todayKey > first ? `${year}-12-31` : null
  let missed = 0
  let past = 0
  for (let k = first; end && k < end; k = nextDay(k)) {
    past++
    if (!perDay.has(k)) missed++
  }
  if (end && end !== todayKey) { past++; if (!perDay.has(end)) missed++ } // a finished year: its last day counts too
  const { streak, best } = runs(perDay, end ?? first, first)
  return { missed, past, streak, best }
}

// the GitHub-style yearly graph of time tracked: each square is a day, darker for more; click a day to open it below
// This year's also gets a line of shame under its head: the worst true thing about your tracking right now (lib/shame.js),
// refreshed every minute (it knows what time it is).
// since: the day tracking started (null: nothing recorded yet); the days before it are faded and not counted
export default function TimeYear({ map, year, selected, onPick, since }) {
  const now = useNow(year === YEAR, 60000)
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
  const { missed, past, streak, best } = tally(perDay, year, since)
  const shame = year === YEAR ? shameLine(perDay, todayKey, new Date(now), since) : null
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
    <section className="card surface time-year" data-color="green" aria-label={`Time tracked in ${year}`}>
      <div className="ty-head">
        <h3 className="summary">
          <strong>{duration(all)}</strong> tracked in {year}
        </h3>
        {past > 0 && (
          <p className="ty-shame">
            <span className={missed ? 'ty-missed' : 'ty-good'}>
              <strong>{missed}</strong> of {past} {past === 1 ? 'day' : 'days'} with nothing tracked
              {since > `${year}-01-01` && <span className="ty-since"> since {new Date(`${since}T12:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>}
            </span>
            <span className={streak ? 'ty-good' : 'ty-missed'}>
              <strong>{streak}</strong> {streak === 1 ? 'day' : 'days'} in a row
            </span>
            {best > streak && (
              <span className="ty-best">
                best <strong>{best}</strong>
              </span>
            )}
          </p>
        )}
      </div>
      {shame && (
        <p className={`ty-nag ${shame.tone}`} role="status">
          {shame.tone === 'bad' && <WarningFilled />} {shame.text}
        </p>
      )}
      <Heatmap
        habit={{ days: [...perDay.keys()], notes: {} }}
        year={year}
        selected={selected}
        onPick={onPick}
        openUntil={lastDay()}
        openFrom={since ?? todayKey} /* (nothing recorded yet: no day before today counts) */ // upcoming days open too (to see what's scheduled); nothing can be ticked there
        levelOf={(k) => level(perDay.get(k) ?? 0)}
        tipOf={(k, label) => `${label}: ${perDay.has(k) ? duration(perDay.get(k)) : k > todayKey ? 'upcoming' : 'nothing tracked'}`}
        stat={<span><strong>{perDay.size}</strong> {perDay.size === 1 ? 'day' : 'days'} with time tracked</span>}
        legend={legend}
      />
    </section>
  )
}
