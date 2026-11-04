import { computed, ref, watch } from 'vue'
import { fechaParaInput } from '../utils/dates'

const CLAVE = 'brabus_borrador_orden_v1'
const formularioVacio = () => ({ vehiculoId: '', clienteId: '', estado: 'pendiente', prioridad: 'media', fechaVencimiento: '', costoEstimado: '', descripcionTrabajo: '', observaciones: '' })
const copiarCampos = datos => Object.fromEntries(Object.entries(formularioVacio()).map(([clave, defecto]) => [clave, datos?.[clave] ?? defecto]))

// Solo campos editables: adjuntos y enlaces se guardan por sus propios eventos.
export const firmaOrdenEditable = datos => JSON.stringify({
  ...copiarCampos(datos), vehiculoId: String(datos?.vehiculoId || ''), clienteId: String(datos?.clienteId || ''),
  costoEstimado: Number(datos?.costoEstimado) || 0, fechaVencimiento: datos?.fechaVencimiento ? fechaParaInput(datos.fechaVencimiento) : ''
})

const formulario = ref(formularioVacio())
const ordenId = ref(null)
const versionOriginal = ref(null)
const activo = ref(false)
const sesionDisponible = ref(true)
try {
  if (typeof sessionStorage !== 'undefined') {
    const guardado = JSON.parse(sessionStorage.getItem(CLAVE) || 'null')
    if (guardado?.version === 1 && guardado.formulario && typeof guardado.formulario === 'object' &&
        (guardado.ordenId === null || ['string', 'number'].includes(typeof guardado.ordenId)) &&
        (guardado.ordenId === null || typeof guardado.versionOriginal === 'string')) {
      formulario.value = copiarCampos(guardado.formulario)
      ordenId.value = guardado.ordenId
      versionOriginal.value = guardado.versionOriginal
      activo.value = true
    }
  }
} catch { sesionDisponible.value = false }

watch([formulario, ordenId, versionOriginal, activo], () => {
  try {
    if (typeof sessionStorage === 'undefined') { sesionDisponible.value = false; return }
    if (activo.value) sessionStorage.setItem(CLAVE, JSON.stringify({ version: 1, formulario: copiarCampos(formulario.value), ordenId: ordenId.value, versionOriginal: versionOriginal.value }))
    else sessionStorage.removeItem(CLAVE)
    sesionDisponible.value = true
  } catch { sesionDisponible.value = false } // El borrador sigue en memoria al navegar.
}, { deep: true, flush: 'sync' })

const hayCambios = computed(() => firmaOrdenEditable(formulario.value) !== (versionOriginal.value || firmaOrdenEditable(formularioVacio())))
const iniciar = (orden = null) => {
  activo.value = false
  ordenId.value = orden?.id ?? null
  formulario.value = copiarCampos(orden)
  formulario.value.fechaVencimiento = orden?.fechaVencimiento ? fechaParaInput(orden.fechaVencimiento) : ''
  versionOriginal.value = orden ? firmaOrdenEditable(orden) : null
  activo.value = true
}
const descartar = () => {
  activo.value = false
  formulario.value = formularioVacio()
  ordenId.value = null
  versionOriginal.value = null
}
const agregarTexto = (anterior, texto) => {
  if (!texto?.trim() || anterior === texto || anterior?.endsWith(`\n\n${texto}`)) return anterior || ''
  return anterior?.trim() ? `${anterior}\n\n${texto}` : texto
}
const incorporarServicio = servicio => {
  if (!servicio || String(servicio.vehiculoId) !== String(formulario.value.vehiculoId) || String(servicio.clienteId) !== String(formulario.value.clienteId)) return false
  activo.value = true
  formulario.value.descripcionTrabajo = agregarTexto(formulario.value.descripcionTrabajo, servicio.descripcion || servicio.tipoServicio)
  formulario.value.observaciones = agregarTexto(formulario.value.observaciones, servicio.observaciones)
  return true
}

export const useBorradorOrden = () => ({ formulario, ordenId, versionOriginal, activo, hayCambios, sesionDisponible, iniciar, descartar, incorporarServicio })
