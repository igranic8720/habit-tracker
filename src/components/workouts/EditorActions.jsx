// the bottom of an editor: Save (only when the form is valid), Cancel, and Delete when editing something that exists
export default function EditorActions({ what, valid, onCancel, onDelete }) {
  return (
    <div className="pe-actions">
      <button type="submit" className="btn btn-primary" disabled={!valid}>
        {`Save ${what}`}
      </button>
      <button type="button" className="btn" onClick={onCancel}>
        Cancel
      </button>
      {onDelete && (
        <button type="button" className="btn btn-danger pe-delete" onClick={onDelete}>
          {`Delete ${what}`}
        </button>
      )}
    </div>
  )
}
