import './SubTabs.css'

// a page's own sections as a row of equal tabs (Workouts: Today / Plans / Cycles / Graphs; Habits and At a glance on phones).
// tabs: [{ id, label, href, Icon?, phoneOnly? }]; each is a link, so the back button works. phoneOnly tabs (and a bar with
// className "phone-only") only show where the page is one column: there they stand in for the second column.
export default function SubTabs({ label, tabs, current, className = '' }) {
  return (
    <nav className={`subtabs ${className}`} aria-label={label}>
      {tabs.map((t) => (
        <a key={t.id} href={t.href} className={`${t.id === current ? 'on' : ''}${t.phoneOnly ? ' phone-only' : ''}`} aria-current={t.id === current ? 'page' : undefined}>
          {t.Icon && <t.Icon className="subtabs-icon" aria-hidden="true" />}
          <span>{t.label}</span>
        </a>
      ))}
    </nav>
  )
}
