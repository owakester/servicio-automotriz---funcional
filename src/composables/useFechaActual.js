import { ref } from 'vue'
import { fechaParaInput } from '../utils/dates'

const fechaActual = ref(fechaParaInput())
let reloj = null

export const actualizarFechaActual = () => { fechaActual.value = fechaParaInput() }

export const iniciarRelojCalendario = () => {
  actualizarFechaActual()
  if (!reloj) reloj = setInterval(actualizarFechaActual, 60000)
}

export const detenerRelojCalendario = () => {
  if (reloj) clearInterval(reloj)
  reloj = null
}

export const useFechaActual = () => ({ fechaActual })
