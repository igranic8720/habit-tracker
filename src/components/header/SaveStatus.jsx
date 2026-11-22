import './SaveStatus.css'

const TEXT = { saving: 'Saving…', saved: '✓ Saved', error: "Couldn't save" }

// "Saving… / ✓ Saved / Couldn't save" feedback for the autosave
export default function SaveStatus({ state }) {
  return (
    <span className={`save-state ${state}`} role="status" aria-live="polite">
      {TEXT[state] ?? ''}
    </span>
  )
}
