import { monthDay } from '../../../lib/format.js'
import { habitColor } from '../../../lib/habits.js'
import { weeklyWorkouts } from '../../../lib/workouts.js'
import BarChart from '../../charts/BarChart.jsx'
import Panel from '../../shared/Panel.jsx'
import LiftProgress from './LiftProgress.jsx'
import WeeklyWorkoutTable from './WeeklyWorkoutTable.jsx'

const range = (r) => (
  <span className="tip-range">
    {monthDay(r.from)} – {monthDay(r.to)}
  </span>
)

// the Workouts page's own graphs: workouts per week, and a per-lift progress line
export default function WorkoutCharts({ habit, year }) {
  const rows = weeklyWorkouts(habit, year)
  const cMax = Math.max(4, Math.ceil(Math.max(...rows.map((r) => r.workouts)) / 2) * 2)
  const asRow = (key) => (r) => ({ from: r.from, to: r.to, value: r.future ? null : r[key] })
  return (
    <div className="habit-color" data-color={habitColor(habit)} style={{ display: 'contents' }}>
      <Panel title={<>Workouts per week · {year}</>} label={`Workouts per week ${year}`}>
        <BarChart
          accent
          rows={rows.map(asRow('workouts'))}
          max={cMax}
          yLabels={[String(cMax), String(cMax / 2), '0']}
          barLabel={(r) => String(r.value)}
          renderTip={(_, i) => (
            <>
              {range(rows[i])}
              <strong>{rows[i].workouts === 1 ? '1 workout' : `${rows[i].workouts} workouts`}</strong>
              <span className="tip-sub">{rows[i].sets} {rows[i].sets === 1 ? 'set' : 'sets'}</span>
            </>
          )}
        />
        <WeeklyWorkoutTable rows={rows} />
      </Panel>

      <LiftProgress habit={habit} year={year} />
    </div>
  )
}
