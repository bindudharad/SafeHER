import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { wgslVitePlugin } from 'vgpu/client'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), wgslVitePlugin()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
      '/check-text': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
      '/check-image': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/tests/setup.ts',
  },
})
