import { ref, computed, watch } from 'vue'
import { useNotifications } from './useNotifications'
import {
  validarDatosAutoservice,
  programarSnapshotRecuperacion,
  obtenerUltimoSnapshotValido,
  marcarRecuperacionExitosa,
  marcarDatosProtegidos,
  marcarAdvertenciaRecuperacion
} from './useDataRecovery'
import {
  crearIdUnico,
  esPatenteArgentinaValida,
  existeValorDuplicado,
  idsIguales,
  normalizarEmail,
  normalizarPatente
} from '../utils/dataIntegrity'

// Estado global de la aplicación
const clientes = ref([])
const vehiculos = ref([])
const servicios = ref([])
const ordenes = ref([])

const datosListos = ref(false)
const CLAVES_DATOS = {
  clientes: 'autoservice_clientes',
  vehiculos: 'autoservice_vehiculos',
  servicios: 'autoservice_servicios',
  ordenes: 'autoservice_ordenes'
}

let inicializacionIniciada = false
let inicializacionDatos = Promise.resolve({ recuperado: false })
let persistenciaIniciada = false

const obtenerDatosActuales = () => ({
  clientes: clientes.value,
  vehiculos: vehiculos.value,
  servicios: servicios.value,
  ordenes: ordenes.value
})

const aplicarDatosAlEstado = (datos) => {
  clientes.value = datos.clientes
  vehiculos.value = datos.vehiculos
  servicios.value = datos.servicios
  ordenes.value = datos.ordenes
}

const guardarDatosEnLocalStorage = (datos) => {
  const valoresAnteriores = {}

  try {
    Object.entries(CLAVES_DATOS).forEach(([coleccion, clave]) => {
      valoresAnteriores[coleccion] = localStorage.getItem(clave)
    })
    Object.entries(CLAVES_DATOS).forEach(([coleccion, clave]) => {
      localStorage.setItem(clave, JSON.stringify(datos[coleccion]))
    })
  } catch (err) {
    try {
      Object.entries(CLAVES_DATOS).forEach(([coleccion, clave]) => {
        if (!(coleccion in valoresAnteriores)) return
        const valorAnterior = valoresAnteriores[coleccion]
        if (valorAnterior === null) localStorage.removeItem(clave)
        else localStorage.setItem(clave, valorAnterior)
      })
    } catch {
      // Si localStorage está totalmente inaccesible, IndexedDB seguirá protegiendo la sesión.
    }
    throw err
  }
}

const persistirDatos = () => {
  const datos = obtenerDatosActuales()
  try {
    guardarDatosEnLocalStorage(datos)
    marcarDatosProtegidos()
  } catch (err) {
    marcarAdvertenciaRecuperacion(`No se pudo guardar en el navegador: ${err.message}`)
  }

  // IndexedDB es independiente de localStorage y sirve como copia de recuperación.
  programarSnapshotRecuperacion(datos)
}

const iniciarPersistencia = () => {
  if (persistenciaIniciada) return
  persistenciaIniciada = true
  watch([clientes, vehiculos, servicios, ordenes], persistirDatos, { deep: true })
}

const leerDatosLocales = () => {
  let datosCrudos
  try {
    datosCrudos = Object.fromEntries(
      Object.entries(CLAVES_DATOS).map(([coleccion, clave]) => [coleccion, localStorage.getItem(clave)])
    )
  } catch {
    return { estado: 'inaccesible' }
  }
  const sinDatos = Object.values(datosCrudos).every((valor) => valor === null)
  if (sinDatos) return { estado: 'ausente' }

  const datosParciales = {}
  let coleccionDanada = false
  for (const [coleccion, valor] of Object.entries(datosCrudos)) {
    if (valor === null) {
      datosParciales[coleccion] = []
      if (coleccion !== 'ordenes') coleccionDanada = true
      continue
    }
    try {
      const contenido = JSON.parse(valor)
      datosParciales[coleccion] = Array.isArray(contenido) ? contenido : []
      if (!Array.isArray(contenido)) coleccionDanada = true
    } catch {
      datosParciales[coleccion] = []
      coleccionDanada = true
    }
  }

  if (!coleccionDanada && validarDatosAutoservice(datosParciales)) {
    return { estado: 'valido', datos: datosParciales }
  }
  return { estado: coleccionDanada ? 'corrupto' : 'invalido', datosParciales }
}

const depurarDatosParciales = (datos = {}) => {
  const unicosPorId = (registros = []) => {
    const vistos = new Set()
    return registros.filter((registro) => {
      if (!registro || typeof registro !== 'object' || registro.id === null || registro.id === undefined) return false
      const id = String(registro.id)
      if (vistos.has(id)) return false
      vistos.add(id)
      return true
    })
  }

  const emails = new Set()
  const clientesRecuperados = unicosPorId(datos.clientes).filter((cliente) => {
    if (!cliente.nombre) return false
    const email = normalizarEmail(cliente.email)
    if (email && emails.has(email)) return false
    if (email) emails.add(email)
    return true
  })
  const idsClientes = new Set(clientesRecuperados.map(cliente => String(cliente.id)))
  const patentes = new Set()
  const vehiculosRecuperados = unicosPorId(datos.vehiculos).filter((vehiculo) => {
    const patente = normalizarPatente(vehiculo.patente)
    if (!idsClientes.has(String(vehiculo.clienteId)) || !patente || patentes.has(patente) ||
        !vehiculo.marca || !vehiculo.modelo) return false
    patentes.add(patente)
    return true
  })
  const idsVehiculos = new Set(vehiculosRecuperados.map(vehiculo => String(vehiculo.id)))
  const titularVehiculo = new Map(vehiculosRecuperados.map(vehiculo => [String(vehiculo.id), String(vehiculo.clienteId)]))
  const conservarActividad = (registro) =>
    idsClientes.has(String(registro.clienteId)) &&
    idsVehiculos.has(String(registro.vehiculoId)) &&
    titularVehiculo.get(String(registro.vehiculoId)) === String(registro.clienteId)

  return {
    clientes: clientesRecuperados,
    vehiculos: vehiculosRecuperados,
    servicios: unicosPorId(datos.servicios).filter(registro =>
      conservarActividad(registro) && registro.tipoServicio && registro.fechaServicio
    ),
    ordenes: unicosPorId(datos.ordenes).filter(registro =>
      conservarActividad(registro) && registro.descripcionTrabajo
    )
  }
}

const inicializarDatos = () => {
  if (inicializacionIniciada) return inicializacionDatos
  inicializacionIniciada = true

  const datosLocales = leerDatosLocales()
  if (datosLocales.estado === 'valido') {
    aplicarDatosAlEstado(datosLocales.datos)
    datosListos.value = true
    iniciarPersistencia()
    programarSnapshotRecuperacion(datosLocales.datos, 100)
    marcarDatosProtegidos()
    inicializacionDatos = Promise.resolve({ recuperado: false })
    return inicializacionDatos
  }

  inicializacionDatos = obtenerUltimoSnapshotValido()
    .then((snapshot) => {
      if (snapshot) {
        let guardadoPrincipalDisponible = true
        try {
          guardarDatosEnLocalStorage(snapshot.datos)
        } catch {
          guardadoPrincipalDisponible = false
        }
        aplicarDatosAlEstado(snapshot.datos)
        marcarRecuperacionExitosa(snapshot.fecha)
        if (!guardadoPrincipalDisponible) {
          marcarAdvertenciaRecuperacion('Se recuperaron los datos, pero localStorage continúa inaccesible. Mantén la aplicación abierta y crea un backup externo.')
        }
        return { recuperado: true, fecha: snapshot.fecha, guardadoPrincipalDisponible }
      }

      const datosVacios = { clientes: [], vehiculos: [], servicios: [], ordenes: [] }
      const datosRecuperables = depurarDatosParciales(datosLocales.datosParciales)
      const cantidadRecuperable = Object.values(datosRecuperables).reduce((total, lista) => total + lista.length, 0)
      const datosIniciales = cantidadRecuperable > 0 && validarDatosAutoservice(datosRecuperables)
        ? datosRecuperables
        : datosVacios
      guardarDatosEnLocalStorage(datosIniciales)
      aplicarDatosAlEstado(datosIniciales)

      if (datosLocales.estado === 'ausente') {
        programarSnapshotRecuperacion(datosVacios, 100)
        marcarDatosProtegidos()
        return { recuperado: false, nuevo: true }
      }

      if (cantidadRecuperable > 0) {
        programarSnapshotRecuperacion(datosRecuperables, 100)
        marcarAdvertenciaRecuperacion('Se conservaron los datos sanos. Los registros dañados o sin relaciones válidas fueron descartados.')
        return { recuperado: true, parcial: true }
      }

      marcarAdvertenciaRecuperacion('Los datos locales estaban dañados y no había una copia local para recuperarlos.')
      return { recuperado: false, error: true }
    })
    .catch((err) => {
      const datosVacios = { clientes: [], vehiculos: [], servicios: [], ordenes: [] }
      aplicarDatosAlEstado(datosVacios)
      marcarAdvertenciaRecuperacion(`No se pudo iniciar la recuperación local: ${err.message}`)
      return { recuperado: false, error: true }
    })
    .finally(() => {
      datosListos.value = true
      iniciarPersistencia()
    })

  return inicializacionDatos
}

export const useAutoService = () => {
  const { success, error, warning } = useNotifications()
  
  // Cargar una sola vez y recuperar la última copia local si fuera necesario.
  const eraPrimeraInicializacion = !inicializacionIniciada
  const carga = inicializarDatos()
  if (eraPrimeraInicializacion) {
    void carga.then((resultado) => {
      if (resultado.recuperado) success('Datos recuperados automáticamente desde la última copia local')
      else if (resultado.error) warning('No se encontró una copia local válida para recuperar')
    })
  }

  // FUNCIONES DE WHATSAPP 📱
  
  // Función para limpiar y formatear teléfono
  const limpiarTelefono = (telefono) => {
    if (!telefono) return ''
    
    // Remover todo lo que no sea número
    let numeroLimpio = telefono.replace(/\D/g, '')
    
    // Si empieza con 15, agregar 549 (Argentina)
    if (numeroLimpio.startsWith('15')) {
      numeroLimpio = '549' + numeroLimpio
    }
    // Si no tiene código de país, asumir Argentina  
    else if (numeroLimpio.length === 10 && !numeroLimpio.startsWith('54')) {
      numeroLimpio = '549' + numeroLimpio
    }
    // Si empieza con 9 (área), agregar 54
    else if (numeroLimpio.length === 11 && numeroLimpio.startsWith('9')) {
      numeroLimpio = '54' + numeroLimpio
    }
    
    return numeroLimpio
  }
  
  // Función para formatear teléfono para mostrar
  const formatearTelefonoDisplay = (telefono) => {
    if (!telefono) return 'Sin teléfono'
    
    // Si es formato internacional (549...)
    if (telefono.startsWith('549') && telefono.length >= 13) {
      const area = telefono.slice(3, 5)
      const numero = telefono.slice(5)
      return `+54 9 ${area} ${numero.slice(0, 4)}-${numero.slice(4)}`
    }
    
    return telefono
  }
  
  // Función para generar enlace de WhatsApp
  const generarEnlaceWhatsApp = (telefono, mensaje) => {
    if (!telefono) {
      console.error('No hay teléfono para WhatsApp')
      return null
    }
    
    const telefonoLimpio = limpiarTelefono(telefono)
    const mensajeCodificado = encodeURIComponent(mensaje)
    
    return `https://wa.me/${telefonoLimpio}?text=${mensajeCodificado}`
  }
  
  // Función para notificar que el auto está listo
  const notificarAutoListo = (orden) => {
    const cliente = obtenerClientePorId(orden.clienteId)
    const vehiculo = obtenerVehiculoPorId(orden.vehiculoId)
    
    if (!cliente || !vehiculo) {
      error('No se encontró la información del cliente o vehículo')
      return null
    }
    
    if (!cliente.telefono) {
      error(`El cliente ${cliente.nombre} no tiene teléfono registrado`)
      return null
    }
    
    // Buscar el servicio correspondiente para obtener el costo final
    const serviciosVehiculo = obtenerServiciosPorVehiculo(orden.vehiculoId)
    const servicioReciente = serviciosVehiculo
      .filter(s => new Date(s.fechaServicio) >= new Date(orden.fechaCreacion))
      .sort((a, b) => new Date(b.fechaServicio) - new Date(a.fechaServicio))[0]
    
    let costoMostrar = 'A convenir'
    if (servicioReciente && servicioReciente.costo) {
      costoMostrar = `${servicioReciente.costo.toLocaleString()}`
    } else if (orden.costoEstimado) {
      costoMostrar = `${orden.costoEstimado.toLocaleString()}`
    }
    
    const mensaje = `Hola ${cliente.nombre}! 👋

Tu ${vehiculo.marca} ${vehiculo.modelo} ${vehiculo.patente} ya está listo ✅

Trabajo realizado:
${orden.descripcionTrabajo}

Total: ${costoMostrar}

Horario: Lunes a Viernes 8-18hs
¡Gracias por confiar en nosotros! 🚗✨`
    
    return generarEnlaceWhatsApp(cliente.telefono, mensaje)
  }
  
  // Función para recordatorio de próximo servicio
  const recordatorioProximoServicio = (vehiculo, cliente) => {
    if (!cliente || !cliente.telefono) {
      error('El cliente no tiene teléfono registrado')
      return null
    }
    
    const mensaje = `Hola ${cliente.nombre}! 👋

Tu ${vehiculo.marca} ${vehiculo.modelo} está próximo al service 🔧

¿Coordinamos una fecha?
📅 Turnos disponibles esta semana

Escribínos para más info!`
    
    return generarEnlaceWhatsApp(cliente.telefono, mensaje)
  }
  
  // Función para contacto rápido
  const contactoRapido = (cliente) => {
    if (!cliente || !cliente.telefono) {
      error('El cliente no tiene teléfono registrado')
      return null
    }
    
    const mensaje = `Hola ${cliente.nombre}! 👋

¿Cómo estás? 🚗

¿En qué te podemos ayudar?`
    
    return generarEnlaceWhatsApp(cliente.telefono, mensaje)
  }
  
  // Función para compartir fotos del trabajo
  const compartirFotos = (orden) => {
    const cliente = obtenerClientePorId(orden.clienteId)
    const vehiculo = obtenerVehiculoPorId(orden.vehiculoId)
    
    if (!cliente || !vehiculo) {
      error('No se encontró la información del cliente o vehículo')
      return null
    }
    
    if (!cliente.telefono) {
      error(`El cliente ${cliente.nombre} no tiene teléfono registrado`)
      return null
    }
    
    const mensaje = `Hola ${cliente.nombre}! 👋

Te enviamos las fotos del trabajo realizado en tu ${vehiculo.marca} ${vehiculo.modelo} 📸

Todo perfecto! ✨

¿Consultas? Escribinos 📱`
    
    return generarEnlaceWhatsApp(cliente.telefono, mensaje)
  }
  
  // Función para abrir WhatsApp
  const abrirWhatsApp = (enlace) => {
    if (!enlace) {
      error('No se pudo generar el enlace de WhatsApp')
      return
    }
    
    // Detectar si es móvil o desktop
    const esMobil = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
    
    if (esMobil) {
      // En móvil, abrir app de WhatsApp
      window.open(enlace, '_blank')
    } else {
      // En desktop, abrir WhatsApp Web
      window.open(enlace, '_blank')
    }
    
    success('WhatsApp abierto 📱')
  }

  // Función para agregar cliente (MEJORADA CON WHATSAPP)
  const agregarCliente = (cliente) => {
    if (!cliente.nombre?.trim()) {
      error('El cliente necesita un nombre')
      return null
    }
    const email = normalizarEmail(cliente.email)
    if (email && existeValorDuplicado(clientes.value, 'email', email)) {
      error('Ya existe un cliente con ese email')
      return null
    }

    const nuevoCliente = {
      id: crearIdUnico(),
      ...cliente,
      email,
      telefono: limpiarTelefono(cliente.telefono || ''),
      fechaCreacion: new Date().toISOString()
    }
    clientes.value.push(nuevoCliente)
    success(`Cliente ${cliente.nombre} agregado exitosamente`)
    return nuevoCliente
  }

  // Función para actualizar cliente (MEJORADA CON WHATSAPP)
  const actualizarCliente = (id, clienteActualizado) => {
    const index = clientes.value.findIndex(c => idsIguales(c.id, id))
    if (index !== -1) {
      const clienteCombinado = { ...clientes.value[index], ...clienteActualizado }
      if (!clienteCombinado.nombre?.trim()) {
        error('El cliente necesita un nombre')
        return null
      }
      const email = normalizarEmail(clienteCombinado.email)
      if (email && existeValorDuplicado(clientes.value, 'email', email, id)) {
        error('Ya existe un cliente con ese email')
        return null
      }
      const datosActualizados = {
        ...clienteCombinado,
        email,
        telefono: limpiarTelefono(clienteCombinado.telefono || '')
      }
      clientes.value[index] = { ...clientes.value[index], ...datosActualizados }
      success(`Cliente ${clienteActualizado.nombre} actualizado exitosamente`)
      return clientes.value[index]
    }
    error('Cliente no encontrado')
    return null
  }

  // Función para eliminar cliente
  const eliminarCliente = (id) => {
    const tieneVehiculos = vehiculos.value.some(v => idsIguales(v.clienteId, id))
    const tieneActividad = servicios.value.some(s => idsIguales(s.clienteId, id)) ||
      ordenes.value.some(o => idsIguales(o.clienteId, id))
    if (tieneVehiculos || tieneActividad) {
      error('No se puede eliminar el cliente porque tiene vehículos, servicios u órdenes asociados')
      return false
    }

    const index = clientes.value.findIndex(c => idsIguales(c.id, id))
    if (index !== -1) {
      const cliente = clientes.value[index]
      clientes.value.splice(index, 1)
      success(`Cliente ${cliente.nombre} eliminado exitosamente`)
      return true
    }
    error('Cliente no encontrado')
    return false
  }

  // Función para agregar vehículo
  const agregarVehiculo = (vehiculo) => {
    const patente = normalizarPatente(vehiculo.patente)
    if (!vehiculo.marca?.trim() || !vehiculo.modelo?.trim()) {
      error('El vehículo necesita marca y modelo')
      return null
    }
    if (!esPatenteArgentinaValida(patente)) {
      error('La patente debe tener formato ABC123 o AB123CD')
      return null
    }
    if (existeValorDuplicado(vehiculos.value, 'patente', patente)) {
      error(`Ya existe un vehículo con la patente ${patente}`)
      return null
    }
    if (!clientes.value.some(c => idsIguales(c.id, vehiculo.clienteId))) {
      error('El cliente seleccionado no existe')
      return null
    }

    const nuevoVehiculo = {
      id: crearIdUnico(),
      ...vehiculo,
      patente,
      fechaCreacion: new Date().toISOString()
    }
    vehiculos.value.push(nuevoVehiculo)
    success(`Vehículo ${vehiculo.marca} ${vehiculo.modelo} agregado exitosamente`)
    return nuevoVehiculo
  }

  // Función para actualizar vehículo
  const actualizarVehiculo = (id, vehiculoActualizado) => {
    const index = vehiculos.value.findIndex(v => idsIguales(v.id, id))
    if (index !== -1) {
      const vehiculoCombinado = { ...vehiculos.value[index], ...vehiculoActualizado }
      const patente = normalizarPatente(vehiculoCombinado.patente)
      if (!vehiculoCombinado.marca?.trim() || !vehiculoCombinado.modelo?.trim()) {
        error('El vehículo necesita marca y modelo')
        return null
      }
      if (!esPatenteArgentinaValida(patente)) {
        error('La patente debe tener formato ABC123 o AB123CD')
        return null
      }
      if (existeValorDuplicado(vehiculos.value, 'patente', patente, id)) {
        error(`Ya existe un vehículo con la patente ${patente}`)
        return null
      }
      if (!clientes.value.some(c => idsIguales(c.id, vehiculoCombinado.clienteId))) {
        error('El cliente seleccionado no existe')
        return null
      }
      vehiculos.value[index] = { ...vehiculoCombinado, patente }
      success(`Vehículo ${vehiculoActualizado.marca} ${vehiculoActualizado.modelo} actualizado exitosamente`)
      return vehiculos.value[index]
    }
    error('Vehículo no encontrado')
    return null
  }

  // Función para eliminar vehículo
  const eliminarVehiculo = (id) => {
    const tieneServicios = servicios.value.some(s => idsIguales(s.vehiculoId, id))
    const tieneOrdenes = ordenes.value.some(o => idsIguales(o.vehiculoId, id))
    if (tieneServicios || tieneOrdenes) {
      error('No se puede eliminar el vehículo porque tiene servicios u órdenes asociados')
      return false
    }

    const index = vehiculos.value.findIndex(v => idsIguales(v.id, id))
    if (index !== -1) {
      const vehiculo = vehiculos.value[index]
      vehiculos.value.splice(index, 1)
      success(`Vehículo ${vehiculo.marca} ${vehiculo.modelo} eliminado exitosamente`)
      return true
    }
    error('Vehículo no encontrado')
    return false
  }

  // Función para agregar servicio
  const agregarServicio = (servicio) => {
    const vehiculo = vehiculos.value.find(v => idsIguales(v.id, servicio.vehiculoId))
    if (!vehiculo || !clientes.value.some(c => idsIguales(c.id, servicio.clienteId)) ||
        !idsIguales(vehiculo.clienteId, servicio.clienteId)) {
      error('El servicio necesita un vehículo y un cliente válidos')
      return null
    }
    if (!servicio.tipoServicio || !servicio.fechaServicio ||
        (servicio.costo !== undefined && (!Number.isFinite(Number(servicio.costo)) || Number(servicio.costo) < 0))) {
      error('Revisa el tipo, la fecha y el costo del servicio')
      return null
    }
    const nuevoServicio = {
      id: crearIdUnico(),
      ...servicio,
      fechaCreacion: new Date().toISOString()
    }
    servicios.value.push(nuevoServicio)
    success(`Servicio ${servicio.tipoServicio} agregado exitosamente`)
    return nuevoServicio
  }

  // Función para actualizar servicio
  const actualizarServicio = (id, servicioActualizado) => {
    const index = servicios.value.findIndex(s => idsIguales(s.id, id))
    if (index !== -1) {
      const servicioCombinado = { ...servicios.value[index], ...servicioActualizado }
      const vehiculoValido = vehiculos.value.some(v => idsIguales(v.id, servicioCombinado.vehiculoId))
      const vehiculo = vehiculos.value.find(v => idsIguales(v.id, servicioCombinado.vehiculoId))
      const clienteValido = clientes.value.some(c => idsIguales(c.id, servicioCombinado.clienteId))
      if (!vehiculoValido || !clienteValido || !idsIguales(vehiculo?.clienteId, servicioCombinado.clienteId)) {
        error('El servicio necesita un vehículo y un cliente válidos')
        return null
      }
      if (!servicioCombinado.tipoServicio || !servicioCombinado.fechaServicio ||
          (servicioCombinado.costo !== undefined && (!Number.isFinite(Number(servicioCombinado.costo)) || Number(servicioCombinado.costo) < 0))) {
        error('Revisa el tipo, la fecha y el costo del servicio')
        return null
      }
      servicios.value[index] = servicioCombinado
      success(`Servicio ${servicioActualizado.tipoServicio} actualizado exitosamente`)
      return servicios.value[index]
    }
    error('Servicio no encontrado')
    return null
  }

  // Función para eliminar servicio
  const eliminarServicio = (id) => {
    const index = servicios.value.findIndex(s => idsIguales(s.id, id))
    if (index !== -1) {
      const servicio = servicios.value[index]
      servicios.value.splice(index, 1)
      success(`Servicio eliminado exitosamente`)
      return true
    }
    error('Servicio no encontrado')
    return false
  }

  // Función para obtener cliente por ID
  const obtenerClientePorId = (id) => {
    return clientes.value.find(c => idsIguales(c.id, id))
  }

  // Función para obtener vehículo por ID
  const obtenerVehiculoPorId = (id) => {
    return vehiculos.value.find(v => idsIguales(v.id, id))
  }

  // Función para agregar orden
  const agregarOrden = (orden) => {
    const vehiculo = vehiculos.value.find(v => idsIguales(v.id, orden.vehiculoId))
    if (!vehiculo || !clientes.value.some(c => idsIguales(c.id, orden.clienteId)) ||
        !idsIguales(vehiculo.clienteId, orden.clienteId)) {
      error('La orden necesita un vehículo y un cliente válidos')
      return null
    }
    if (!orden.descripcionTrabajo?.trim() ||
        (orden.costoEstimado !== undefined && (!Number.isFinite(Number(orden.costoEstimado)) || Number(orden.costoEstimado) < 0))) {
      error('La orden necesita una descripción y un presupuesto válido')
      return null
    }
    const nuevaOrden = {
      id: crearIdUnico(),
      ...orden,
      fechaCreacion: new Date().toISOString()
    }
    ordenes.value.push(nuevaOrden)
    success(`Orden agregada exitosamente`)
    return nuevaOrden
  }

  // Función para actualizar orden
  const actualizarOrden = (id, ordenActualizada) => {
    const index = ordenes.value.findIndex(o => idsIguales(o.id, id))
    if (index !== -1) {
      const ordenCombinada = { ...ordenes.value[index], ...ordenActualizada }
      const vehiculoValido = vehiculos.value.some(v => idsIguales(v.id, ordenCombinada.vehiculoId))
      const vehiculo = vehiculos.value.find(v => idsIguales(v.id, ordenCombinada.vehiculoId))
      const clienteValido = clientes.value.some(c => idsIguales(c.id, ordenCombinada.clienteId))
      if (!vehiculoValido || !clienteValido || !idsIguales(vehiculo?.clienteId, ordenCombinada.clienteId)) {
        error('La orden necesita un vehículo y un cliente válidos')
        return null
      }
      if (!ordenCombinada.descripcionTrabajo?.trim() ||
          (ordenCombinada.costoEstimado !== undefined && (!Number.isFinite(Number(ordenCombinada.costoEstimado)) || Number(ordenCombinada.costoEstimado) < 0))) {
        error('La orden necesita una descripción y un presupuesto válido')
        return null
      }
      ordenes.value[index] = ordenCombinada
      success(`Orden actualizada exitosamente`)
      return ordenes.value[index]
    }
    error('Orden no encontrada')
    return null
  }

  // Función para eliminar orden
  const eliminarOrden = (id) => {
    const index = ordenes.value.findIndex(o => idsIguales(o.id, id))
    if (index !== -1) {
      const orden = ordenes.value[index]
      ordenes.value.splice(index, 1)
      success(`Orden eliminada exitosamente`)
      return true
    }
    error('Orden no encontrada')
    return false
  }

  // Función para obtener servicios por vehículo
  const obtenerServiciosPorVehiculo = (vehiculoId) => {
    return servicios.value.filter(s => idsIguales(s.vehiculoId, vehiculoId))
  }

  // Computed para vehículos con alertas de servicio
  const vehiculosConAlertas = computed(() => {
    const hoy = new Date()
    hoy.setHours(0, 0, 0, 0) // Resetear horas para comparación exacta

    return vehiculos.value.map(vehiculo => {
      const serviciosVehiculo = obtenerServiciosPorVehiculo(vehiculo.id)
      const ultimoServicio = serviciosVehiculo
        .sort((a, b) => new Date(b.fechaServicio) - new Date(a.fechaServicio))[0]

      let alerta = null
      if (ultimoServicio && ultimoServicio.proximoServicio) {
        // Crear fecha local para evitar problema de zona horaria
        const fechaProximoServicio = new Date(ultimoServicio.proximoServicio + 'T00:00:00')
        const diasRestantes = Math.ceil((fechaProximoServicio.getTime() - hoy.getTime()) / (24 * 60 * 60 * 1000))
        
        if (diasRestantes < 0) {
          alerta = { tipo: 'vencido', dias: Math.abs(diasRestantes) }
        } else if (diasRestantes <= 7) {
          alerta = { tipo: 'urgente', dias: diasRestantes }
        } else if (diasRestantes <= 30) {
          alerta = { tipo: 'proximo', dias: diasRestantes }
        }
      }

      return {
        ...vehiculo,
        ultimoServicio,
        alerta,
        cliente: obtenerClientePorId(vehiculo.clienteId)
      }
    })
  })

  // Computed para estadísticas del dashboard
  const estadisticas = computed(() => {
    const hoy = new Date()
    const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1)
    inicioMes.setHours(0, 0, 0, 0)
    
    const serviciosEstesMes = servicios.value.filter(s => {
      // Crear fecha local para evitar problema de zona horaria
      const fechaServicio = new Date(s.fechaServicio + 'T00:00:00')
      return fechaServicio >= inicioMes
    }).length

    const alertasVencidas = vehiculosConAlertas.value.filter(v => 
      v.alerta?.tipo === 'vencido'
    ).length

    const alertasUrgentes = vehiculosConAlertas.value.filter(v => 
      v.alerta?.tipo === 'urgente'
    ).length

    const alertasProximas = vehiculosConAlertas.value.filter(v => 
      v.alerta?.tipo === 'proximo'
    ).length

    const totalOrdenes = ordenes.value.length
    const ordenesPendientes = ordenes.value.filter(o => o.estado === 'pendiente').length
    const ordenesVencidas = ordenes.value.filter(o => {
      const hoy = new Date()
      return o.fechaVencimiento && 
             new Date(o.fechaVencimiento) < hoy && 
             o.estado !== 'completada' && 
             o.estado !== 'cancelada'
    }).length

    return {
      totalClientes: clientes.value.length,
      totalVehiculos: vehiculos.value.length,
      totalServicios: servicios.value.length,
      totalOrdenes,
      ordenesPendientes,
      ordenesVencidas,
      serviciosEstesMes,
      alertasVencidas,
      alertasUrgentes,
      alertasProximas
    }
  })

  return {
    // Estado
    clientes,
    vehiculos,
    servicios,
    ordenes,
    datosListos,
    inicializacionDatos,
    vehiculosConAlertas,
    estadisticas,
    
    // Funciones de clientes
    agregarCliente,
    actualizarCliente,
    eliminarCliente,
    obtenerClientePorId,
    
    // Funciones de vehículos
    agregarVehiculo,
    actualizarVehiculo,
    eliminarVehiculo,
    obtenerVehiculoPorId,
    
    // Funciones de servicios
    agregarServicio,
    actualizarServicio,
    eliminarServicio,
    obtenerServiciosPorVehiculo,
    
    // Funciones de órdenes
    agregarOrden,
    actualizarOrden,
    eliminarOrden,
    
    // FUNCIONES DE WHATSAPP 📱
    limpiarTelefono,
    formatearTelefonoDisplay,
    generarEnlaceWhatsApp,
    notificarAutoListo,
    recordatorioProximoServicio,
    contactoRapido,
    compartirFotos,
    abrirWhatsApp
  }
}
