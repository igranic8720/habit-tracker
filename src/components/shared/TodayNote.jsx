import './TodayNote.css'

// today's note box with the "Mark today / Done today" button beside it (current year only)
export default function TodayNote({ inputRef, note, done, onNote, onToggle, showButton = true }) {
  return (
    <div className="today-row">
      <textarea
        ref={inputRef}
        className="quick-note"
        aria-label="Note for today"
        placeholder="Add a note for today…"
        rows={1}
        maxLength={2000}
        value={note}
        onChange={(e) => onNote(e.target.value)}
      />
      {showButton && (
        <button className={`btn today${done ? ' done' : ''}`} onClick={onToggle}>
          {done ? '✓ Done today' : 'Mark today'}
        </button>
      )}
    </div>
  )
}
