import { useNow } from '../../hooks/useNow.js'
import { clock } from '../../lib/time.js'
import './time.css'
import { CaretRightFilled, StopFilled } from '@ant-design/icons'

// ▶ Start / ■ Stop for one habit or workout. Starting notes the time; stopping saves the session (start and finish) to the daily
// time tracker. There is one timer at a time, so while another thing is being timed this one waits.
// what = { kind, ref, label, color }; onStop(session) lets the caller react.
// compact: a shorter label, for the rows of At a glance
// blocked: why it can't be started (a habit with no daily target yet), shown as its tooltip
export default function TimerButton({ t, what, onStop, compact = false, label, blocked }) {
  const r = t.running
  const mine = !!r && r.kind === what.kind && (r.ref ?? null) === (what.ref ?? null)
  const now = useNow(mine)
  if (t.status !== 'ready') return null
  if (mine) {
    return (
      <button type="button" className={`btn timer-btn running${compact ? ' btn-sm' : ''}`} aria-label={`Stop timing ${what.label}`} onClick={() => { const s = t.stop(); if (s) onStop?.(s) }}>
        <StopFilled /> {compact ? '' : 'Stop · '}<span className="timer-btn-clock">{clock(now - r.start)}</span>
      </button>
    )
  }
  return (
    <button type="button" className={`btn timer-btn${compact ? ' btn-sm' : ''}`} disabled={!!r || !!blocked} title={blocked ?? (r ? `Timing ${r.label} — stop it first` : undefined)} aria-label={`Start timing ${what.label}`} onClick={() => t.start(what)}>
      <CaretRightFilled /> {label ?? (compact ? 'Start' : 'Start timer')}
    </button>
  )
}
