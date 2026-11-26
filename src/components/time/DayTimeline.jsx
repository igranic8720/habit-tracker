import './time.css'
import { useEffect, useRef, useState } from 'react'
import { useNow } from '../../hooks/useNow.js'
import { forDay, lastDay, layout } from '../../lib/calendar.js'
import { breakdown, dayLabel, dayName, duration, nextDay, startOfDay, timeOfDay, total } from '../../lib/time.js'
import { todayKey } from '../../lib/dates.js'
import Panel from '../shared/Panel.jsx'
import AddSession from './AddSession.jsx'
import CalendarEvent from './CalendarEvent.jsx'
import { CloseOutlined, LeftOutlined, RightOutlined, StopFilled, SwapLeftOutlined, SwapRightOutlined } from '@ant-design/icons'

const HOURS = Array.from({ length: 24 }, (_, h) => h)
const hourName = (h) => new Date(2000, 0, 1, h % 24).toLocaleTimeString([], { hour: 'numeric' })
const span = (a, b) => `${timeOfDay(a)} – ${timeOfDay(b)}`
// workouts are labelled as such in the timeline: "Workout - Push day"
const nameOf = (s) => (s.kind === 'workout' ? `Workout - ${s.label}` : s.label)

// a calendar block opens its details (the same card as the agenda's: Join, Open in Outlook…) in a small card on the timeline;
// clicking elsewhere or Escape closes it
// one day as a picture (always the same size: 30px an hour): what you tracked (left) beside your calendar (right) on a 24-hour grid, with a "now" line on today.
// Above it: the day's total and how it split between habits / workouts; below it: the sessions themselves (to stop or delete
// one) and "Add time I forgot to track". The calendar's details are in the Agenda card.
export default function DayTimeline({ dayKey, segs, running, cal, habits, workoutName, onDay, onAdd, onRemove, onStop, onDiscard, firstDay }) {
  const isToday = dayKey === todayKey
  const now = useNow(isToday, 30000)
  const tick = useNow(!!running && segs.some((g) => g.session.id === 'running'))
  const day0 = startOfDay(dayKey)
  const day1 = startOfDay(nextDay(dayKey))
  const ms = day1 - day0
  const at = (t) => `${((t - day0) / ms) * 100}%`
  const top = (t) => `min(${at(t)}, calc(100% - 18px))` // a block starting late still fits above midnight
  const tall = (a, b) => `max(${((b - a) / ms) * 100}%, 18px)` // short blocks stay tall enough for one line
  const short = (a, b) => (b - a < 60 * 60000 ? ' short' : '') // under an hour: the label on one line
  const live = segs.map((g) => (g.session.id === 'running' ? { ...g, end: Math.max(g.start, Math.min(Math.max(tick, now), day1)) } : g))
  const parts = breakdown(live)
  const showCal = cal.connected
  const { timed } = forDay(cal.events, dayKey)
  // blocks are at least one line (18px) tall, so ones only minutes apart would cover each other: anything that close on screen is
  // laid out side by side (from the grid's real height, which follows the window)
  const gridRef = useRef(null)
  const [gridH, setGridH] = useState(720)
  useEffect(() => {
    const el = gridRef.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(([e]) => e.contentRect.height > 0 && setGridH(e.contentRect.height))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  const minVis = (20 / gridH) * ms // the time one line of block covers
  const sideBySide = (list) => layout(list.map((x) => ({ ...x, end: Math.max(x.end, x.start + minVis) }))).map((p) => ({ ...p, event: list[p.event.i] }))
  const placed = sideBySide(timed.map((e, i) => ({ ...e, i })))
  const future = dayKey > todayKey
  const name = dayName(dayKey)
  const runningSeg = live.find((g) => g.session.id === 'running')
  const done = live.filter((g) => g.session.id !== 'running')
  const tracked = sideBySide(live.map((g, i) => ({ start: g.start, end: g.end, i, g }))).map((p) => ({ g: live[p.event.i], col: p.col, cols: p.cols }))
  const [openId, setOpenId] = useState(null)
  const open = placed.find((p) => p.event.id === openId)?.event ?? null // another day: nothing open
  const popRef = useRef(null)
  useEffect(() => {
    if (!open) return
    const away = (e) => !popRef.current?.contains(e.target) && !e.target.closest?.('.tl2-block.event') && setOpenId(null)
    const esc = (e) => e.key === 'Escape' && setOpenId(null)
    document.addEventListener('pointerdown', away)
    document.addEventListener('keydown', esc)
    return () => {
      document.removeEventListener('pointerdown', away)
      document.removeEventListener('keydown', esc)
    }
  }, [open])
  // below the event, or above it in the later part of the day (so it stays inside the grid)
  const popAt = (e) => ((e.start - day0) / ms < 0.55 ? { top: `calc(max(${at(Math.min(e.end, day1))}, ${at(e.start)} + 18px) + 4px)` } : { bottom: `calc(100% - ${at(e.start)} + 4px)` })

  return (
    <Panel title="Timeline" label="Day timeline">
      {/* Today first and always there (greyed out on today), so the arrows never move as you click through the days */}
      <div className="day-nav">
        <button type="button" className="btn btn-sm" disabled={isToday} onClick={() => onDay(todayKey)}>Today</button>
        <button type="button" className="btn btn-sm" aria-label="Previous day" disabled={!!firstDay && dayKey <= firstDay} onClick={() => onDay(nextDay(dayKey, -1))}><LeftOutlined /></button>
        <strong className="day-nav-label">
          {name ?? dayLabel(dayKey)}
          {name && <span> · {dayLabel(dayKey)}</span>}
        </strong>
        <button type="button" className="btn btn-sm" aria-label="Next day" disabled={dayKey >= lastDay()} onClick={() => onDay(nextDay(dayKey))}><RightOutlined /></button>
      </div>

      {/* one fixed-height row on every day: the total (0m too), time per habit / workout, and Stop / Discard while timing */}
      <div className="tl-sum">
        <p className="day-total">
          <strong>{duration(total(live))}</strong> tracked
        </p>
        <ul className="tl-chips" aria-label="Time per habit or workout">
          {parts.map((p) => (
            <li key={p.id} data-color={p.color}>
              <i className="dot" aria-hidden="true" /> {p.id.startsWith('workout:') ? `Workout - ${p.label}` : p.label} <span>{duration(p.ms)}</span>
            </li>
          ))}
        </ul>
        {runningSeg && (
          <span className="tl-run" data-color={runningSeg.session.color} title={`${nameOf(runningSeg.session)} is being timed, since ${timeOfDay(runningSeg.session.start)}`}>
            <button type="button" className="btn btn-sm" onClick={onStop} aria-label={`Stop timing ${nameOf(runningSeg.session)}`}><StopFilled /> Stop</button>
            <button type="button" className="btn btn-sm btn-danger" onClick={onDiscard} aria-label={`Discard the ${nameOf(runningSeg.session)} timer`}>Discard</button>
          </span>
        )}
      </div>

      <div className={`tl2${showCal ? ' two-lanes' : ''}`}>
        <div className="tl2-heads" aria-hidden="true">
          <span>Tracked</span>
          {showCal && <span>Calendar</span>}
        </div>
        <div className="tl2-grid" ref={gridRef} role="img" aria-label={`Timeline: ${live.length} tracked ${live.length === 1 ? 'session' : 'sessions'}${showCal ? `, ${timed.length} calendar ${timed.length === 1 ? 'event' : 'events'}` : ''}`}>
          <div className="tl2-night" style={{ top: 0, height: at(day0 + 6 * 3600000) }} />
          <div className="tl2-night" style={{ top: at(day0 + 22 * 3600000), bottom: 0 }} />
          {HOURS.map((h) => (
            <div key={h} className={`tl2-hour${h % 3 === 0 ? ' major' : ''}`} style={{ top: `${(h / 24) * 100}%` }}>
              {h % 3 === 0 && !(isToday && Math.abs((now - day0) / ms - h / 24) * gridH < 16) && <span>{hourName(h)}</span>}{/* (not under the "now" time) */}
            </div>
          ))}
          <div className="tl2-lane tracked">
            {tracked.map(({ g, col, cols }, i) => (
              <div
                key={`${g.session.id}-${i}`}
                className={`tl2-block${g.session.id === 'running' ? ' running' : ''}${short(g.start, g.end)}`}
                data-color={g.session.color}
                style={{ top: top(g.start), height: tall(g.start, g.end), left: `${(col / cols) * 100}%`, width: `${100 / cols}%` }}
                title={`${nameOf(g.session)}: ${span(g.start, g.end)} (${duration(g.end - g.start)})`}
              >
                <strong>{nameOf(g.session)}</strong>
                <em className="tl2-dur">{duration(g.end - g.start)}</em>
                <span className="tl2-range">{span(g.start, g.end)}</span>
              </div>
            ))}
          </div>
          {showCal && (
            <div className="tl2-lane cal">
              {placed.map(({ event: e, col, cols }) => (
                <button
                  type="button"
                  key={e.id}
                  className={`tl2-block event${e.response === 'declined' ? ' declined' : ''}${short(e.start, e.end)}${e.id === openId ? ' open' : ''}`}
                  style={{ top: top(e.start), height: tall(e.start, e.end), left: `${(col / cols) * 100}%`, width: `${100 / cols}%` }}
                  title={`${e.title}: ${span(e.start, e.end)}`}
                  aria-expanded={e.id === openId}
                  aria-label={`${e.title}, ${span(e.start, e.end)}: show details`}
                  onClick={() => setOpenId(e.id === openId ? null : e.id)}
                >
                  <strong>{e.title}</strong>
                  <em className="tl2-dur">{timeOfDay(e.start)}</em>
                  <span className="tl2-range">{span(e.start, e.end)}</span>
                </button>
              ))}
            </div>
          )}
          {open && (
            <div className="tl2-pop" ref={popRef} style={popAt(open)} role="dialog" aria-label={`${open.title}: details`}>
              <button type="button" className="tl2-pop-x" aria-label="Close" onClick={() => setOpenId(null)}><CloseOutlined /></button>
              <ul className="oncal-list">
                <CalendarEvent e={open} state={!isToday ? '' : open.end <= now ? ' past' : open.start <= now ? ' now' : ''} soon={null} />
              </ul>
            </div>
          )}
          {isToday && (
            <div className="tl2-now" style={{ top: at(now) }} aria-hidden="true">
              <span>{timeOfDay(now)}</span>
            </div>
          )}
        </div>
      </div>

      <details className="tl-sessions" key={dayKey}>
        <summary aria-disabled={done.length === 0} onClick={(e) => done.length === 0 && e.preventDefault()}>
          {done.length} tracked {done.length === 1 ? 'session' : 'sessions'}
        </summary>
          <ol className="time-list">
            {done.map((g, i) => {
              const s = g.session
              return (
                <li key={`${s.id}-${i}`} data-color={s.color}>
                  <i className="dot" aria-hidden="true" />
                  <div className="time-row">
                    <strong>{nameOf(s)}</strong>
                    <span>
                      {s.start < day0 && <><SwapLeftOutlined /> </>}Started {timeOfDay(s.start)} · Finished {timeOfDay(s.end)}
                      {s.end > day1 && <> <SwapRightOutlined /></>}
                    </span>
                  </div>
                  <span className="time-ms">{duration(g.end - g.start)}</span>
                  <button type="button" className="btn btn-sm btn-danger" aria-label={`Delete ${nameOf(s)} session at ${timeOfDay(s.start)}`} onClick={() => onRemove(s)}>
                    <CloseOutlined />
                  </button>
                </li>
              )
            })}
          </ol>
      </details>
      <AddSession habits={habits} workoutName={workoutName} dayKey={dayKey} onAdd={onAdd} key={`add-${dayKey}`} disabled={future} />
    </Panel>
  )
}
