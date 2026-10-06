import { createApp } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import App from './App.vue'
import './style.css'
import { useBackupSystem } from './composables/useBackupSystem'
import { focusTrap } from './directives/focusTrap'

// Dashboard se carga inmediatamente por ser la página principal
import Dashboard from './views/Dashboard.vue'

// Lazy loading para las demás rutas
const routes = [
  { path: '/', redirect: '/dashboard' },
  { 
    path: '/dashboard', 
    component: Dashboard, 
    name: 'Dashboard',
    meta: { preload: true }
  },
  { 
    path: '/vehiculos', 
    component: () => import('./views/Vehiculos.vue'), 
    name: 'Vehiculos',
    meta: { preload: true }
  },
  { 
    path: '/servicios', 
    component: () => import('./views/Servicios.vue'), 
    name: 'Servicios' 
  },
  { 
    path: '/ordenes', 
    component: () => import('./views/OrdenesMantenimiento.vue'), 
    name: 'OrdenesMantenimiento' 
  },
  { 
    path: '/clientes', 
    component: () => import('./views/Clientes.vue'), 
    name: 'Clientes',
    meta: { preload: true }
  },
  { 
    path: '/reportes', 
    component: () => import('./views/Reportes.vue'), 
    name: 'Reportes' 
  },
  { 
    path: '/configuracion', 
    component: () => import('./views/Configuracion.vue'), 
    name: 'Configuracion' 
  },
  {
    path: '/ayuda',
    component: () => import('./views/Ayuda.vue'),
    name: 'Ayuda'
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

const app = createApp(App)
app.use(router)
app.directive('focus-trap', focusTrap)

// Precargar rutas marcadas como preload
router.afterEach((to, from) => {
  routes.forEach(route => {
    if (route.meta?.preload && route.component && typeof route.component === 'function') {
      route.component()
    }
  })
})

// Iniciar sistema de backup automático
app.provide('startBackup', () => {
  const { iniciarBackupAutomatico } = useBackupSystem()
  iniciarBackupAutomatico()
})

app.mount('#app')
