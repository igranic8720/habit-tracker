import { useState } from 'react'
import ArchivedList from './components/archive/ArchivedList.jsx'
import Dashboard from './components/dashboard/Dashboard.jsx'
import PageHeader from './components/header/PageHeader.jsx'
import AddHabitBar from './components/habit/AddHabitBar.jsx'
import HabitCard from './components/habit/HabitCard.jsx'
import { useHabits } from './hooks/useHabits.js'
import { YEAR } from './lib/dates.js'
import { browsableYears } from './lib/habits.js'

// layout: fixed header on top; dashboard pinned left; habit cards scrolling right
export default function App() {
  const { habits, loaded, saveState, change, patch, add, remove } = useHabits()
  const [year, setYear] = useState(YEAR)
  const [showArchived, setShowArchived] = useState(false)

  if (!loaded) return null

  const { firstYear, years } = browsableYears(habits)
  const active = habits.filter((h) => !h.archived)
  const archived = habits.filter((h) => h.archived)

  return (
    <main>
      <PageHeader habits={active} year={year} years={years} firstYear={firstYear} onYear={setYear} saveState={saveState} />
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
    </main>
  )
}
