import './WorkoutTabs.css'

const TABS = [
  { id: 'today', label: 'Today', href: '#/workouts' },
  { id: 'plans', label: 'Plans', href: '#/workouts/plans' },
  { id: 'cycles', label: 'Cycles', href: '#/workouts/cycles' },
]

// the Workouts page's own sections: today's session, your plans, your cycles
export default function WorkoutTabs({ sub }) {
  return (
    <nav className="subtabs" aria-label="Workout sections">
      {TABS.map((t) => (
        <a key={t.id} href={t.href} className={t.id === sub ? 'on' : ''} aria-current={t.id === sub ? 'page' : undefined}>
          {t.label}
        </a>
      ))}
    </nav>
  )
}
