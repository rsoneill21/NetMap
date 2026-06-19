import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // NETMAP_ALLOWED_HOST is read from .env.local (gitignored) so each install can set its own
  // public hostname (e.g. for a Cloudflare Tunnel) without committing it to the repo.
  const env = loadEnv(mode, process.cwd(), '')
  const allowedHosts = env.NETMAP_ALLOWED_HOST
    ? env.NETMAP_ALLOWED_HOST.split(',').map((h) => h.trim()).filter(Boolean)
    : undefined

  return {
    plugins: [react()],
    server: {
      port: 5173,
      strictPort: true,
      allowedHosts,
      proxy: {
        '/api': 'http://localhost:3001',
      },
    },
  }
})
