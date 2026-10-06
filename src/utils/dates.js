// Las fechas sin hora representan un día del calendario local, no medianoche UTC.
export const parsearFechaLocal = (valor) => {
  if (!valor) return new Date(NaN)
  if (typeof valor === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(valor)) {
    const [anio, mes, dia] = valor.split('-').map(Number)
    const fecha = new Date(0)
    fecha.setFullYear(anio, mes - 1, dia)
    fecha.setHours(0, 0, 0, 0)
    return fecha.getFullYear() === anio && fecha.getMonth() === mes - 1 && fecha.getDate() === dia
      ? fecha : new Date(NaN)
  }
  return new Date(valor)
}

export const fechaParaInput = (valor = new Date()) => {
  const fecha = parsearFechaLocal(valor)
  if (Number.isNaN(fecha.getTime())) return ''
  return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}-${String(fecha.getDate()).padStart(2, '0')}`
}

export const formatearFecha = (valor) => {
  const fecha = parsearFechaLocal(valor)
  return Number.isNaN(fecha.getTime()) ? '' : fecha.toLocaleDateString('es-ES', {
    year: 'numeric', month: '2-digit', day: '2-digit'
  })
}

export const inicioDelDia = (valor = new Date()) => {
  const fecha = parsearFechaLocal(valor)
  fecha.setHours(0, 0, 0, 0)
  return fecha
}

export const diasHastaFecha = (valor, hoy = new Date()) => {
  const destino = parsearFechaLocal(valor)
  const origen = parsearFechaLocal(hoy)
  if (Number.isNaN(destino.getTime()) || Number.isNaN(origen.getTime())) return null
  // Comparar días civiles evita desfases por cambios de horario de verano.
  const diaUTC = (fecha) => Date.UTC(fecha.getFullYear(), fecha.getMonth(), fecha.getDate())
  return Math.round((diaUTC(destino) - diaUTC(origen)) / 86400000)
}

export const estaFechaVencida = (valor, hoy = new Date()) => {
  const dias = diasHastaFecha(valor, hoy)
  return dias !== null && dias < 0
}

export const sumarAnos = (valor, cantidad = 1) => {
  const fecha = parsearFechaLocal(valor)
  if (Number.isNaN(fecha.getTime())) return ''
  const dia = fecha.getDate()
  fecha.setDate(1)
  fecha.setFullYear(fecha.getFullYear() + cantidad)
  const ultimoDia = new Date(fecha.getFullYear(), fecha.getMonth() + 1, 0).getDate()
  fecha.setDate(Math.min(dia, ultimoDia))
  return fechaParaInput(fecha)
}
