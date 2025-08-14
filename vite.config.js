import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  define: {
    // Asegurar que las variables de entorno estén disponibles
    'import.meta.env.VITE_GOOGLE_CLIENT_ID': JSON.stringify(process.env.VITE_GOOGLE_CLIENT_ID || '396701986433-vgqqsijbqm5ak71irloa1t5rbb2thr6u.apps.googleusercontent.com'),
    'import.meta.env.VITE_GOOGLE_CLIENT_SECRET': JSON.stringify(process.env.VITE_GOOGLE_CLIENT_SECRET || ''),
    'import.meta.env.VITE_APP_NAME': JSON.stringify(process.env.VITE_APP_NAME || 'AutoService Pro'),
    'import.meta.env.VITE_APP_VERSION': JSON.stringify(process.env.VITE_APP_VERSION || '1.0.0')
  },
  server: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin-allow-popups'
    },
    port: 5173,
    host: true, // Permite acceso desde la red local
    strictPort: false
    
  },
  preview: {
    port: 4173,
    host: true
  }
})