<template>
  <div id="app" class="min-h-screen bg-gray-50">
    <!-- Navbar -->
    <nav class="bg-white shadow-lg">
      <div class="max-w-7xl mx-auto px-4">
        <div class="flex justify-between items-center h-16">
          <div class="flex items-center">
            <Car class="h-8 w-8 text-primary-600 mr-2" />
            <span class="text-xl font-bold text-gray-900">ServiceCar</span>
          </div>
          
          <div class="flex space-x-4">
            <router-link
              v-for="route in navigation"
              :key="route.name"
              :to="route.path"
              :class="[
                'px-3 py-2 rounded-md text-sm font-medium transition-colors',
                $route.name === route.name
                  ? 'bg-primary-100 text-primary-700'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              ]"
            >
              <component :is="route.icon" class="h-4 w-4 inline mr-2" />
              {{ route.label }}
            </router-link>
          </div>
        </div>
      </div>
    </nav>

    <!-- Main Content -->
    <main class="max-w-7xl mx-auto py-6 px-4">
      <router-view />
    </main>
    
    <!-- Notifications -->
    <NotificationContainer />
    
    <!-- WhatsApp Floating Button -->
    <WhatsAppFloatingButton />
    
    <!-- Performance Monitor (solo en desarrollo) -->
    <PerformanceMonitor 
      v-if="showPerformanceMonitor"
      :show-monitor="showPerformanceMonitor"
      @close="showPerformanceMonitor = false"
    />
    
    <!-- Botón para activar monitor (solo en desarrollo) -->
    <button
      v-if="isDevelopment"
      @click="showPerformanceMonitor = !showPerformanceMonitor"
      class="fixed bottom-4 left-4 bg-gray-800 text-white p-2 rounded-full shadow-lg hover:bg-gray-700 transition-colors z-40"
      title="Toggle Performance Monitor"
    >
      <Activity class="h-5 w-5" />
    </button>
  </div>
</template>

<script setup>
import { ref, onMounted, inject } from 'vue'
import { Car, BarChart3, Users, Wrench, FileText, Settings, ClipboardList, Activity } from 'lucide-vue-next'
import NotificationContainer from './components/NotificationContainer.vue'
import WhatsAppFloatingButton from './components/WhatsAppFloatingButton.vue'
import PerformanceMonitor from './components/PerformanceMonitor.vue'

// Estado
const showPerformanceMonitor = ref(false)
const isDevelopment = ref(import.meta.env.DEV)

// Iniciar backup automático
const startBackup = inject('startBackup')
onMounted(() => {
  if (startBackup) {
    startBackup()
  }
  
  // Atajos de teclado para desarrolladores
  if (isDevelopment.value) {
    window.addEventListener('keydown', (e) => {
      // Ctrl+Shift+P para toggle performance monitor
      if (e.ctrlKey && e.shiftKey && e.key === 'P') {
        showPerformanceMonitor.value = !showPerformanceMonitor.value
      }
    })
  }
})

const navigation = [
  { name: 'Dashboard', path: '/dashboard', label: 'Dashboard', icon: BarChart3 },
  { name: 'Vehiculos', path: '/vehiculos', label: 'Vehículos', icon: Car },
  { name: 'Servicios', path: '/servicios', label: 'Servicios', icon: Wrench },
  { name: 'OrdenesMantenimiento', path: '/ordenes', label: 'Órdenes', icon: ClipboardList },
  { name: 'Clientes', path: '/clientes', label: 'Clientes', icon: Users },
  { name: 'Reportes', path: '/reportes', label: 'Reportes', icon: FileText },
  { name: 'Configuracion', path: '/configuracion', label: 'Configuración', icon: Settings }
]
</script>
