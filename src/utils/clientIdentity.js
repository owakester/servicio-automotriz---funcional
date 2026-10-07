// Mantener documentos como texto para conservar ceros iniciales.
export const normalizarDniCuil = (valor) => String(valor ?? '').replace(/[.\s-]/g, '')

export const esDniCuilValido = (valor) => {
  const documento = normalizarDniCuil(valor)
  return documento === '' || /^(?:\d{7,8}|\d{11})$/.test(documento)
}

export const formatearDniCuil = (valor) => {
  const documento = normalizarDniCuil(valor)
  if (/^\d{11}$/.test(documento)) {
    return `${documento.slice(0, 2)}-${documento.slice(2, 10)}-${documento.slice(10)}`
  }
  return documento
}

export const etiquetaCliente = (cliente, alternativa = '') => {
  if (!cliente) return alternativa
  const documento = formatearDniCuil(cliente.dniCuil)
  return `${cliente.nombre || alternativa}${documento ? ` — DNI/CUIL: ${documento}` : ''}`
}

export const coincideDniCuil = (valor, busqueda) => {
  const consulta = normalizarDniCuil(busqueda)
  return /^\d+$/.test(consulta) && normalizarDniCuil(valor).includes(consulta)
}
