<template>
  <div class="fixed bottom-6 right-6 z-50">
    <!-- Botón principal -->
    <button
      type="button"
      @click="toggleMenu"
      class="bg-green-500 hover:bg-green-600 text-white rounded-full p-4 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-110"
      :class="{ 'rotate-45': menuAbierto }"
      :aria-label="menuAbierto ? 'Cerrar acciones de WhatsApp' : 'Abrir acciones de WhatsApp'"
      :title="menuAbierto ? 'Cerrar acciones de WhatsApp' : 'Acciones de WhatsApp'"
      :aria-expanded="menuAbierto"
      aria-controls="whatsapp-actions-menu"
    >
      <MessageCircle class="h-6 w-6" aria-hidden="true" />
    </button>

    <!-- Menú desplegable -->
    <Transition name="fade-up">
      <div
        v-if="menuAbierto"
        id="whatsapp-actions-menu"
        role="menu"
        aria-label="Acciones de WhatsApp"
        class="absolute bottom-16 right-0 bg-white rounded-lg shadow-xl border border-gray-200 py-2 min-w-[200px]"
      >
        <div class="px-4 py-2 border-b border-gray-100">
          <h3 class="text-sm font-semibold text-gray-700">Acciones WhatsApp</h3>
        </div>
        
        <!-- Auto listo -->
        <button
          v-if="ordenesCompletadas.length > 0"
          type="button"
          role="menuitem"
          @click="mostrarOrdenesCompletadas"
          class="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors flex items-center"
        >
          <CheckCircle class="h-4 w-4 mr-3 text-green-500" />
          <div>
            <div class="text-sm font-medium text-gray-900">Auto Listo</div>
            <div class="text-xs text-gray-500">{{ ordenesCompletadas.length }} completada(s)</div>
          </div>
        </button>

        <!-- Recordatorios de servicio -->
        <button
          v-if="vehiculosConAlertas.length > 0"
          type="button"
          role="menuitem"
          @click="mostrarRecordatorios"
          class="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors flex items-center"
        >
          <Clock class="h-4 w-4 mr-3 text-yellow-500" />
          <div>
            <div class="text-sm font-medium text-gray-900">Recordatorios</div>
            <div class="text-xs text-gray-500">{{ vehiculosConAlertas.length }} vehículo(s)</div>
          </div>
        </button>

        <!-- Contacto directo -->
        <button
          type="button"
          role="menuitem"
          @click="mostrarContactoDirecto"
          class="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors flex items-center"
        >
          <Phone class="h-4 w-4 mr-3 text-blue-500" />
          <div>
            <div class="text-sm font-medium text-gray-900">Contacto Directo</div>
            <div class="text-xs text-gray-500">Enviar mensaje a cliente</div>
          </div>
        </button>
      </div>
    </Transition>

    <!-- Modal para seleccionar orden completada -->
    <Teleport to="body">
      <div
        v-if="mostrarModalOrdenes"
        class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
        @click="cerrarModalOrdenes"
        @keydown.esc="cerrarModalOrdenes"
      >
        <div v-focus-trap class="bg-white rounded-lg p-6 w-full max-w-md mx-4 max-h-[70vh] overflow-y-auto" @click.stop role="dialog" aria-modal="true" aria-labelledby="whatsapp-ready-title" tabindex="-1">
          <h3 id="whatsapp-ready-title" class="text-lg font-bold text-gray-900 mb-4 flex items-center">
            <CheckCircle class="h-5 w-5 mr-2 text-green-500" aria-hidden="true" />
            Autos Listos
          </h3>
          
          <div class="space-y-3">
            <div
              v-for="orden in ordenesCompletadas"
              :key="orden.id"
              class="border border-gray-200 rounded-lg p-3 hover:bg-gray-50 transition-colors"
            >
              <div class="flex justify-between items-start">
                <div class="flex-1">
                  <div class="font-medium text-gray-900">{{ orden.cliente?.nombre }}</div>
                  <div class="text-sm text-gray-600">{{ orden.vehiculo?.marca }} {{ orden.vehiculo?.modelo }} - {{ orden.vehiculo?.patente }}</div>
                  <div class="text-xs text-gray-500 mt-1">Orden: {{ orden.numeroOrden }}</div>
                </div>
                <button
                  @click="notificarAutoListoWhatsApp(orden)"
                  class="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded text-sm transition-colors"
                >
                  Notificar
                </button>
              </div>
            </div>
          </div>

          <button
            @click="cerrarModalOrdenes"
            class="mt-4 w-full btn-secondary"
          >
            Cerrar
          </button>
        </div>
      </div>
    </Teleport>

    <!-- Modal para recordatorios -->
    <Teleport to="body">
      <div
        v-if="mostrarModalRecordatorios"
        class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
        @click="cerrarModalRecordatorios"
        @keydown.esc="cerrarModalRecordatorios"
      >
        <div v-focus-trap class="bg-white rounded-lg p-6 w-full max-w-md mx-4 max-h-[70vh] overflow-y-auto" @click.stop role="dialog" aria-modal="true" aria-labelledby="whatsapp-reminders-title" tabindex="-1">
          <h3 id="whatsapp-reminders-title" class="text-lg font-bold text-gray-900 mb-4 flex items-center">
            <Clock class="h-5 w-5 mr-2 text-yellow-500" aria-hidden="true" />
            Recordatorios de Servicio
          </h3>
          
          <div class="space-y-3">
            <div
              v-for="vehiculo in vehiculosConAlertas"
              :key="vehiculo.id"
              class="border border-gray-200 rounded-lg p-3 hover:bg-gray-50 transition-colors"
            >
              <div class="flex justify-between items-start">
                <div class="flex-1">
                  <div class="font-medium text-gray-900">{{ vehiculo.cliente?.nombre }}</div>
                  <div class="text-sm text-gray-600">{{ vehiculo.marca }} {{ vehiculo.modelo }} - {{ vehiculo.patente }}</div>
                  <div 
                    :class="[
                      'text-xs mt-1',
                      vehiculo.alerta?.tipo === 'vencido' ? 'text-red-600' :
                      vehiculo.alerta?.tipo === 'urgente' ? 'text-orange-600' :
                      'text-yellow-600'
                    ]"
                  >
                    {{ getAlertaTexto(vehiculo.alerta) }}
                  </div>
                </div>
                <button
                  @click="enviarRecordatorio(vehiculo)"
                  class="bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1 rounded text-sm transition-colors"
                >
                  Recordar
                </button>
              </div>
            </div>
          </div>

          <button
            @click="cerrarModalRecordatorios"
            class="mt-4 w-full btn-secondary"
          >
            Cerrar
          </button>
        </div>
      </div>
    </Teleport>

    <!-- Modal para contacto directo -->
    <Teleport to="body">
      <div
        v-if="mostrarModalContacto"
        class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
        @click="cerrarModalContacto"
        @keydown.esc="cerrarModalContacto"
      >
        <div v-focus-trap class="bg-white rounded-lg p-6 w-full max-w-md mx-4 max-h-[70vh] overflow-y-auto" @click.stop role="dialog" aria-modal="true" aria-labelledby="whatsapp-contact-title" tabindex="-1">
          <h3 id="whatsapp-contact-title" class="text-lg font-bold text-gray-900 mb-4 flex items-center">
            <Phone class="h-5 w-5 mr-2 text-blue-500" aria-hidden="true" />
            Contacto Directo
          </h3>
          
          <div class="mb-4">
            <input
              v-model="filtroContacto"
              type="text"
              placeholder="Buscar cliente..."
              aria-label="Buscar cliente para contactar"
              class="input-field"
            />
          </div>

          <div class="space-y-3 max-h-60 overflow-y-auto">
            <div
              v-for="cliente in clientesFiltrados"
              :key="cliente.id"
              class="border border-gray-200 rounded-lg p-3 hover:bg-gray-50 transition-colors"
            >
              <div class="flex justify-between items-center">
                <div class="flex-1">
                  <div class="font-medium text-gray-900">{{ cliente.nombre }}</div>
                  <div class="text-sm text-gray-600">{{ formatearTelefonoDisplay(cliente.telefono) }}</div>
                </div>
                <button
                  @click="contactarCliente(cliente)"
                  :disabled="!cliente.telefono"
                  class="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white px-3 py-1 rounded text-sm transition-colors"
                >
                  Contactar
                </button>
              </div>
            </div>
          </div>

          <button
            @click="cerrarModalContacto"
            class="mt-4 w-full btn-secondary"
          >
            Cerrar
          </button>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { 
  MessageCircle, 
  CheckCircle, 
  Clock, 
  Phone 
} from 'lucide-vue-next'
import { useAutoService } from '../composables/useAutoService'
import { useOrdenes } from '../composables/useOrdenes'

const {
  clientes,
  vehiculosConAlertas,
  notificarAutoListo,
  recordatorioProximoServicio,
  contactoRapido,
  abrirWhatsApp,
  formatearTelefonoDisplay
} = useAutoService()

const { ordenesCompletas } = useOrdenes()

// Estado del componente
const menuAbierto = ref(false)
const mostrarModalOrdenes = ref(false)
const mostrarModalRecordatorios = ref(false)
const mostrarModalContacto = ref(false)
const filtroContacto = ref('')

// Computed
const ordenesCompletadas = computed(() => {
  return ordenesCompletas.value.filter(orden => 
    orden.estado === 'completada' && 
    orden.cliente?.telefono
  )
})

const clientesFiltrados = computed(() => {
  if (!filtroContacto.value) return clientes.value.filter(c => c.telefono)
  
  const filtro = filtroContacto.value.toLowerCase()
  return clientes.value.filter(cliente => 
    cliente.telefono &&
    (cliente.nombre.toLowerCase().includes(filtro) ||
     cliente.telefono.includes(filtro))
  )
})

// Funciones
const toggleMenu = () => {
  menuAbierto.value = !menuAbierto.value
}

const getAlertaTexto = (alerta) => {
  if (!alerta) return ''
  
  switch (alerta.tipo) {
    case 'vencido':
      return `Servicio vencido hace ${alerta.dias} días`
    case 'urgente':
      return `Servicio en ${alerta.dias} días`
    case 'proximo':
      return `Servicio en ${alerta.dias} días`
    default:
      return ''
  }
}

const mostrarOrdenesCompletadas = () => {
  menuAbierto.value = false
  mostrarModalOrdenes.value = true
}

const mostrarRecordatorios = () => {
  menuAbierto.value = false
  mostrarModalRecordatorios.value = true
}

const mostrarContactoDirecto = () => {
  menuAbierto.value = false
  mostrarModalContacto.value = true
  filtroContacto.value = ''
}

const cerrarModalOrdenes = () => {
  mostrarModalOrdenes.value = false
}

const cerrarModalRecordatorios = () => {
  mostrarModalRecordatorios.value = false
}

const cerrarModalContacto = () => {
  mostrarModalContacto.value = false
}

const notificarAutoListoWhatsApp = (orden) => {
  const enlace = notificarAutoListo(orden)
  if (enlace) {
    abrirWhatsApp(enlace)
    cerrarModalOrdenes()
  }
}

const enviarRecordatorio = (vehiculo) => {
  const enlace = recordatorioProximoServicio(vehiculo, vehiculo.cliente)
  if (enlace) {
    abrirWhatsApp(enlace)
    cerrarModalRecordatorios()
  }
}

const contactarCliente = (cliente) => {
  const enlace = contactoRapido(cliente)
  if (enlace) {
    abrirWhatsApp(enlace)
    cerrarModalContacto()
  }
}

// Cerrar menú al hacer click fuera
const cerrarMenu = () => {
  menuAbierto.value = false
}

// Agregar listener para cerrar menú
document.addEventListener('click', (e) => {
  if (!e.target.closest('.fixed.bottom-6.right-6')) {
    menuAbierto.value = false
  }
})
</script>

<style scoped>
.fade-up-enter-active,
.fade-up-leave-active {
  transition: all 0.3s ease;
}

.fade-up-enter-from {
  opacity: 0;
  transform: translateY(10px);
}

.fade-up-leave-to {
  opacity: 0;
  transform: translateY(10px);
}
</style>
