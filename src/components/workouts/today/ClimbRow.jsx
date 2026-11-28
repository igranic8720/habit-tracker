import { GRADES } from '../../../lib/workouts.js'
import { CheckOutlined, CloseOutlined } from '@ant-design/icons'

// one problem of a climb (MoonBoard): its grade (the plan's target to start with; change it to what you actually climbed), then
// Sent or Not sent, which logs it (and starts the rest). Pressing the same answer again un-logs it. A send harder than any before
// is a PR.
export default function ClimbRow({ set, n, isNext, pr, onGrade, onLog, onRemove }) {
  const done = set.done !== false
  return (
    <li className={`climb-row${done ? ' is-done' : isNext ? ' is-next' : ''}`}>
      <span className="wl-n">{n}</span>
      <select className="climb-grade chevron" aria-label={`Problem ${n} grade`} value={set.grade} onChange={(e) => onGrade(e.target.value)}>
        {GRADES.map((g) => (
          <option key={g.v} value={g.v}>
            {g.v} · {g.font}
          </option>
        ))}
      </select>
      <span className="climb-answer" role="group" aria-label={`Problem ${n}: sent or not`}>
        <button type="button" className={`climb-btn sent${done && set.sent ? ' on' : ''}`} aria-pressed={done && set.sent} onClick={() => onLog(true)}>
          <CheckOutlined /> Sent
        </button>
        <button type="button" className={`climb-btn not${done && !set.sent ? ' on' : ''}`} aria-pressed={done && !set.sent} onClick={() => onLog(false)}>
          <CloseOutlined /> Not sent
        </button>
      </span>
      {pr && (
        <span className="wl-pr" title="Personal best: harder than anything you've sent on this before">
          PR
        </span>
      )}
      <button type="button" className="wl-x" aria-label={`Remove problem ${n}`} title="Remove problem" onClick={onRemove}>
        <CloseOutlined />
      </button>
    </li>
  )
}
