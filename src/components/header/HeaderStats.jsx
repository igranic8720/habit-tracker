import { YEAR } from '../../lib/dates.js'
import { pct, plural } from '../../lib/format.js'
import { summarize } from '../../lib/stats.js'
import Stat from './Stat.jsx'
import './HeaderStats.css'

// the headline numbers shown inside the page header (the selected year scopes them)
export default function HeaderStats({ habits, year }) {
  if (habits.length === 0) return null
  const m = summarize(habits, year)
  const days = (n) => plural(n, 'day')
  const across = `across ${plural(m.N, 'habit')}`
  return (
    <div className="head-stats">
      {year === YEAR ? (
        <>
          <Stat name="Done today" value={m.doneToday} of={m.N} tip={`${m.doneToday} of ${m.N} habits done today`} />
          <Stat name={`Completion ${year}`} value={pct(m.rate)} tip={`${m.doneInYear} of ${m.possible} habit-days`} />
          <Stat name="Current streak" value={m.topStreak.n} tip={m.topStreak.n ? `${days(m.topStreak.n)} · ${m.topStreak.name}` : 'No active streak'} />
          <Stat name={`Days done ${year}`} value={m.doneInYear} tip={across} />
        </>
      ) : (
        <>
          <Stat name={`Completion ${year}`} value={pct(m.rate)} tip={`${m.doneInYear} of ${m.possible} habit-days`} />
          <Stat name={`Days done ${year}`} value={m.doneInYear} tip={across} />
          <Stat name={`Best streak ${year}`} value={m.bestInYear.n} tip={m.bestInYear.n ? `${days(m.bestInYear.n)} · ${m.bestInYear.name}` : 'No streak'} />
        </>
      )}
    </div>
  )
}
