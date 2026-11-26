import './time.css'
import { useState } from 'react'
import { useCalendarRange } from '../../hooks/useCalendar.js'
import { eventCounts, lastDay } from '../../lib/calendar.js'
import { iso, todayKey } from '../../lib/dates.js'
import { HOUR, duration, total } from '../../lib/time.js'
import Panel from '../shared/Panel.jsx'
import { LeftOutlined, RightOutlined } from '@ant-design/icons'

const DOW = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
const level = (ms) => (ms <= 0 ? 0 : ms < HOUR ? 1 : ms < 2 * HOUR ? 2 : ms < 4 * HOUR ? 3 : 4)

// a month: each day shows the time tracked (darker = more) and a dot when your calendar has something on it; pick a day to open it
// (days ahead too, as far as the calendar sync reaches)
export default function MonthCalendar({ map, selected, onPick, firstDay }) {
  const [shown, setShown] = useState(() => selected.slice(0, 7)) // 'YYYY-MM'
  const [y, m] = shown.split('-').map(Number)
  const first = new Date(y, m - 1, 1)
  const cells = [...Array(first.getDay()).fill(null), ...Array.from({ length: new Date(y, m, 0).getDate() }, (_, i) => iso(new Date(y, m - 1, i + 1)))]
  const go = (n) => setShown(iso(new Date(y, m - 1 + n, 1)).slice(0, 7))
  const next = iso(new Date(y, m, 1))
  const cal = useCalendarRange(`${shown}-01`, next)
  const events = eventCounts(cal.events, cells.filter(Boolean))
  const end = lastDay()
  const monthTotal = cells.filter(Boolean).reduce((n, k) => n + total(map.get(k) ?? []), 0)
  return (
    <Panel
      label="Time calendar"
      title={
        // one line: "< November 2026 >", then the month's total at the far end (the month says what the card is)
        <span className="month-head">
          <span className="month-nav">
            <button type="button" className="btn btn-sm" aria-label="Previous month" disabled={!!firstDay && shown <= firstDay.slice(0, 7)} onClick={() => go(-1)}><LeftOutlined /></button>
            <span className="month-name">{first.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</span>
            <button type="button" className="btn btn-sm" aria-label="Next month" disabled={shown >= end.slice(0, 7)} onClick={() => go(1)}><RightOutlined /></button>
          </span>
          <span className="month-total"><strong>{duration(monthTotal)}</strong> this month</span>
        </span>
      }
    >
      {/* the grid and its key sit in the same box as the year graph */}
      <div className="cal-box">
      <div className="cal" role="grid" aria-label="Days of the month">
        {DOW.map((d, i) => (
          <span key={i} className="cal-dow" aria-hidden="true">{d}</span>
        ))}
        {cells.map((k, i) => {
          if (!k) return <span key={`b${i}`} />
          const segs = map.get(k) ?? []
          const ms = total(segs)
          return (
            <button
              key={k}
              type="button"
              className={`cal-day${k === selected ? ' cal-sel' : ''}${k === todayKey ? ' cal-today' : ''}${k > todayKey ? ' cal-future' : ''}${events.has(k) ? ' has-ev' : ''}`}
              title={events.has(k) ? `${events.get(k)} on your calendar` : undefined}
              data-level={level(ms)}
              disabled={k > end || (!!firstDay && k < firstDay)}
              aria-pressed={k === selected}
              aria-label={`${k}: ${ms ? duration(ms) : k > todayKey ? 'upcoming' : 'nothing tracked'}${events.has(k) ? `, ${events.get(k)} on your calendar` : ''}`}
              onClick={() => onPick(k)}
            >
              <span className="cal-num">{Number(k.slice(8))}</span>
              <span className="cal-ms">{ms ? duration(ms).replace(' ', '') : ''}</span>
              {/* something on your calendar: a blue dot per event under the date (3 at most, then +) */}
              {events.has(k) && (
                <span className="cal-evs" aria-hidden="true">
                  {Array.from({ length: Math.min(3, events.get(k)) }, (_, n) => <i key={n} />)}
                  {events.get(k) > 3 && <b>+</b>}
                </span>
              )}
            </button>
          )
        })}
      </div>
      <ul className="cal-key" aria-hidden="true">
        <li><span className="cal-evs"><i /></span> On your calendar</li>
        <li><i className="cal-key-sw" /> Time tracked (darker is more)</li>
      </ul>
      </div>
    </Panel>
  )
}
