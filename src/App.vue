<template>
  <div id="app" class="min-h-screen bg-gray-50">
    <!-- Navbar -->
    <nav class="bg-white shadow-lg" aria-label="Navegación principal">
      <div class="max-w-7xl mx-auto px-4">
        <div class="flex flex-col sm:flex-row sm:justify-between sm:items-center py-2 sm:py-0 sm:h-16 gap-2">
          <div class="flex items-center flex-shrink-0">
            <Car class="h-8 w-8 text-primary-600 mr-2" aria-hidden="true" />
            <span class="text-xl font-bold text-gray-900">ServiceCar</span>
            <RecordatoriosServicios />
          </div>
          
          <div class="flex gap-1 sm:gap-2 overflow-x-auto pb-1 sm:pb-0" aria-label="Secciones del sistema">
            <router-link
              v-for="route in navigation"
              :key="route.name"
              :to="route.path"
              :class="[
                'px-3 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap flex-shrink-0',
                $route.name === route.name
                  ? 'bg-primary-100 text-primary-700'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              ]"
            >
              <component :is="route.icon" class="h-4 w-4 inline mr-2" aria-hidden="true" />
              {{ route.label }}
            </router-link>
          </div>
        </div>
      </div>
    </nav>

    <!-- Main Content -->
    <main class="max-w-7xl mx-auto py-6 px-4">
      <router-view v-if="datosListos" />
      <p v-else role="status" class="text-gray-600">Cargando datos del taller…</p>
    </main>
    
    <!-- Notifications -->
    <NotificationContainer />
    
    <!-- WhatsApp Floating Button -->
    <WhatsAppFloatingButton />
    
  </div>
</template>

<script setup>
import { onMounted, onUnmounted, inject } from 'vue'
import { Car, BarChart3, Users, Wrench, FileText, Settings, ClipboardList, HelpCircle } from 'lucide-vue-next'
import NotificationContainer from './components/NotificationContainer.vue'
import WhatsAppFloatingButton from './components/WhatsAppFloatingButton.vue'
import RecordatoriosServicios from './components/RecordatoriosServicios.vue'
import { useAutoService } from './composables/useAutoService'
import { iniciarRelojCalendario, detenerRelojCalendario } from './composables/useFechaActual'

const { datosListos } = useAutoService()

// Iniciar backup automático
const startBackup = inject('startBackup')
onMounted(() => {
  iniciarRelojCalendario()
  if (startBackup) {
    startBackup()
  }
})
onUnmounted(detenerRelojCalendario)

const navigation = [
  { name: 'Dashboard', path: '/dashboard', label: 'Dashboard', icon: BarChart3 },
  { name: 'Clientes', path: '/clientes', label: 'Clientes', icon: Users },
  { name: 'Vehiculos', path: '/vehiculos', label: 'Vehículos', icon: Car },
  { name: 'OrdenesMantenimiento', path: '/ordenes', label: 'Órdenes', icon: ClipboardList },
  { name: 'Servicios', path: '/servicios', label: 'Servicios', icon: Wrench },
  { name: 'Reportes', path: '/reportes', label: 'Reportes', icon: FileText },
  { name: 'Configuracion', path: '/configuracion', label: 'Configuración', icon: Settings },
  { name: 'Ayuda', path: '/ayuda', label: 'Ayuda', icon: HelpCircle }
]
</script>
