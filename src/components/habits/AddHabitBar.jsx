import './AddHabitBar.css'

// "Add habit" and (when any exist) the "Archived (n)" toggle
// full: all 28 colours are claimed, so no new habit can get one of its own
export default function AddHabitBar({ archivedCount, archivedOpen, onAdd, onToggleArchived, full }) {
  return (
    <div className="actions">
      <button className="btn add" onClick={onAdd} disabled={full}>
        Add habit
      </button>
      {full && <p className="add-full">All 28 colours are in use (each habit and plan has its own). Delete a habit or plan to add another.</p>}
      {archivedCount > 0 && (
        <button className="btn add plain" aria-expanded={archivedOpen} onClick={onToggleArchived}>
          Archived ({archivedCount})
        </button>
      )}
    </div>
  )
}
