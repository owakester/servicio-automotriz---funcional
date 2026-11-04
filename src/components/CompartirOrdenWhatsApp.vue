<template>
  <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" @click.self="$emit('cerrar')" @keydown.esc="$emit('cerrar')">
    <section v-focus-trap class="bg-white rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto" role="dialog" aria-modal="true" aria-labelledby="share-order-title" tabindex="-1">
      <div class="flex justify-between items-start gap-3 mb-4">
        <h2 id="share-order-title" class="text-xl font-bold">Compartir orden por WhatsApp</h2>
        <button type="button" class="p-2 rounded hover:bg-gray-100" @click="$emit('cerrar')" aria-label="Cerrar vista previa"><X class="h-5 w-5" aria-hidden="true" /></button>
      </div>
      <p class="text-sm text-gray-600 mb-4">Revisá el destinatario y el detalle de la orden guardada; los cambios del borrador no se incluyen. Se abrirá el chat con este texto y vos decidís cuándo presionar Enviar en WhatsApp. No se adjunta un PDF automáticamente.</p>
      <form class="space-y-4" @submit.prevent="abrir">
        <div>
          <label for="share-order-phone" class="block text-sm font-medium mb-1">Teléfono de {{ orden.cliente?.nombre || 'cliente' }}</label>
          <input id="share-order-phone" ref="telefonoInput" v-model="telefono" type="tel" class="input-field" placeholder="+54 9 11 1234 5678" aria-describedby="share-order-phone-help" />
          <p id="share-order-phone-help" class="text-xs text-gray-500 mt-1">Cambiarlo aquí no modifica la ficha del cliente.</p>
        </div>
        <div>
          <label for="share-order-message" class="block text-sm font-medium mb-1">Vista previa editable</label>
          <textarea id="share-order-message" v-model="mensaje" rows="10" class="input-field" aria-describedby="share-order-privacy" />
          <p class="text-xs mt-1 text-right" :class="mensaje.length > 4000 ? 'text-red-700' : 'text-gray-500'">{{ mensaje.length }} / 4000 caracteres</p>
          <p id="share-order-privacy" class="text-xs text-gray-500 mt-1">No se incluyen automáticamente DNI/CUIL, notas internas, importes ni enlaces privados de Drive.</p>
          <div class="flex flex-wrap gap-2 mt-2">
            <button v-if="orden.observaciones" type="button" class="btn-secondary text-sm" :disabled="notasAgregadas" @click="agregarNotas">Agregar observaciones</button>
            <button v-if="Number(orden.costoEstimado) > 0" type="button" class="btn-secondary text-sm" :disabled="importeAgregado" @click="agregarImporte">Agregar presupuesto estimado</button>
          </div>
        </div>
        <p v-if="errorMensaje" class="text-red-700 font-medium" role="alert">{{ errorMensaje }}</p>
        <p v-if="chatPreparado" class="text-sm text-green-800" role="status">Revisá el chat de WhatsApp y presioná Enviar allí. Si no se abrió, comprobá si el navegador bloqueó la nueva ventana.</p>
        <div class="flex flex-wrap justify-end gap-3">
          <button type="button" class="btn-secondary" @click="$emit('cerrar')">Cerrar</button>
          <button type="submit" class="btn-primary inline-flex items-center gap-2"><MessageCircle class="h-4 w-4" aria-hidden="true" />Abrir WhatsApp</button>
        </div>
      </form>
    </section>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { MessageCircle, X } from 'lucide-vue-next'
import brand from '../assets/brand.json'
import { enlaceOrdenWhatsApp, mensajeOrdenWhatsApp } from '../utils/compartirOrden'
const props = defineProps({ orden: { type: Object, required: true } })
defineEmits(['cerrar'])
const telefono = ref(props.orden.cliente?.telefono || '')
const mensaje = ref(mensajeOrdenWhatsApp(props.orden, brand.nombre))
const errorMensaje = ref('')
const chatPreparado = ref(false)
const notasAgregadas = ref(false)
const importeAgregado = ref(false)
const telefonoInput = ref(null)
let focoAnterior
onMounted(() => { focoAnterior = document.activeElement; telefonoInput.value?.focus() })
onBeforeUnmount(() => { if (focoAnterior?.isConnected) focoAnterior.focus() })
const agregarNotas = () => { mensaje.value += `\n\nObservaciones:\n${props.orden.observaciones}`; notasAgregadas.value = true }
const agregarImporte = () => { mensaje.value += `\n\nPresupuesto estimado (no es comprobante de pago): $${Number(props.orden.costoEstimado).toLocaleString('es-AR')}`; importeAgregado.value = true }
const abrir = () => {
  errorMensaje.value = ''
  chatPreparado.value = false
  try {
    const enlace = enlaceOrdenWhatsApp(telefono.value, mensaje.value)
    window.open(enlace, '_blank', 'noopener,noreferrer')
    chatPreparado.value = true
  } catch (err) { errorMensaje.value = err.message }
}
</script>
