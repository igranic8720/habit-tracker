import { useState } from 'react'
import { useNow } from '../../hooks/useNow.js'
import { forDay } from '../../lib/calendar.js'
import { todayKey } from '../../lib/dates.js'
import { MIN, dayLabel, dayName, duration } from '../../lib/time.js'
import { OUTLOOK_CALENDAR } from '../../lib/links.js'
import Panel from '../shared/Panel.jsx'
import CalendarConnect from './CalendarConnect.jsx'
import CalendarEvent from './CalendarEvent.jsx'
import './time.css'
import { CalendarOutlined, ExportOutlined } from '@ant-design/icons'

// the day's calendar in full: all-day events, then each meeting with its details and Join / Open in Outlook buttons.
// Today: what has finished folds away ("Show 3 earlier"), the one on now is highlighted, the next ones say how soon.
export default function Agenda({ cal, dayKey }) {
  const [showPast, setShowPast] = useState(false)
  const isToday = dayKey === todayKey
  const now = useNow(isToday && cal.connected, 30000)
  if (cal.status === 'loading' || (!cal.configured && !cal.connected)) return null
  const { allDay, timed } = forDay(cal.events, dayKey)
  const past = isToday ? timed.filter((e) => e.end <= now) : []
  const shown = isToday && !showPast ? timed.filter((e) => e.end > now) : timed
  const name = dayName(dayKey) // Today / Tomorrow / Yesterday, or null
  return (
    <Panel
      label={name ? `${name}’s agenda` : `Agenda, ${dayLabel(dayKey)}`}
      title={
        <span className="agenda-head">
          <span>{name ? `${name}’s agenda` : `Agenda · ${dayLabel(dayKey)}`}</span>
          <a className="agenda-outlook" href={OUTLOOK_CALENDAR} target="_blank" rel="noopener noreferrer">
            <CalendarOutlined /> Outlook calendar <ExportOutlined />
          </a>
        </span>
      }
    >
      {cal.connected && (
        <>
          {allDay.length > 0 && (
            <ul className="cal-allday" aria-label="All-day events">
              {allDay.map((e) => (
                <li key={e.id}>{e.title}</li>
              ))}
            </ul>
          )}
          {past.length > 0 && (
            <button type="button" className="agenda-past" aria-expanded={showPast} onClick={() => setShowPast(!showPast)}>
              {showPast ? 'Hide' : 'Show'} {past.length} earlier
            </button>
          )}
          {shown.length > 0 ? (
            <ul className="oncal-list">
              {shown.map((e) => {
                const state = !isToday ? '' : e.end <= now ? ' past' : e.start <= now ? ' now' : ''
                const soon = isToday && !state && e.start - now < 12 * 60 * MIN ? `in ${duration(e.start - now)}` : null
                return <CalendarEvent key={e.id} e={e} state={state} soon={soon} />
              })}
            </ul>
          ) : (
            <p className="time-empty">{timed.length ? 'Nothing else on your calendar today.' : allDay.length ? 'No meetings.' : 'Nothing on your calendar.'}</p>
          )}
        </>
      )}
      <CalendarConnect cal={cal} />
    </Panel>
  )
}
