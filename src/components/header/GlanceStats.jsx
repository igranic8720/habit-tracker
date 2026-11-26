import { todayKey } from '../../lib/dates.js'
import { duration, nextDay, total } from '../../lib/time.js'
import { setCount, setTotal } from '../../lib/workouts.js'
import Stat from './Stat.jsx'
import './HeaderStats.css'

// At a glance's headline numbers: time tracked today, habits done, today's workout, and the last 7 days
export default function GlanceStats({ map, habits, workout }) {
  const week = Array.from({ length: 7 }, (_, i) => total(map.get(nextDay(todayKey, -i)) ?? [])).reduce((a, b) => a + b, 0)
  const done = habits.filter((h) => h.days.includes(todayKey)).length
  const sets = workout ? setTotal(workout.entries) : 0
  return (
    <div className="head-stats">
      <Stat name="Tracked today" value={duration(total(map.get(todayKey) ?? []))} />
      <Stat name="Habits done" value={done} of={habits.length} />
      {sets > 0 ? <Stat name="Sets done" value={setCount(workout.entries)} of={sets} /> : <Stat name="Workout" value={workout ? '—' : 'None'} />}
      <Stat name="Last 7 days" value={duration(week)} />
    </div>
  )
}
