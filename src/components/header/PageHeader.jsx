import { today } from '../../lib/dates.js'
import HeaderStats from './HeaderStats.jsx'
import SaveStatus from './SaveStatus.jsx'
import YearPicker from './YearPicker.jsx'
import './PageHeader.css'

// the fixed header card: title + date, headline numbers, save status, year picker
export default function PageHeader({ habits, year, years, firstYear, onYear, saveState }) {
  return (
    <header className="page-head surface">
      <div className="head-title">
        <h1>Habits</h1>
        <p>{today.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</p>
      </div>
      <HeaderStats habits={habits} year={year} />
      <div className="head-right">
        <SaveStatus state={saveState} />
        <YearPicker year={year} years={years} firstYear={firstYear} onChange={onYear} />
      </div>
    </header>
  )
}
