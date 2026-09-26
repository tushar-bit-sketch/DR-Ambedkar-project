import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const apiTarget = env.VITE_API_URL || 'http://127.0.0.1:8000/api/v1'
  // Extract base server origin from the full API URL for proxying
  const apiOrigin = (() => {
    try {
      const url = new URL(apiTarget)
      return `${url.protocol}//${url.host}`
    } catch {
      return 'http://127.0.0.1:8000'
    }
  })()

  return {
    plugins: [react()],

    // ---------------------------------------------------------------------------
    // Dev server: proxy /api/v1 to the local FastAPI backend
    // This eliminates CORS issues during local development.
    // ---------------------------------------------------------------------------
    server: {
      port: 5173,
      proxy: {
        '/api/v1': {
          target: apiOrigin,
          changeOrigin: true,
          secure: false,
        },
      },
    },

    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules/lucide-react')) {
              return 'vendor-icons'
            }
            if (
              id.includes('node_modules/react') ||
              id.includes('node_modules/react-dom') ||
              id.includes('node_modules/react-router-dom')
            ) {
              return 'vendor-react'
            }
          },
        },
      },
      chunkSizeWarningLimit: 1200,
    },
  }
})
