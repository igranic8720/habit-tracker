import Panel from '../components/shared/Panel.jsx'
import CyclesView from '../components/workouts/cycles/CyclesView.jsx'
import PlansView from '../components/workouts/plans/PlansView.jsx'
import WorkoutCharts from '../components/workouts/charts/WorkoutCharts.jsx'
import WorkoutDiary from '../components/workouts/today/WorkoutDiary.jsx'
import WorkoutTabs from '../components/workouts/WorkoutTabs.jsx'
import { todayKey } from '../lib/dates.js'
import { newSession } from '../lib/plans.js'
import { exerciseNames } from '../lib/workouts.js'

// the Workouts page: your own graphs pinned left; on the right Today / Plans / Cycles (on phones: those first, graphs after)
export default function WorkoutsPage({ w, diary, year, sub }) {
  if (w.status === 'loading') return null
  if (w.status === 'failed') {
    return (
      <div className="workspace">
        <Panel title="Couldn’t load your workouts">
          <p>Nothing is shown, and nothing will be saved over your data. Reload the page to try again.</p>
        </Panel>
      </div>
    )
  }
  const doToday = (plan) => {
    w.setDay(todayKey, newSession(plan, w, diary, todayKey))
    location.hash = '#/workouts'
  }
  return (
    <div className="workspace two">
      <aside className="side" aria-label="Workout graphs">
        <WorkoutCharts habit={diary} year={year} />
      </aside>
      <div className="habits-pane">
        <WorkoutTabs sub={sub} />
        {sub === 'plans' ? (
          <PlansView w={w} names={exerciseNames(diary)} hasSessionToday={!!w.log[todayKey]} onDo={doToday} />
        ) : sub === 'cycles' ? (
          <CyclesView w={w} />
        ) : (
          <WorkoutDiary w={w} diary={diary} year={year} />
        )}
      </div>
    </div>
  )
}
