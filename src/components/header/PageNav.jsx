import './PageNav.css'
import { CheckSquareOutlined, DashboardOutlined, FireOutlined } from '@ant-design/icons'

// each page with the mark it has beside its title (PageHeader)
const TABS = [
  { id: 'glance', label: 'At a glance', href: '#/', Icon: DashboardOutlined },
  { id: 'habits', label: 'Habits', href: '#/habits', Icon: CheckSquareOutlined },
  { id: 'workouts', label: 'Workouts', href: '#/workouts', Icon: FireOutlined },
]

// At a glance | Habits | Workouts: tabs in the header on wide screens, a tab bar at the bottom of the screen on phones
export default function PageNav({ page }) {
  return (
    <nav className="page-nav" aria-label="Pages">
      {TABS.map(({ id, label, href, Icon }) => (
        <a key={id} href={href} className={id === page ? 'on' : ''} aria-current={id === page ? 'page' : undefined}>
          <Icon className="page-nav-icon" aria-hidden="true" />
          <span>{label}</span>
        </a>
      ))}
    </nav>
  )
}
