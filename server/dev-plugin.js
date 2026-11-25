import { habitApi } from './habits.js'
import { workoutApi } from './workouts.js'

// Vite plugin: serves the same API from the dev server (`npm run dev`), so there is no separate backend while developing
export function dataApi() {
  return {
    name: 'data-api',
    configureServer(server) {
      server.middlewares.use('/api/habit', habitApi)
      server.middlewares.use('/api/workouts', workoutApi)
    },
  }
}
