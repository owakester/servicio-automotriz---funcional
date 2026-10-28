import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { almacenamientoLocalPlugin } from './server/api.mjs'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue(), almacenamientoLocalPlugin()],
  server: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin-allow-popups'
    },
    port: 5173,
    host: '127.0.0.1', // Datos del taller: acceso únicamente desde esta PC.
    strictPort: true
    
  },
  preview: {
    port: 4173,
    host: '127.0.0.1',
    strictPort: true
  }
})
