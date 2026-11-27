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
  build: {
    chunkSizeWarningLimit: 600,
    rolldownOptions: {
      output: {
        manualChunks(id: string) {
          if (id.includes('node_modules/three')) return 'vendor-three'
          if (id.includes('node_modules/jspdf') || id.includes('node_modules/html2canvas')) return 'vendor-pdf'
          if (id.includes('node_modules/react-dom') || id.includes('node_modules/react-router')) return 'vendor-react'
          if (id.includes('node_modules/lucide-react') || id.includes('node_modules/gsap')) return 'vendor-ui'
        },
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/tests/setup.ts',
  },
})
