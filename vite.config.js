import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { habitStore } from './habit-store.js'

export default defineConfig({
  plugins: [react(), habitStore()],
  server: { watch: { ignored: ['**/data/**'] } }, // saving a habit shouldn't trigger a page reload
})
