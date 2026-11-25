import { useCallback, useMemo, useState } from 'react'
import HeaderStats from './components/header/HeaderStats.jsx'
import PageHeader from './components/header/PageHeader.jsx'
import WorkoutStats from './components/header/WorkoutStats.jsx'
import Panel from './components/shared/Panel.jsx'
import { useDayRollover } from './hooks/useDayRollover.js'
import { useHabits } from './hooks/useHabits.js'
import { useRoute } from './hooks/useRoute.js'
import { useWorkouts } from './hooks/useWorkouts.js'
import { YEAR } from './lib/dates.js'
import { browsableYears } from './lib/habits.js'
import { diaryOf } from './lib/workouts.js'
import HabitsPage from './pages/HabitsPage.jsx'
import WorkoutsPage from './pages/WorkoutsPage.jsx'

const RANK = { error: 4, conflict: 3, saving: 2, saved: 1, idle: 0 }

// two separate data sets (habits; workouts with their plans and cycles) on two pages, switched from the header / tab bar
export default function App() {
  const { habits, status, saveState: habitsSave, flush, change, patch, add, remove } = useHabits()
  const w = useWorkouts()
  const { page, sub } = useRoute()
  const [year, setYear] = useState(YEAR)
  const diary = useMemo(() => diaryOf(w.log), [w.log])
  const { flush: flushWorkouts } = w

  // past midnight with the app still open: save what is pending, then reload so "today" is today
  useDayRollover(
    useCallback(async () => {
      await Promise.all([flush(), flushWorkouts()])
      location.reload()
    }, [flush, flushWorkouts]),
  )

  if (status === 'loading') return null
  if (status === 'failed') {
    return (
      <main>
        <Panel title="Couldn’t load your habits">
          <p>The server didn’t answer. Nothing is shown, so nothing can be saved over your data. Reload the page to try again.</p>
        </Panel>
      </main>
    )
  }

  // the header shows one save status for both stores: the most urgent one
  const saveState = RANK[w.saveState] > RANK[habitsSave] ? w.saveState : habitsSave
  // years you can browse: back to the earliest year with a habit day, note or workout
  const { firstYear, years } = browsableYears([...habits, { days: diary.days, notes: diary.notes }])

  return (
    <main>
      <PageHeader page={page} year={year} years={years} firstYear={firstYear} onYear={setYear} saveState={saveState}>
        {page === 'workouts' ? (
          <WorkoutStats log={w.status === 'ready' ? diary : null} year={year} />
        ) : (
          <HeaderStats habits={habits.filter((h) => !h.archived)} year={year} />
        )}
      </PageHeader>
      {page === 'workouts' ? (
        <WorkoutsPage w={w} diary={diary} year={year} sub={sub} />
      ) : (
        <HabitsPage habits={habits} year={year} change={change} patch={patch} add={add} remove={remove} />
      )}
    </main>
  )
}
