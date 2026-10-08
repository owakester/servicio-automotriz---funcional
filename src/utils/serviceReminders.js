import { parsearFechaLocal } from './dates'

// Un recordatorio por vehículo. Solo un trabajo terminado renueva su plazo.
// No se modifica ni elimina el historial: todo se calcula desde los servicios.
export const ultimosCompletadosPorVehiculo = (servicios) => {
  const resultado = new Map()
  const orden = (servicio) => [
    parsearFechaLocal(servicio.fechaServicio).getTime(),
    Date.parse(servicio.fechaCreacion) || 0,
    Number(servicio.id) || 0
  ]
  for (const servicio of servicios) {
    if (servicio.estado !== 'completado') continue
    const actual = orden(servicio)
    if (!Number.isFinite(actual[0])) continue
    const clave = String(servicio.vehiculoId)
    const anterior = resultado.get(clave)
    const previo = anterior ? orden(anterior) : null
    const diferencia = previo ? actual[0] - previo[0] || actual[1] - previo[1] || actual[2] - previo[2] : 1
    if (diferencia > 0) resultado.set(clave, servicio)
  }
  return resultado
}

export const estadoRecordatorioServicio = (servicio, ultimoCompletado) => {
  if (servicio.estado === 'cancelado') return 'cancelado'
  if (!servicio.proximoServicio) return 'sin_fecha'
  if (servicio.estado !== 'completado') return 'pendiente'
  if (!ultimoCompletado || String(ultimoCompletado.id) !== String(servicio.id)) return 'reemplazado'
  if (!Number.isFinite(parsearFechaLocal(servicio.proximoServicio).getTime())) return 'invalido'
  return 'vigente'
}
