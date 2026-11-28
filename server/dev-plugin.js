import { calendarApi } from './calendar.js'
import { eventsApi } from './events.js'
import { checklistApi } from './checklist.js'
import { habitApi } from './habits.js'
import { timeApi } from './time.js'
import { workoutApi } from './workouts.js'

// Vite plugin: serves the same API from the dev server (`npm run dev`), so there is no separate backend while developing
export function dataApi() {
  return {
    name: 'data-api',
    configureServer(server) {
      server.middlewares.use('/api/habit', habitApi)
      server.middlewares.use('/api/checklist', checklistApi)
      server.middlewares.use('/api/workouts', workoutApi)
      server.middlewares.use('/api/time', timeApi)
      server.middlewares.use('/api/calendar', calendarApi)
      server.middlewares.use('/api/events', eventsApi)
    },
  }
}
