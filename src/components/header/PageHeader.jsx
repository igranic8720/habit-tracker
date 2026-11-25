import { today } from '../../lib/dates.js'
import PageNav from './PageNav.jsx'
import SaveStatus from './SaveStatus.jsx'
import YearPicker from './YearPicker.jsx'
import './PageHeader.css'

// the header card: page title + date, the page switch, that page's headline numbers (children), save status, year picker
export default function PageHeader({ page, year, years, firstYear, onYear, saveState, children }) {
  return (
    <header className="page-head surface">
      <div className="head-title">
        <h1>{page === 'workouts' ? 'Workouts' : 'Habits'}</h1>
        <p>{today.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</p>
      </div>
      <PageNav page={page} />
      {children}
      <div className="head-right">
        <SaveStatus state={saveState} />
        <YearPicker year={year} years={years} firstYear={firstYear} onChange={onYear} />
      </div>
    </header>
  )
}
