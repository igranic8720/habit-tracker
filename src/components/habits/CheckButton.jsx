import { CheckSquareOutlined } from '@ant-design/icons'
import './CheckButton.css'

// a checklist habit's tick for today: press it once you've done it (again to undo)
export default function CheckButton({ done, label, onToggle }) {
  return (
    <button type="button" className={`btn check-btn${done ? ' on' : ''}`} aria-pressed={done} aria-label={`${label}: done today`} onClick={onToggle}>
      <CheckSquareOutlined /> {done ? 'Done today' : 'Mark done today'}
    </button>
  )
}
