import './SaveStatus.css'
import { CheckCircleFilled, ExclamationCircleFilled, SyncOutlined } from '@ant-design/icons'

const TEXT = { saving: 'Saving…', saved: 'Saved', error: "Couldn't save", conflict: 'Updated elsewhere' }
const ICON = { saving: <SyncOutlined spin />, saved: <CheckCircleFilled />, error: <ExclamationCircleFilled />, conflict: <SyncOutlined /> }

// autosave feedback; "Updated elsewhere" means a newer copy was saved elsewhere, so that was loaded instead
export default function SaveStatus({ state }) {
  return (
    <span className={`save-state ${state}`} role="status" aria-live="polite">
      {ICON[state]}
      {TEXT[state] ?? ''}
    </span>
  )
}
