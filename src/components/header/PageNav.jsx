import './PageNav.css'

const TABS = [
  { id: 'habits', label: 'Habits', href: '#/' },
  { id: 'workouts', label: 'Workouts', href: '#/workouts' },
]

// Habits | Workouts: a switch in the header on wide screens, a tab bar at the bottom of the screen on phones
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
