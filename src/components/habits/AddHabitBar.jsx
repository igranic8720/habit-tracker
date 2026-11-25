import './AddHabitBar.css'

// "Add habit" and (when any exist) the "Archived (n)" toggle
export default function AddHabitBar({ archivedCount, archivedOpen, onAdd, onToggleArchived }) {
  return (
    <div className="actions">
      <button className="btn add" onClick={onAdd}>
        Add habit
      </button>
      {archivedCount > 0 && (
        <button className="btn add plain" aria-expanded={archivedOpen} onClick={onToggleArchived}>
          Archived ({archivedCount})
        </button>
      )}
    </div>
  )
}
