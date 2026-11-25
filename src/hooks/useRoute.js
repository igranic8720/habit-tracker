import { useEffect, useState } from 'react'

// pages are picked by the URL hash (no router library, no server routes):
//   #/ habits     #/workouts today's workout     #/workouts/plans     #/workouts/cycles
function read() {
  if (!location.hash.startsWith('#/workouts')) return { page: 'habits', sub: null }
  const sub = location.hash.split('/')[2]
  return { page: 'workouts', sub: sub === 'plans' || sub === 'cycles' ? sub : 'today' }
}

export function useRoute() {
  const [route, setRoute] = useState(read)
  useEffect(() => {
    const onChange = () => {
      setRoute(read())
      window.scrollTo(0, 0)
    }
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])
  useEffect(() => {
    document.title = route.page === 'workouts' ? 'Workouts · Habit Tracker' : 'Habit Tracker'
  }, [route.page])
  return route
}
