import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/api/proxy': {
        target: 'https://cf-upscaler-live.s3.amazonaws.com',
        changeOrigin: true,
        rewrite: (path) => {
          const encoded = path.split('?url=')[1]
          if (!encoded) return path
          const fullUrl = decodeURIComponent(encoded)
          return new URL(fullUrl).pathname
        },
      },
    },
  },
})
