<template>
  <div class="whatsapp-actions">
    <!-- Botón principal de WhatsApp -->
    <div v-if="cliente && tieneWhatsApp(cliente)" class="flex items-center space-x-2">
      <!-- Botón desplegable de WhatsApp -->
      <div class="relative" ref="dropdownRef">
        <button
          @click="toggleDropdown"
          :class="[
            'flex items-center px-3 py-2 rounded-lg transition-colors border',
            variant === 'primary' ? 'bg-green-600 hover:bg-green-700 text-white border-green-600' :
            variant === 'secondary' ? 'bg-white hover:bg-green-50 text-green-700 border-green-200' :
            'bg-green-100 hover:bg-green-200 text-green-800 border-green-300'
          ]"
          :title="tooltipText"
        >
          <MessageCircle :class="iconSize" />
          <span v-if="showText" class="ml-2 font-medium">{{ buttonText }}</span>
          <ChevronDown v-if="showActions" :class="['ml-1 transition-transform', { 'rotate-180': showDropdown }]" class="h-4 w-4" />
        </button>

        <!-- Menú desplegable -->
        <div
          v-if="showDropdown && showActions"
          class="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 z-50"
          :class="dropdownPosition"
        >
          <div class="py-2">
            <!-- Auto listo -->
            <button
              v-if="orden && orden.estado === 'completada'"
              @click="handleNotificarAutoListo"
              class="w-full text-left px-4 py-3 hover:bg-green-50 flex items-center transition-colors"
            >
              <CheckCircle class="h-5 w-5 text-green-600 mr-3" />
              <div>
                <div class="font-medium text-gray-900">Auto Listo</div>
                <div class="text-sm text-gray-500">Notificar que el trabajo terminó</div>
              </div>
            </button>

            <!-- Compartir fotos -->
            <button
              v-if="orden"
              @click="handleCompartirFotos"
              class="w-full text-left px-4 py-3 hover:bg-green-50 flex items-center transition-colors"
            >
              <Camera class="h-5 w-5 text-blue-600 mr-3" />
              <div>
                <div class="font-medium text-gray-900">Enviar Fotos</div>
                <div class="text-sm text-gray-500">Compartir fotos del trabajo</div>
              </div>
            </button>

            <!-- Estado del trabajo -->
            <button
              v-if="orden && orden.estado !== 'completada'"
              @click="handleActualizarEstado"
              class="w-full text-left px-4 py-3 hover:bg-green-50 flex items-center transition-colors"
            >
              <Clock class="h-5 w-5 text-orange-600 mr-3" />
              <div>
                <div class="font-medium text-gray-900">Actualizar Estado</div>
                <div class="text-sm text-gray-500">Informar progreso del trabajo</div>
              </div>
            </button>

            <!-- Presupuesto -->
            <button
              v-if="orden && !orden.presupuestoEnviado"
              @click="handleEnviarPresupuesto"
              class="w-full text-left px-4 py-3 hover:bg-green-50 flex items-center transition-colors"
            >
              <DollarSign class="h-5 w-5 text-purple-600 mr-3" />
              <div>
                <div class="font-medium text-gray-900">Enviar Presupuesto</div>
                <div class="text-sm text-gray-500">Solicitar aprobación de costos</div>
              </div>
            </button>

            <!-- Recordatorio -->
            <button
              @click="handleRecordatorioService"
              class="w-full text-left px-4 py-3 hover:bg-green-50 flex items-center transition-colors"
            >
              <Calendar class="h-5 w-5 text-indigo-600 mr-3" />
              <div>
                <div class="font-medium text-gray-900">Recordatorio Service</div>
                <div class="text-sm text-gray-500">Próxima revisión programada</div>
              </div>
            </button>

            <!-- Divisor -->
            <div class="border-t border-gray-100 my-2"></div>

            <!-- Contacto libre -->
            <button
              @click="handleContactoRapido"
              class="w-full text-left px-4 py-3 hover:bg-green-50 flex items-center transition-colors"
            >
              <MessageCircle class="h-5 w-5 text-green-600 mr-3" />
              <div>
                <div class="font-medium text-gray-900">Mensaje Libre</div>
                <div class="text-sm text-gray-500">Iniciar conversación</div>
              </div>
            </button>
          </div>
        </div>
      </div>

      <!-- Indicador de teléfono -->
      <span v-if="showPhone" class="text-sm text-gray-500">
        {{ formatearTelefonoDisplay(cliente.telefono) }}
      </span>
    </div>

    <!-- Mensaje cuando no hay WhatsApp -->
    <div v-else-if="cliente" class="flex items-center text-gray-400">
      <MessageCircle :class="iconSize" />
      <span v-if="showText" class="ml-2 text-sm">Sin WhatsApp</span>
    </div>

    <!-- Modal para mensajes personalizados -->
    <div
      v-if="showModal"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
    >
      <div class="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <h3 class="text-lg font-bold text-gray-900 mb-4">{{ modalConfig.titulo }}</h3>
        
        <div class="space-y-4">
          <div v-if="modalConfig.campos">
            <label 
              v-for="campo in modalConfig.campos" 
              :key="campo.key"
              class="block text-sm font-medium text-gray-700 mb-2"
            >
              {{ campo.label }}
              <input
                v-if="campo.tipo === 'text' || campo.tipo === 'date'"
                v-model="camposModal[campo.key]"
                :type="campo.tipo"
                :placeholder="campo.placeholder"
                class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
              />
              <textarea
                v-else-if="campo.tipo === 'textarea'"
                v-model="camposModal[campo.key]"
                :placeholder="campo.placeholder"
                rows="3"
                class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
              ></textarea>
              <select
                v-else-if="campo.tipo === 'select'"
                v-model="camposModal[campo.key]"
                class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
              >
                <option value="">Seleccionar...</option>
                <option 
                  v-for="opcion in campo.opciones" 
                  :key="opcion.value" 
                  :value="opcion.value"
                >
                  {{ opcion.label }}
                </option>
              </select>
            </label>
          </div>

          <!-- Vista previa del mensaje -->
          <div class="bg-green-50 border border-green-200 rounded-lg p-3">
            <div class="text-sm font-medium text-green-800 mb-2">Vista previa:</div>
            <div class="text-sm text-green-700 whitespace-pre-wrap">{{ vistaPrevia }}</div>
          </div>
        </div>

        <div class="flex justify-end space-x-3 mt-6">
          <button
            @click="cerrarModal"
            class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            @click="enviarMensajeModal"
            class="px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700"
          >
            Enviar WhatsApp
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { 
  MessageCircle, 
  ChevronDown, 
  CheckCircle, 
  Camera, 
  Clock, 
  DollarSign, 
  Calendar 
} from 'lucide-vue-next'
import { useWhatsApp } from '../composables/useWhatsApp'

const props = defineProps({
  cliente: {
    type: Object,
    required: true
  },
  vehiculo: {
    type: Object,
    default: null
  },
  orden: {
    type: Object,
    default: null
  },
  variant: {
    type: String,
    default: 'primary', // primary, secondary, minimal
    validator: value => ['primary', 'secondary', 'minimal'].includes(value)
  },
  showText: {
    type: Boolean,
    default: true
  },
  showActions: {
    type: Boolean,
    default: true
  },
  showPhone: {
    type: Boolean,
    default: false
  },
  buttonText: {
    type: String,
    default: 'WhatsApp'
  },
  dropdownPosition: {
    type: String,
    default: 'top-0' // top-0, bottom-0
  }
})

const {
  notificarAutoListo,
  compartirFotos,
  recordatorioProximoService,
  enviarPresupuesto,
  actualizarEstadoTrabajo,
  contactoRapido,
  tieneWhatsApp,
  formatearTelefono
} = useWhatsApp()

// Estado local
const showDropdown = ref(false)
const showModal = ref(false)
const modalConfig = ref({})
const camposModal = ref({})
const dropdownRef = ref(null)

// Computed
const iconSize = computed(() => {
  return props.variant === 'minimal' ? 'h-4 w-4' : 'h-5 w-5'
})

const tooltipText = computed(() => {
  if (!tieneWhatsApp(props.cliente)) {
    return 'Cliente sin número de WhatsApp'
  }
  return `Enviar WhatsApp a ${props.cliente.nombre}`
})

const vistaPrevia = computed(() => {
  return modalConfig.value.generarMensaje ? modalConfig.value.generarMensaje(camposModal.value) : ''
})

// Funciones
const toggleDropdown = () => {
  if (!props.showActions) {
    handleContactoRapido()
    return
  }
  showDropdown.value = !showDropdown.value
}

const cerrarDropdown = () => {
  showDropdown.value = false
}

const formatearTelefonoDisplay = (telefono) => {
  if (!telefono) return ''
  const limpio = telefono.replace(/\D/g, '')
  if (limpio.length >= 10) {
    return `+${limpio.slice(0, 2)} ${limpio.slice(2, 4)} ${limpio.slice(4, 8)}-${limpio.slice(8)}`
  }
  return telefono
}

// Handlers de acciones
const handleNotificarAutoListo = () => {
  notificarAutoListo(props.cliente, props.vehiculo, props.orden)
  cerrarDropdown()
}

const handleCompartirFotos = () => {
  abrirModal({
    titulo: 'Compartir Fotos del Trabajo',
    campos: [
      {
        key: 'mensaje',
        label: 'Mensaje adicional (opcional)',
        tipo: 'textarea',
        placeholder: 'Ej: Todo perfecto! ✨'
      }
    ],
    generarMensaje: (campos) => {
      return `Hola ${props.cliente.nombre}! 📸

Te enviamos las fotos del trabajo realizado en tu ${props.vehiculo?.marca} ${props.vehiculo?.modelo}.

${campos.mensaje || 'Todo perfecto! ✨'}

¿Alguna consulta? Escribinos 📱`
    },
    accion: (campos) => compartirFotos(props.cliente, props.vehiculo, campos.mensaje)
  })
}

const handleActualizarEstado = () => {
  const estadosDisponibles = [
    { value: 'pendiente', label: 'En cola de trabajo' },
    { value: 'en_proceso', label: 'Trabajando en el vehículo' },
    { value: 'esperando_repuestos', label: 'Esperando repuestos' },
    { value: 'esperando_autorizacion', label: 'Esperando autorización' }
  ]

  abrirModal({
    titulo: 'Actualizar Estado del Trabajo',
    campos: [
      {
        key: 'estado',
        label: 'Estado actual',
        tipo: 'select',
        opciones: estadosDisponibles
      },
      {
        key: 'observaciones',
        label: 'Observaciones adicionales',
        tipo: 'textarea',
        placeholder: 'Ej: Necesitamos tu aprobación para continuar...'
      }
    ],
    generarMensaje: (campos) => {
      const estadoTexto = estadosDisponibles.find(e => e.value === campos.estado)?.label || campos.estado
      return `Hola ${props.cliente.nombre}! 📢

*Actualización de tu ${props.vehiculo?.marca} ${props.vehiculo?.modelo}:*

${estadoTexto} 🔧

${campos.observaciones ? `*Observaciones:* ${campos.observaciones}` : ''}

Te mantenemos informado!`
    },
    accion: (campos) => actualizarEstadoTrabajo(props.cliente, props.vehiculo, campos.estado, campos.observaciones)
  })
}

const handleEnviarPresupuesto = () => {
  abrirModal({
    titulo: 'Enviar Presupuesto',
    campos: [
      {
        key: 'descripcion',
        label: 'Descripción del trabajo',
        tipo: 'textarea',
        placeholder: 'Ej: Cambio de aceite y filtros'
      },
      {
        key: 'monto',
        label: 'Monto total ($)',
        tipo: 'text',
        placeholder: '15000'
      },
      {
        key: 'validez',
        label: 'Días de validez',
        tipo: 'text',
        placeholder: '15'
      }
    ],
    generarMensaje: (campos) => {
      return `Hola ${props.cliente.nombre}! 💰

*Presupuesto para ${props.vehiculo?.marca} ${props.vehiculo?.modelo}:*

• ${campos.descripcion}

*Total: $${parseInt(campos.monto)?.toLocaleString() || campos.monto}*

El presupuesto es válido por ${campos.validez || '15'} días.

¿Aprobas el trabajo? Responde con "APROBADO" para continuar.`
    },
    accion: (campos) => {
      const items = [{ descripcion: campos.descripcion, precio: parseInt(campos.monto) || 0 }]
      enviarPresupuesto(props.cliente, props.vehiculo, items, parseInt(campos.monto) || 0)
    }
  })
}

const handleRecordatorioService = () => {
  abrirModal({
    titulo: 'Recordatorio de Próximo Service',
    campos: [
      {
        key: 'kilometraje',
        label: 'Kilometraje del próximo service',
        tipo: 'text',
        placeholder: '20000'
      },
      {
        key: 'fechaSugerida',
        label: 'Fecha sugerida (opcional)',
        tipo: 'date'
      }
    ],
    generarMensaje: (campos) => {
      return `Hola ${props.cliente.nombre}! 👋

Tu ${props.vehiculo?.marca} ${props.vehiculo?.modelo} está próximo al service de ${parseInt(campos.kilometraje)?.toLocaleString() || campos.kilometraje}km.

${campos.fechaSugerida ? `📅 Fecha sugerida: ${new Date(campos.fechaSugerida).toLocaleDateString('es-ES')}` : '📅 ¿Coordinamos una fecha?'}

*Turnos disponibles esta semana*`
    },
    accion: (campos) => {
      const fecha = campos.fechaSugerida ? new Date(campos.fechaSugerida).toLocaleDateString('es-ES') : ''
      recordatorioProximoService(props.cliente, props.vehiculo, parseInt(campos.kilometraje), fecha)
    }
  })
}

const handleContactoRapido = () => {
  contactoRapido(props.cliente)
  cerrarDropdown()
}

// Modal functions
const abrirModal = (config) => {
  modalConfig.value = config
  camposModal.value = {}
  
  // Inicializar campos con valores por defecto
  if (config.campos) {
    config.campos.forEach(campo => {
      camposModal.value[campo.key] = campo.valorDefecto || ''
    })
  }
  
  showModal.value = true
  cerrarDropdown()
}

const cerrarModal = () => {
  showModal.value = false
  modalConfig.value = {}
  camposModal.value = {}
}

const enviarMensajeModal = () => {
  if (modalConfig.value.accion) {
    modalConfig.value.accion(camposModal.value)
  }
  cerrarModal()
}

// Cerrar dropdown al hacer click fuera
const handleClickOutside = (event) => {
  if (dropdownRef.value && !dropdownRef.value.contains(event.target)) {
    cerrarDropdown()
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<style scoped>
.whatsapp-actions {
  @apply inline-block;
}
</style>
