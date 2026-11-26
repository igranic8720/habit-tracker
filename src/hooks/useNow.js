import { useEffect, useState } from 'react'

// the current time as a number, refreshed every `every` ms while `active` (a running clock)
export function useNow(active, every = 1000) {
  const [now, setNow] = useState(Date.now)
  useEffect(() => {
    if (!active) return
    const t = setInterval(() => setNow(Date.now()), every)
    return () => clearInterval(t)
  }, [active, every])
  return now
}
