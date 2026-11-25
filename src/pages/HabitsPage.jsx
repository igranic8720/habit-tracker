import { useState } from 'react'
import ArchivedList from '../components/habits/ArchivedList.jsx'
import Dashboard from '../components/dashboard/Dashboard.jsx'
import AddHabitBar from '../components/habits/AddHabitBar.jsx'
import HabitCard from '../components/habits/HabitCard.jsx'

// layout: dashboard pinned left; habit cards scrolling right (on phones: habits first, dashboard after)
export default function HabitsPage({ habits, year, change, patch, add, remove }) {
  const [showArchived, setShowArchived] = useState(false)
  const active = habits.filter((h) => !h.archived)
  const archived = habits.filter((h) => h.archived)
  return (
    <div className={`workspace${active.length ? ' two' : ''}`}>
      {active.length > 0 && (
        <aside className="side" aria-label="Dashboard">
          <Dashboard habits={active} year={year} />
        </aside>
      )}
      <div className="habits-pane">
        {active.map((h) => (
          <HabitCard key={h.id} habit={h} year={year} onChange={(next) => change(h.id, next)} onArchive={() => patch(h.id, { archived: true })} />
        ))}
        <AddHabitBar
          archivedCount={archived.length}
          archivedOpen={showArchived}
          onAdd={add}
          onToggleArchived={() => setShowArchived(!showArchived)}
        />
        {showArchived && archived.length > 0 && (
          <ArchivedList
            habits={archived}
            onRestore={(h) => patch(h.id, { archived: false })}
            onDelete={(h) => {
              remove(h.id)
              if (archived.length === 1) setShowArchived(false)
            }}
          />
        )}
      </div>
    </div>
  )
}
