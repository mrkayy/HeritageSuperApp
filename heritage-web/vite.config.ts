import { defineConfig, loadEnv } from 'vite'
import { devtools } from '@tanstack/devtools-vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    resolve: { tsconfigPaths: true },
    // Browser calls `/api/*` on the same origin so the session cookie is first-party.
    // In production the reverse proxy (e.g. Caddy/Nginx/Vercel rewrite) does the same.
    server: {
      proxy: {
        '/api': { target: env.API_URL ?? 'http://localhost:3001', changeOrigin: false },
      },
    },
    plugins: [devtools(), tailwindcss(), tanstackStart(), viteReact()],
  }
})
