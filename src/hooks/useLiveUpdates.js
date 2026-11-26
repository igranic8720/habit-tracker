import { useEffect } from 'react'

// Live updates (see server/events.js): one connection to /api/events for the whole app. Each message names a store that was
// just saved somewhere (another device, another tab); it is passed on as a window event, 'data-change' { store, version },
// and the hooks holding that store reload it (useAutosave, useCalendarRange).
// After the connection drops and comes back, or when the app comes back to the screen, every store is checked ({ store: '*' }),
// since messages sent in the meantime were missed.
export const DATA_CHANGE = 'data-change'
const tell = (detail) => window.dispatchEvent(new CustomEvent(DATA_CHANGE, { detail }))

export function useLiveUpdates() {
  useEffect(() => {
    if (typeof EventSource === 'undefined') return
    const source = new EventSource('/api/events')
    let dropped = false
    source.addEventListener('change', (e) => {
      try {
        tell(JSON.parse(e.data))
      } catch {
        /* not ours */
      }
    })
    source.addEventListener('error', () => (dropped = true)) // it reconnects by itself
    source.addEventListener('open', () => {
      if (dropped) tell({ store: '*' })
      dropped = false
    })
    const back = () => document.visibilityState === 'visible' && tell({ store: '*' })
    document.addEventListener('visibilitychange', back)
    return () => {
      source.close()
      document.removeEventListener('visibilitychange', back)
    }
  }, [])
}
