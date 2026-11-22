import { YEAR } from '../../lib/dates.js'
import { summarize, weekly } from '../../lib/stats.js'
import LastSevenDays from './LastSevenDays.jsx'
import WeeklyChart from './WeeklyChart.jsx'

// the pinned side panels: weekly completion chart, then (this year only) the last 7 days
export default function Dashboard({ habits, year }) {
  if (habits.length === 0) return null
  const { list } = summarize(habits, year)
  return (
    <>
      <WeeklyChart rows={weekly(list, year)} year={year} />
      {year === YEAR && <LastSevenDays habits={list} />}
    </>
  )
}
