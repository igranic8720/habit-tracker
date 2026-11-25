import './SaveStatus.css'

const TEXT = { saving: 'Saving…', saved: '✓ Saved', error: "Couldn't save", conflict: 'Updated from another device' }

// autosave feedback; "Updated from another device" means a newer copy was saved elsewhere, so that was loaded instead
export default function SaveStatus({ state }) {
  return (
    <span className={`save-state ${state}`} role="status" aria-live="polite">
      {TEXT[state] ?? ''}
    </span>
  )
}
