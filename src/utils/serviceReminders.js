import { parsearFechaLocal } from './dates'

// Solo un trabajo terminado del MISMO tipo reemplaza al anterior.
// Las claves se calculan, sin modificar el historial ni los datos guardados.
export const claveRecordatorioServicio = (servicio) => JSON.stringify([
  String(servicio.vehiculoId),
  String(servicio.tipoServicio || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().replace(/\s+/g, ' ').toLocaleLowerCase('es')
])

const orden = (servicio) => [
  parsearFechaLocal(servicio.fechaServicio).getTime(),
  Date.parse(servicio.fechaCreacion) || 0,
  Number(servicio.id) || 0
]
const compararServicios = (actual, anterior) => {
  const a = orden(actual)
  const b = orden(anterior)
  return a[0] - b[0] || a[1] - b[1] || a[2] - b[2]
}

export const ultimosCompletadosPorTipo = (servicios) => {
  const resultado = new Map()
  for (const servicio of servicios) {
    if (servicio.estado !== 'completado') continue
    if (!Number.isFinite(orden(servicio)[0])) continue
    const clave = claveRecordatorioServicio(servicio)
    const anterior = resultado.get(clave)
    if (!anterior || compararServicios(servicio, anterior) > 0) resultado.set(clave, servicio)
  }
  return resultado
}

// Dashboard/campana mantienen un resumen por vehículo: el vencimiento vigente
// más cercano entre sus tipos. Un trabajo sin fecha no oculta otros avisos.
export const ultimosCompletadosPorVehiculo = (servicios) => {
  const resultado = new Map()
  const fechaAviso = (servicio) => servicio.proximoServicio ? parsearFechaLocal(servicio.proximoServicio).getTime() : NaN
  for (const servicio of ultimosCompletadosPorTipo(servicios).values()) {
    const clave = String(servicio.vehiculoId)
    const anterior = resultado.get(clave)
    const fecha = fechaAviso(servicio)
    const previa = anterior ? fechaAviso(anterior) : NaN
    if (!anterior || (Number.isFinite(fecha) && (!Number.isFinite(previa) || fecha < previa)) ||
      ((!Number.isFinite(fecha) && !Number.isFinite(previa) || fecha === previa) && compararServicios(servicio, anterior) > 0)) {
      resultado.set(clave, servicio)
    }
  }
  return resultado
}

export const estadoRecordatorioServicio = (servicio, ultimoCompletado) => {
  if (servicio.estado === 'cancelado') return 'cancelado'
  if (!servicio.proximoServicio) return 'sin_fecha'
  if (servicio.estado !== 'completado') return 'pendiente'
  if (ultimoCompletado && claveRecordatorioServicio(ultimoCompletado) === claveRecordatorioServicio(servicio) && String(ultimoCompletado.id) !== String(servicio.id)) return 'reemplazado'
  if (!Number.isFinite(parsearFechaLocal(servicio.proximoServicio).getTime())) return 'invalido'
  return 'vigente'
}
