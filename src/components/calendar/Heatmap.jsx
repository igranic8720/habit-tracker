import { useLayoutEffect, useRef } from 'react'
import { YEAR, getYear, iso, todayKey } from '../../lib/dates.js'
import { currentStreak, longestStreak } from '../../lib/streaks.js'
import { setCount } from '../../lib/workouts.js'
import { checkedTime } from '../../lib/habits.js'
import './Heatmap.css'

// the GitHub-style contribution graph for one habit and one year, with a streak + legend footer.
// colorOf(key) colours individual days and legend replaces the default Not done / Done key (the workout log uses both).
// openUntil: future days up to this date can be clicked too (the time graph, to look at what's scheduled); habit graphs leave it
// out, so a day that hasn't happened can never be ticked done.
// openFrom: days before it are faded and can't be clicked (the time graph: before tracking started).
// levelOf(key) (0-4) shades a day by how much happened (time tracked); tipOf(key, dateLabel) makes the hover text; stat replaces the streak line.
export default function Heatmap({ habit, year, selected, onPick, colorOf, legend, levelOf, tipOf, stat, openUntil, openFrom }) {
  const { grid, monthLabels } = getYear(year)
  const done = new Set(habit.days)
  const notes = habit.notes ?? {}
  const strength = !!habit.workouts
  // when the graph is wider than the screen (phones), open it at the latest week rather than January
  const scrollRef = useRef(null)
  useLayoutEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollLeft = year === YEAR ? el.scrollWidth : 0
  }, [year])
  return (
    <div className="graph">
      <div className="scroll" ref={scrollRef}>
        <div className="chart" style={{ '--weeks': grid.length }}>
          <div className="days">
            <span />
            <span>Mon</span>
            <span />
            <span>Wed</span>
            <span />
            <span>Fri</span>
            <span />
          </div>
          <div>
            <div className="months">
              {monthLabels.map((m, w) => (
                <span key={w}>{m}</span>
              ))}
            </div>
            <div className="grid">
              {grid.map((week, w) => (
                <div className="week" key={w}>
                  {week.map((date, d) => {
                    if (!date) return <span className="cell empty" key={d} />
                    const key = iso(date)
                    const future = key > todayKey
                    const before = !!openFrom && key < openFrom
                    const label = date.toLocaleDateString(undefined, {
                      weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
                    })
                    return (
                      <button
                        key={d}
                        className={`cell${done.has(key) ? ' on' : ''}${notes[key] ? ' noted' : ''}${key === todayKey ? ' today-cell' : ''}${key === selected ? ' selected' : ''}${future ? ' future' : ''}${before ? ' before' : ''}`}
                        title={tipOf ? tipOf(key, label) : `${label}${done.has(key) ? (strength ? ` ✓ ${setCount(habit.workouts?.[key])} sets` : habit.kind === 'check' ? ` ✓ at ${checkedTime(habit, key)}` : ' ✓') : ''}${notes[key] ? `\n${notes[key]}` : ''}`}
                        aria-label={tipOf ? tipOf(key, label) : label}
                        aria-pressed={key === selected}
                        data-color={colorOf?.(key)}
                        data-level={levelOf?.(key)}
                        disabled={before || (future && !(openUntil && key <= openUntil))}
                        onClick={() => onPick(key)}
                      />
                    )
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      <div className="graph-foot">
        {stat ?? (
          <span>
            <strong>{currentStreak(done)}</strong> day streak · best <strong>{longestStreak(habit.days)}</strong>
          </span>
        )}
        {legend ?? (
          <ul className="legend plan-legend" aria-label="Legend">
            <li>
              <i className="lg" /> Not done
            </li>
            <li>
              <i className="lg on" /> Done
            </li>
          </ul>
        )}
      </div>
    </div>
  )
}
