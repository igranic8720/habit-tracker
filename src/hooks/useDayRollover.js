import { useEffect } from 'react'
import { iso, todayKey } from '../lib/dates.js'

// "today" is worked out when the page loads. A tab, or the home-screen app on a phone, can stay open past midnight, and
// would then tick yesterday's square. So when the date has changed (checked every minute and whenever the app comes back
// into view), onNewDay runs: it saves anything pending and reloads.
export function useDayRollover(onNewDay) {
  useEffect(() => {
    let done = false
    const check = () => {
      if (done || iso(new Date()) === todayKey) return
      done = true
      onNewDay()
    }
    const t = setInterval(check, 60000)
    document.addEventListener('visibilitychange', check)
    window.addEventListener('focus', check)
    return () => {
      clearInterval(t)
      document.removeEventListener('visibilitychange', check)
      window.removeEventListener('focus', check)
    }
  }, [onNewDay])
}
