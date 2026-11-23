import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'

const r = p => fileURLToPath(new URL(p, import.meta.url))

export default defineConfig({
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 1600,
    rollupOptions: { input: {
      main: r('./index.html'),
      about: r('./about.html'),
      thirdPlace: r('./third-place/index.html'),
    } },
  },
})
