let ultimoIdGenerado = 0

export const crearIdUnico = (ahora = Date.now()) => {
  const baseTemporal = Math.floor(ahora * 1000)
  ultimoIdGenerado = Math.max(baseTemporal, ultimoIdGenerado + 1)
  return ultimoIdGenerado
}

export const normalizarEmail = (email = '') => email.trim().toLowerCase()

export const normalizarPatente = (patente = '') =>
  patente.toUpperCase().replace(/[\s-]/g, '')

export const esPatenteArgentinaValida = (patente) =>
  /^(?:[A-Z]{3}\d{3}|[A-Z]{2}\d{3}[A-Z]{2})$/.test(normalizarPatente(patente))

export const idsIguales = (primero, segundo) =>
  primero !== null && primero !== undefined && segundo !== null && segundo !== undefined &&
  String(primero) === String(segundo)

export const existeValorDuplicado = (registros, campo, valor, idIgnorado = null) => {
  const normalizar = campo === 'email' ? normalizarEmail : normalizarPatente
  const valorNormalizado = normalizar(valor)
  if (!valorNormalizado) return false

  return registros.some((registro) =>
    !idsIguales(registro.id, idIgnorado) && normalizar(registro[campo]) === valorNormalizado
  )
}

export const analizarIntegridadDatos = (datos) => {
  const errores = []
  const colecciones = ['clientes', 'vehiculos', 'servicios', 'ordenes']

  if (!datos || typeof datos !== 'object') return ['El contenido no es un objeto válido.']

  for (const coleccion of colecciones) {
    if (!Array.isArray(datos[coleccion])) {
      errores.push(`La colección ${coleccion} no es una lista.`)
      continue
    }

    const ids = new Set()
    datos[coleccion].forEach((registro, indice) => {
      if (!registro || typeof registro !== 'object' || Array.isArray(registro)) {
        errores.push(`${coleccion}[${indice}] no es un registro válido.`)
        return
      }
      if (registro.id === null || registro.id === undefined || registro.id === '') {
        errores.push(`${coleccion}[${indice}] no tiene identificador.`)
        return
      }
      const id = String(registro.id)
      if (ids.has(id)) errores.push(`${coleccion} contiene el identificador repetido ${id}.`)
      ids.add(id)
    })
  }

  if (errores.length || colecciones.some((coleccion) => !Array.isArray(datos[coleccion]))) return errores

  const clientes = new Set(datos.clientes.map((registro) => String(registro.id)))
  const vehiculos = new Set(datos.vehiculos.map((registro) => String(registro.id)))
  const titularesPorVehiculo = new Map(
    datos.vehiculos.map((registro) => [String(registro.id), String(registro.clienteId)])
  )

  const patentes = new Set()
  datos.clientes.forEach((cliente) => {
    if (!cliente.nombre || typeof cliente.nombre !== 'string') {
      errores.push(`El cliente ${cliente.id} no tiene nombre.`)
    }
  })

  datos.vehiculos.forEach((vehiculo) => {
    const patente = normalizarPatente(vehiculo.patente)
    if (!patente || !vehiculo.marca || !vehiculo.modelo) {
      errores.push(`El vehículo ${vehiculo.id} tiene datos obligatorios incompletos.`)
    }
    if (patente && patentes.has(patente)) errores.push(`La patente ${patente} está repetida.`)
    if (patente) patentes.add(patente)
    if (!clientes.has(String(vehiculo.clienteId))) {
      errores.push(`El vehículo ${patente || vehiculo.id} no tiene un cliente válido.`)
    }
  })

  const emails = new Set()
  datos.clientes.forEach((cliente) => {
    const email = normalizarEmail(cliente.email)
    if (email && emails.has(email)) errores.push(`El email ${email} está repetido.`)
    if (email) emails.add(email)
  })

  for (const coleccion of ['servicios', 'ordenes']) {
    datos[coleccion].forEach((registro) => {
      if (coleccion === 'servicios' && (!registro.tipoServicio || !registro.fechaServicio)) {
        errores.push(`El servicio ${registro.id} tiene datos obligatorios incompletos.`)
      }
      if (coleccion === 'ordenes' && !registro.descripcionTrabajo) {
        errores.push(`La orden ${registro.id} no tiene descripción del trabajo.`)
      }
      if (!vehiculos.has(String(registro.vehiculoId))) {
        errores.push(`${coleccion} ${registro.id} no tiene un vehículo válido.`)
      }
      if (!clientes.has(String(registro.clienteId))) {
        errores.push(`${coleccion} ${registro.id} no tiene un cliente válido.`)
      }
      if (vehiculos.has(String(registro.vehiculoId)) &&
          titularesPorVehiculo.get(String(registro.vehiculoId)) !== String(registro.clienteId)) {
        errores.push(`${coleccion} ${registro.id} no corresponde al titular del vehículo.`)
      }
    })
  }

  return errores
}

export const datosTienenIntegridad = (datos) => analizarIntegridadDatos(datos).length === 0
