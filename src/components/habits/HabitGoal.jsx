import { TARGET_MAX, TARGET_STEP, stepTarget, targetText } from '../../lib/habits.js'
import { duration } from '../../lib/time.js'
import './HabitGoal.css'
import { CheckOutlined, DownOutlined, UpOutlined } from '@ant-design/icons'

// a habit's daily target (required: reaching it is what makes a day done), set with up / down arrows in 15-minute steps from 15m
// to 24h (the arrow keys work too; Page Up / Down move an hour), and today's progress towards it.
export default function HabitGoal({ habit, ms, done, onTarget }) {
  const target = habit.target
  const pct = target ? Math.min(100, (ms / (target * 60000)) * 100) : 0
  const step = (dir, times = 1) => {
    let next = target
    for (let i = 0; i < times; i++) next = stepTarget(next, dir)
    if (next && next !== target) onTarget(next)
  }
  const keys = { ArrowUp: () => step(1), ArrowRight: () => step(1), ArrowDown: () => step(-1), ArrowLeft: () => step(-1), PageUp: () => step(1, 4), PageDown: () => step(-1, 4), Home: () => onTarget(TARGET_STEP), End: () => onTarget(TARGET_MAX) }
  return (
    <div className={`goal${done ? ' is-done' : ''}`}>
      <div className="goal-pick">
        <span id={`goal-${habit.id}`}>Daily target</span>
        <div className={`goal-step${target ? '' : ' unset'}`}>
          <button type="button" className="goal-arrow" aria-label="15 minutes less" disabled={!target || target <= TARGET_STEP} onClick={() => step(-1)}>
            <DownOutlined />
          </button>
          <span
            className="goal-value"
            role="spinbutton"
            tabIndex={0}
            aria-labelledby={`goal-${habit.id}`}
            aria-valuemin={TARGET_STEP}
            aria-valuemax={TARGET_MAX}
            aria-valuenow={target ?? undefined}
            aria-valuetext={target ? targetText(target) : 'not set'}
            onKeyDown={(e) => {
              if (!keys[e.key]) return
              e.preventDefault()
              keys[e.key]()
            }}
          >
            {target ? targetText(target) : 'Set'}
          </span>
          <button type="button" className="goal-arrow" aria-label="15 minutes more" disabled={target >= TARGET_MAX} onClick={() => step(1)}>
            <UpOutlined />
          </button>
        </div>
      </div>
      {target ? (
        <div className={`goal-progress${ms > 0 ? '' : ' none'}`}>
          {/* the bar shows once there is time today (an empty one looked like an empty box), labelled as what it is */}
          {ms > 0 && <span className="goal-label" id={`goal-p-${habit.id}`}>Today’s progress</span>}
          {ms > 0 && <div className="goal-bar" role="progressbar" aria-labelledby={`goal-p-${habit.id}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(pct)}>
            <span style={{ width: `${pct}%` }} />
          </div>}
          <span className="goal-text">
            {done ? <><CheckOutlined /> Done today · {duration(ms)}</> : ms > 0 ? `${duration(ms)} of ${targetText(target)} · ${Math.floor(pct)}%` : `0m of ${targetText(target)} today`}
          </span>
        </div>
      ) : (
        <p className="goal-hint">Required. Press the up arrow to set it: the habit is done each day its tracked time reaches this.</p>
      )}
    </div>
  )
}
