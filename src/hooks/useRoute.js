import { useEffect, useState } from 'react'

// pages are picked by the URL hash (no router library, no server routes):
//   #/ at a glance (the home page; #/time, its old address, still works)    #/timeline its Timeline tab (phones)
//   #/habits     #/habits/dashboard (phones)
//   #/workouts today's workout     #/workouts/plans     #/workouts/cycles     #/workouts/graphs (phones)
const TITLES = { glance: 'At a glance', habits: 'Habits', workouts: 'Workouts' }

function read() {
  const h = location.hash
  if (h.startsWith('#/habits')) return { page: 'habits', sub: h.split('/')[2] === 'dashboard' ? 'dashboard' : 'list' }
  if (h.startsWith('#/timeline')) return { page: 'glance', sub: 'timeline' }
  if (h.startsWith('#/workouts')) {
    const sub = h.split('/')[2]
    return { page: 'workouts', sub: ['plans', 'cycles', 'graphs'].includes(sub) ? sub : 'today' }
  }
  return { page: 'glance', sub: 'overview' }
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
    document.title = `${TITLES[route.page]} · Habit Tracker`
  }, [route.page])
  return route
}
