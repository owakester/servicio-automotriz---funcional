import { formatearFecha } from './dates'

export const normalizarTelefonoWhatsApp = valor => {
  const original = String(valor || '').trim()
  let numero = original.replace(/\D/g, '')
  if (numero.startsWith('00')) numero = numero.slice(2)
  else if (!original.startsWith('+') && !numero.startsWith('54')) {
    if (numero.length === 11 && numero.startsWith('0')) numero = numero.slice(1)
    if (numero.length === 10) numero = `549${numero}`
    else return '' // No adivinar el país o el código de área de números incompletos.
  }
  if (numero.startsWith('54') && ![12, 13].includes(numero.length)) return ''
  return /^[1-9]\d{7,14}$/.test(numero) ? numero : ''
}

const numeroRegistrado = valor => {
  if (!['number', 'string'].includes(typeof valor) || String(valor).trim() === '') return null
  const numero = Number(valor)
  return Number.isFinite(numero) && numero >= 0 ? numero : null
}

export const mensajeOrdenWhatsApp = (orden, nombreTaller) => {
  const estado = { pendiente: 'Pendiente', en_proceso: 'En proceso', completada: 'Completada', cancelada: 'Cancelada' }[orden.estado] || orden.estado || 'Sin estado registrado'
  const presupuesto = numeroRegistrado(orden.costoEstimado)
  // La orden no almacena una lectura propia: usar la registrada en el vehículo,
  // sin presentarla como kilometraje histórico al momento de crear la orden.
  const kilometraje = numeroRegistrado(orden.vehiculo?.kilometraje)
  return [
    `Hola ${orden.cliente?.nombre || ''}. Te compartimos la orden ${orden.numeroOrden || orden.id} de ${nombreTaller}.`,
    `Vehículo: ${orden.vehiculo?.marca || ''} ${orden.vehiculo?.modelo || ''} — ${orden.vehiculo?.patente || ''}`,
    `Kilometraje registrado del vehículo: ${kilometraje === null ? 'Sin registrar' : `${kilometraje.toLocaleString('es-AR')} km`}`,
    `Fecha de la orden: ${formatearFecha(orden.fechaCreacion)}\nEstado: ${estado}`,
    `Presupuesto estimado (no es comprobante de pago): ${presupuesto === null ? 'Sin registrar' : `$${presupuesto.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}`,
    `Detalle del trabajo:\n${orden.descripcionTrabajo || 'Sin descripción registrada.'}`
  ].join('\n\n')
}

export const enlaceOrdenWhatsApp = (telefono, mensaje) => {
  const numero = normalizarTelefonoWhatsApp(telefono)
  if (!numero) throw Error('Ingresá un teléfono válido con código de país y área, por ejemplo +54 9 11 1234 5678.')
  if (!mensaje?.trim()) throw Error('Escribí el mensaje que querés compartir.')
  if (mensaje.length > 4000) throw Error('El mensaje supera los 4000 caracteres. Acortalo o compartí la orden impresa por separado.')
  return `https://wa.me/${numero}?text=${encodeURIComponent(mensaje.trim())}`
}
