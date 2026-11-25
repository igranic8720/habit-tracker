import { workoutSummary } from '../../lib/workouts.js'
import Stat from './Stat.jsx'
import './HeaderStats.css'

// the Workouts page's headline numbers for the selected year (plus this week, for the current year)
export default function WorkoutStats({ log, year }) {
  if (!log) return null
  const s = workoutSummary(log, year)
  return (
    <div className="head-stats">
      {s.week ? (
        <Stat name="This week" value={s.week.workouts} tip={`${s.week.workouts} workouts · ${s.week.sets} sets`} />
      ) : (
        <Stat name="Per week" value={s.perWeek.toFixed(1)} tip={`${s.count} workouts in ${year}`} />
      )}
      <Stat name={`Workouts ${year}`} value={s.count} />
      <Stat name={`Sets ${year}`} value={s.sets.toLocaleString()} />
    </div>
  )
}
