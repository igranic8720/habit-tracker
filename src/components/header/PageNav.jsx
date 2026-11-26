import './PageNav.css'

const TABS = [
  { id: 'glance', label: 'At a glance', href: '#/' },
  { id: 'habits', label: 'Habits', href: '#/habits' },
  { id: 'workouts', label: 'Workouts', href: '#/workouts' },
]

// At a glance | Habits | Workouts: a switch in the header on wide screens, a tab bar at the bottom of the screen on phones
export default function PageNav({ page }) {
  return (
    <nav className="page-nav" aria-label="Pages">
      {TABS.map((t) => (
        <a key={t.id} href={t.href} className={t.id === page ? 'on' : ''} aria-current={t.id === page ? 'page' : undefined}>
          {t.label}
        </a>
      ))}
    </nav>
  )
}
