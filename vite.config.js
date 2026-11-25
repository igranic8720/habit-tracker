import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { dataApi } from './server/dev-plugin.js'

export default defineConfig({
  plugins: [react(), dataApi()],
  server: { watch: { ignored: ['**/data/**'] } }, // saving data must not reload the page
})
