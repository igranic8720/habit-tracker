import { useEffect, useState } from 'react'
import { timeOfDay } from '../../lib/time.js'
import './time.css'

const post = (path) => fetch(`/api/calendar/${path}`, { method: 'POST' }).then(async (r) => ({ ok: r.ok, body: await r.json().catch(() => ({})) }))

// the foot of the Day view: connect your Microsoft calendar (a code to enter at microsoft.com/link), then sync / disconnect
export default function CalendarConnect({ cal }) {
  const [flow, setFlow] = useState(null) // the sign-in in progress: { state, userCode, verificationUri, error }
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState(null)

  // while signing in, ask every 3 seconds whether it has been approved
  const waiting = flow?.state === 'pending'
  useEffect(() => {
    if (!waiting) return
    const t = setInterval(async () => {
      try {
        const next = await (await fetch('/api/calendar/connect', { cache: 'no-store' })).json()
        setFlow(next)
        if (next.state === 'done') cal.refresh()
      } catch {
        /* try again next time */
      }
    }, 3000)
    return () => clearInterval(t)
  }, [waiting, cal])

  if (cal.status === 'loading') return null
  if (!cal.configured && !cal.connected) return null // no Microsoft app set up on the server: nothing to offer

  const start = async () => {
    setBusy(true)
    setMsg(null)
    const r = await post('connect').catch(() => ({ ok: false, body: {} }))
    setBusy(false)
    if (r.ok) setFlow(r.body)
    else setMsg(r.body.error ?? 'Could not start the sign-in.')
  }
  const syncNow = async () => {
    setBusy(true)
    const r = await post('sync').catch(() => ({ ok: false, body: {} }))
    setBusy(false)
    setMsg(r.body.ok ? null : r.body.error === 'signin-expired' ? 'Your sign-in expired. Reconnect.' : 'Could not reach your calendar. Try again later.')
    cal.refresh()
  }
  const disconnect = async () => {
    if (!confirm('Disconnect your Microsoft calendar? Its events are removed from this app (your calendar itself is not touched).')) return
    await post('disconnect')
    setFlow(null)
    cal.refresh()
  }

  if (flow?.state === 'pending') {
    return (
      <div className="cal-connect" role="status">
        <p>
          Go to <a href={flow.verificationUri} target="_blank" rel="noreferrer">{flow.verificationUri.replace(/^https?:\/\//, '')}</a> and enter this code:
        </p>
        <p className="cal-code" aria-label={`Code ${flow.userCode.split('').join(' ')}`}>{flow.userCode}</p>
        <p className="cal-note">Sign in with your Outlook account and approve “read your calendar”. This page continues by itself.</p>
      </div>
    )
  }
  const error = flow?.state === 'error' ? flow.error : msg
  if (cal.connected && cal.error !== 'signin-expired') {
    return (
      <div className="cal-connect is-connected">
        <p className="cal-note">
          Microsoft calendar{cal.syncedAt ? ` · synced ${timeOfDay(cal.syncedAt)}` : ' · not synced yet'}
          {cal.error === 'sync-failed' && ' · last sync failed'}
        </p>
        <div className="cal-actions">
          <button type="button" className="btn btn-sm" disabled={busy} onClick={syncNow}>Sync now</button>
          <button type="button" className="btn btn-sm btn-danger" onClick={disconnect}>Disconnect</button>
        </div>
        {error && <p className="cal-error">{error}</p>}
      </div>
    )
  }
  return (
    <div className="cal-connect">
      {cal.error === 'signin-expired' && <p className="cal-error">Your Microsoft sign-in expired.</p>}
      <button type="button" className="btn btn-sm" disabled={busy} onClick={start}>
        {cal.error === 'signin-expired' ? 'Reconnect Microsoft calendar' : 'Connect Microsoft calendar'}
      </button>
      {error && <p className="cal-error">{error}</p>}
    </div>
  )
}
