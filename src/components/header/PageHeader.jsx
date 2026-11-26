import { today } from '../../lib/dates.js'
import PageNav from './PageNav.jsx'
import SaveStatus from './SaveStatus.jsx'
import YearPicker from './YearPicker.jsx'
import './PageHeader.css'
import { CheckSquareOutlined, DashboardOutlined, FireOutlined } from '@ant-design/icons'

const TITLES = { glance: 'At a Glance:', habits: 'Habits:', workouts: 'Workouts:' }
// each page's mark beside its title (Ant Design has no dumbbell: a flame stands for training)
const ICONS = { glance: DashboardOutlined, habits: CheckSquareOutlined, workouts: FireOutlined }

// the header card: page title + date, in a fixed width so the page switch sits in the same place on every page; the page switch;
// the save status in a fixed-width slot beside it (so it never moves anything); that page's headline numbers (children, against
// the right); the year picker
export default function PageHeader({ page, year, years, onYear, saveState, children }) {
  const Icon = ICONS[page]
  return (
    <header className="page-head surface">
      <div className="head-title">
        <Icon className="head-icon" />
        <div className="head-text">
          <h1>{TITLES[page]}</h1>
          <p>{today.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</p>
        </div>
      </div>
      <PageNav page={page} />
      <div className="head-save">
        <SaveStatus state={saveState} />
      </div>
      {children}
      {page !== 'glance' && years.length > 1 && (
        <div className="head-right">
          <YearPicker year={year} years={years} onChange={onYear} />
        </div>
      )}
    </header>
  )
}
