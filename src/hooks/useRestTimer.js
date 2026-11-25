import { useCallback, useEffect, useState } from 'react'
import { readStored, writeStored } from '../lib/storage.js'

// the rest timer between sets. It counts to an end time (not ticks), so it is right again after the phone wakes up.
// The running timer survives switching pages (sessionStorage); the rest length you settle on is remembered (localStorage).
export function useRestTimer() {
  const [rest, setRest] = useState(() => {
    const r = readStored(sessionStorage, 'rest')
    return r && r.end > Date.now() ? r : null
  })
  const [length, setLength] = useState(() => readStored(localStorage, 'restSeconds') ?? 90)

  useEffect(() => writeStored(sessionStorage, 'rest', rest), [rest])
  useEffect(() => writeStored(localStorage, 'restSeconds', length), [length])

  const start = useCallback(() => {
    const now = Date.now()
    setRest({ start: now, end: now + length * 1000 })
  }, [length])
  // ±15 s on the running rest; the new total becomes your default rest length
  const adjust = useCallback((seconds) => {
    setRest((r) => {
      if (!r) return r
      const end = Math.max(Date.now(), r.end + seconds * 1000)
      setLength(Math.min(600, Math.max(15, Math.round((end - r.start) / 1000 / 15) * 15)))
      return { ...r, end }
    })
  }, [])
  const stop = useCallback(() => setRest(null), []) // stable, so the timer's own clean-up doesn't restart on every render

  return { rest, start, adjust, stop } // rest: { start, end } in ms, or null
}
