import './time.css'
import { HOUR, duration, lastDays } from '../../lib/time.js'
import { todayKey } from '../../lib/dates.js'
import Panel from '../shared/Panel.jsx'

// time spent per day for the last two weeks (pick a bar to open that day)
export default function DailyBars({ map, selected, onPick }) {
  const days = lastDays(map, todayKey, 14)
  const max = Math.max(HOUR, ...days.map((d) => d.ms))
  const avg = days.reduce((n, d) => n + d.ms, 0) / days.length
  return (
    <Panel title="Daily time" label="Daily time, last 14 days">
      <p className="day-total"><strong>{duration(avg)}</strong> a day on average</p>
      <div className="dbars">
        {days.map((d) => (
          <button key={d.key} type="button" className={`dbar${d.key === selected ? ' dbar-sel' : ''}`} aria-label={`${d.key}: ${duration(d.ms)}`} title={`${d.key}: ${duration(d.ms)}`} onClick={() => onPick(d.key)}>
            <span className="dbar-fill" style={{ height: `${(d.ms / max) * 100}%` }} />
            <span className="dbar-day">{Number(d.key.slice(8))}</span>
          </button>
        ))}
      </div>
      <div className="dbar-scale"><span>0</span><span>{duration(max)}</span></div>
    </Panel>
  )
}
