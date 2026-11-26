import { useCallback, useEffect, useState } from 'react'
import { startOfDay } from '../lib/time.js'
import { DATA_CHANGE } from './useLiveUpdates.js'

const REFRESH = 5 * 60 * 1000

// calendar events from /api/calendar for the days fromKey (inclusive) to toKey (exclusive); fromKey null: nothing is fetched.
// Refreshed every few minutes and when you come back to the app.
// -> { status: 'loading' | 'ready' | 'failed', configured, connected, syncedAt, error, events, refresh }
export function useCalendarRange(fromKey, toKey) {
  const range = fromKey ? `${fromKey}|${toKey}` : null
  const [got, setGot] = useState(null) // { range, status, configured, connected, syncedAt, error, events }
  const [tick, setTick] = useState(0)
  const refresh = useCallback(() => setTick((n) => n + 1), [])

  // live updates: the calendar was synced or disconnected (from any device) -> fetch again
  useEffect(() => {
    const onChange = (e) => ['calendar', '*'].includes(e.detail?.store) && refresh()
    window.addEventListener(DATA_CHANGE, onChange)
    return () => window.removeEventListener(DATA_CHANGE, onChange)
  }, [refresh])

  useEffect(() => {
    if (!range) return
    const [from, to] = range.split('|')
    let live = true
    const load = async () => {
      try {
        const r = await fetch(`/api/calendar?from=${startOfDay(from)}&to=${startOfDay(to)}`, { cache: 'no-store' })
        if (!r.ok) throw new Error(r.status)
        const body = await r.json()
        if (live) setGot({ range, status: 'ready', configured: body.configured, connected: body.connected, syncedAt: body.syncedAt, error: body.error, events: body.events })
      } catch {
        if (live) setGot((g) => (g?.range === range ? { ...g, status: 'failed' } : { range, status: 'failed', configured: false, connected: false, syncedAt: null, error: null, events: [] }))
      }
    }
    load()
    const timer = setInterval(load, REFRESH)
    const back = () => document.visibilityState === 'visible' && load()
    document.addEventListener('visibilitychange', back)
    return () => {
      live = false
      clearInterval(timer)
      document.removeEventListener('visibilitychange', back)
    }
  }, [range, tick])

  // another range's data is never shown while this one loads
  const shown = got?.range === range ? got : { range, status: 'loading', configured: false, connected: false, syncedAt: null, error: null, events: [] }
  return { ...shown, refresh }
}
