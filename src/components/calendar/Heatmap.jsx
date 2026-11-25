import { useLayoutEffect, useRef } from 'react'
import { YEAR, getYear, iso, todayKey } from '../../lib/dates.js'
import { currentStreak, longestStreak } from '../../lib/streaks.js'
import { setCount } from '../../lib/workouts.js'
import './Heatmap.css'

// the GitHub-style contribution graph for one habit and one year, with a streak + legend footer.
// colorOf(key) colours individual days and legend replaces the default Not done / Done key (the workout log uses both).
export default function Heatmap({ habit, year, selected, onPick, colorOf, legend }) {
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
                    const label = date.toLocaleDateString(undefined, {
                      weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
                    })
                    return (
                      <button
                        key={d}
                        className={`cell${done.has(key) ? ' on' : ''}${notes[key] ? ' noted' : ''}${key === todayKey ? ' today-cell' : ''}${key === selected ? ' selected' : ''}${future ? ' future' : ''}`}
                        title={`${label}${done.has(key) ? (strength ? ` ✓ ${setCount(habit.workouts?.[key])} sets` : ' ✓') : ''}${notes[key] ? `\n${notes[key]}` : ''}`}
                        aria-label={label}
                        aria-pressed={key === selected}
                        data-color={colorOf?.(key)}
                        disabled={future}
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
        <span>
          <strong>{currentStreak(done)}</strong> day streak · best <strong>{longestStreak(habit.days)}</strong>
        </span>
        {legend ?? (
          <span className="legend" aria-hidden="true">
            Not done <i className="lg" /> <i className="lg on" /> Done
          </span>
        )}
      </div>
    </div>
  )
}
