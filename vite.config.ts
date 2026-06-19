import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
    allowedHosts: ['netmap.packnation.org'],
    proxy: {
      '/api': 'http://localhost:3001',
    },
  },
})
