import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  server: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin-allow-popups'
    },
    port: 5173,
    host: true, // Permite acceso desde la red local
    strictPort: true
    
  },
  preview: {
    port: 4173,
    host: true,
    strictPort: true
  }
})
