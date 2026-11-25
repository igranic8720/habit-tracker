import { planColor, planLine } from '../../../lib/plans.js'

// one day of the active cycle on the Today tab: "today" (what you are doing), "up next" (Start), or any other day (Do this day)
export default function CycleDayCard({ plan, step, count, today, next, onLoad }) {
  return (
    <li>
      <button
        type="button"
        className={`wc-day${today ? ' today' : ''}${next ? ' next' : ''}`}
        aria-current={today ? 'true' : undefined}
        data-color={planColor(plan)}
        disabled={today}
        onClick={onLoad}
      >
        <span className="wc-kicker">
          Day {step + 1} of {count}
          {today ? ' · today' : next ? ' · up next' : ''}
        </span>
        <strong>
          <span className="dot" /> {plan.name || 'Untitled plan'}
        </strong>
        <span className="wc-line">{planLine(plan)}</span>
        {!today && <span className={`wc-go${next ? ' primary' : ''}`}>{next ? 'Start' : 'Do this day'}</span>}
      </button>
    </li>
  )
}
