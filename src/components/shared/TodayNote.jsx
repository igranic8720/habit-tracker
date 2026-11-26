import './TodayNote.css'

// today's note box, with anything else for today beside it (`extra`: a habit's or workout's timer). Current year only.
export default function TodayNote({ inputRef, note, onNote, extra, label = 'Note for today' }) {
  return (
    <div className="today-row">
      <textarea
        ref={inputRef}
        className="quick-note"
        aria-label={label}
        placeholder="Add a note for today…"
        rows={1}
        maxLength={2000}
        value={note}
        onChange={(e) => onNote(e.target.value)}
      />
      {extra}
    </div>
  )
}
