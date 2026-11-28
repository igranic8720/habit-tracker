import { useState } from 'react'
import ArchivedList from '../components/habits/ArchivedList.jsx'
import Dashboard from '../components/dashboard/Dashboard.jsx'
import { freeColor } from '../lib/habits.js'
import AddHabitBar from '../components/habits/AddHabitBar.jsx'
import HabitCard from '../components/habits/HabitCard.jsx'
import SubTabs from '../components/shared/SubTabs.jsx'

const TABS = [
  { id: 'list', label: 'Habits', href: '#/habits' },
  { id: 'dashboard', label: 'Dashboard', href: '#/habits/dashboard' },
]

// layout: dashboard pinned left; habit cards scrolling right. Phones (one column): two tabs, Habits and Dashboard
export default function HabitsPage({ habits, year, time, taken, change, patch, add, addCheck, remove, sub }) {
  const [showArchived, setShowArchived] = useState(false)
  const active = habits.filter((h) => !h.archived)
  const archived = habits.filter((h) => h.archived)
  return (
    <div className={`workspace${active.length ? ' two' : ''} show-${sub === 'dashboard' && active.length ? 'side' : 'main'}`}>
      {active.length > 0 && <SubTabs label="Habits sections" tabs={TABS} current={sub === 'dashboard' ? 'dashboard' : 'list'} className="phone-only page-tabs" />}
      {active.length > 0 && (
        <aside className="side" aria-label="Dashboard">
          <Dashboard habits={active} year={year} />
        </aside>
      )}
      <div className="habits-pane habit-cards">
        {active.map((h) => (
          <HabitCard key={h.id} habit={h} year={year} time={time} taken={taken} onChange={(next) => change(h.id, next)} onArchive={() => patch(h.id, { archived: true })} />
        ))}
        <AddHabitBar
          archivedCount={archived.length}
          archivedOpen={showArchived}
          onAdd={add}
          onAddCheck={addCheck}
          full={freeColor([...taken.keys()]) === null}
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
