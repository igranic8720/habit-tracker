import { useState } from 'react'
import TodayList from '../components/glance/TodayList.jsx'
import Panel from '../components/shared/Panel.jsx'
import Agenda from '../components/time/Agenda.jsx'
import DailyBars from '../components/time/DailyBars.jsx'
import DayTimeline from '../components/time/DayTimeline.jsx'
import MonthCalendar from '../components/time/MonthCalendar.jsx'
import TimeYear from '../components/time/TimeYear.jsx'
import { useCalendarRange } from '../hooks/useCalendar.js'
import { AHEAD } from '../lib/calendar.js'
import { nextDay } from '../lib/time.js'
import { YEAR, todayKey } from '../lib/dates.js'
import SubTabs from '../components/shared/SubTabs.jsx'
import '../components/glance/glance.css'

const TABS = [
  { id: 'overview', label: 'Overview', href: '#/' },
  { id: 'timeline', label: 'Timeline', href: '#/timeline' },
]

// At a glance (the home page): on the left this year's graph (with its missed days and streak), then Today above the last two weeks
// beside the agenda above the month;
// on the right (its own narrow column) the chosen day's timeline. Pick a day in any of them.
// firstDay: Jan 1 of the earliest year with anything tracked (nothing before it can be browsed)
export default function GlancePage({ t, map, habits, w, firstDay, sub, onHabitNote }) {
  const [day, setDay] = useState(todayKey)
  // the whole synced calendar (30 days back to 60 ahead) is loaded once, so picking another day shows it at once: nothing
  // reloads, and the agenda never blinks out (which made the page jump)
  const cal = useCalendarRange(nextDay(todayKey, -30), nextDay(todayKey, AHEAD + 1))
  if (t.status === 'loading') return null
  if (t.status === 'failed') {
    return (
      <div className="workspace">
        <Panel title="Couldn’t load your time">
          <p>Nothing is shown, and nothing will be saved over your data. Reload the page to try again.</p>
        </Panel>
      </div>
    )
  }
  const workout = w.log[todayKey]
  return (
    <div className={`workspace two glance show-${sub === 'timeline' ? 'timeline' : 'overview'}`}>
      {/* phones: the page is one column, so it splits into two tabs, like Workouts (wide screens show both columns) */}
      <SubTabs label="At a glance sections" tabs={TABS} current={sub === 'timeline' ? 'timeline' : 'overview'} className="glance-tabs phone-only" />
      <div className="habits-pane glance-main">
        {/* first thing you see: the year so far, and how many days of it you let slip */}
        <TimeYear map={map} year={YEAR} selected={day} onPick={setDay} />
        {/* two columns of cards: Today above the last two weeks, beside the agenda above the month; they stack in a narrow window */}
        <div className="g-cols">
          <div className="g-col">
            <div className="g-today">
              <TodayList
                habits={habits}
                segs={map.get(todayKey) ?? []}
                time={t}
                workout={workout}
                plans={w.plans}
                onHabitNote={onHabitNote}
                onWorkoutNote={(text) =>
                  w.patchDay(todayKey, (d) => {
                    const { note: _old, ...others } = d // the same note as on the Workouts page
                    return text.trim() ? { ...others, note: text } : others
                  })
                }
              />
            </div>
            <div className="g-daily">
              <DailyBars map={map} selected={day} onPick={setDay} />
            </div>
          </div>
          <div className="g-col">
            <div className="g-agenda">
              <Agenda cal={cal} dayKey={day} />
            </div>
            <div className="g-month">
              <MonthCalendar key={day.slice(0, 7)} map={map} selected={day} onPick={setDay} firstDay={firstDay} />
            </div>
          </div>
        </div>
      </div>
      <div className="side">
        <div className="g-timeline">
          <DayTimeline
            dayKey={day}
            segs={map.get(day) ?? []}
            running={t.running}
            cal={cal}
            habits={habits}
            workoutName={workout?.name || 'Workout'}
            onDay={setDay}
            firstDay={firstDay}
            onAdd={t.add}
            onRemove={t.remove}
            onStop={t.stop}
            onDiscard={t.discard}
          />
        </div>
      </div>
    </div>
  )
}
