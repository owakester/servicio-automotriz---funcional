import { ref, computed, watch } from 'vue'
import { useNotifications } from './useNotifications'

// Estado global de la aplicación
const clientes = ref([])
const vehiculos = ref([])
const servicios = ref([])
const ordenes = ref([])

// Función para cargar datos del localStorage
const loadData = () => {
  const clientesData = localStorage.getItem('autoservice_clientes')
  const vehiculosData = localStorage.getItem('autoservice_vehiculos')
  const serviciosData = localStorage.getItem('autoservice_servicios')
  const ordenesData = localStorage.getItem('autoservice_ordenes')

  if (clientesData) clientes.value = JSON.parse(clientesData)
  if (vehiculosData) vehiculos.value = JSON.parse(vehiculosData)
  if (serviciosData) servicios.value = JSON.parse(serviciosData)
  if (ordenesData) ordenes.value = JSON.parse(ordenesData)
}

// Función para guardar datos en localStorage
const saveData = () => {
  localStorage.setItem('autoservice_clientes', JSON.stringify(clientes.value))
  localStorage.setItem('autoservice_vehiculos', JSON.stringify(vehiculos.value))
  localStorage.setItem('autoservice_servicios', JSON.stringify(servicios.value))
  localStorage.setItem('autoservice_ordenes', JSON.stringify(ordenes.value))
}

// Watchers para guardar automáticamente
watch(clientes, saveData, { deep: true })
watch(vehiculos, saveData, { deep: true })
watch(servicios, saveData, { deep: true })
watch(ordenes, saveData, { deep: true })

export const useAutoService = () => {
  const { success, error } = useNotifications()
  
  // Cargar datos al inicializar
  if (clientes.value.length === 0) loadData()

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
    const nuevoCliente = {
      id: Date.now(),
      ...cliente,
      telefono: limpiarTelefono(cliente.telefono || ''),
      fechaCreacion: new Date().toISOString()
    }
    clientes.value.push(nuevoCliente)
    success(`Cliente ${cliente.nombre} agregado exitosamente`)
    return nuevoCliente
  }

  // Función para actualizar cliente (MEJORADA CON WHATSAPP)
  const actualizarCliente = (id, clienteActualizado) => {
    const index = clientes.value.findIndex(c => c.id === id)
    if (index !== -1) {
      const datosActualizados = {
        ...clienteActualizado,
        telefono: limpiarTelefono(clienteActualizado.telefono || '')
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
    const index = clientes.value.findIndex(c => c.id === id)
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
    const nuevoVehiculo = {
      id: Date.now(),
      ...vehiculo,
      fechaCreacion: new Date().toISOString()
    }
    vehiculos.value.push(nuevoVehiculo)
    success(`Vehículo ${vehiculo.marca} ${vehiculo.modelo} agregado exitosamente`)
    return nuevoVehiculo
  }

  // Función para actualizar vehículo
  const actualizarVehiculo = (id, vehiculoActualizado) => {
    const index = vehiculos.value.findIndex(v => v.id === id)
    if (index !== -1) {
      vehiculos.value[index] = { ...vehiculos.value[index], ...vehiculoActualizado }
      success(`Vehículo ${vehiculoActualizado.marca} ${vehiculoActualizado.modelo} actualizado exitosamente`)
      return vehiculos.value[index]
    }
    error('Vehículo no encontrado')
    return null
  }

  // Función para eliminar vehículo
  const eliminarVehiculo = (id) => {
    const index = vehiculos.value.findIndex(v => v.id === id)
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
    const nuevoServicio = {
      id: Date.now(),
      ...servicio,
      fechaCreacion: new Date().toISOString()
    }
    servicios.value.push(nuevoServicio)
    success(`Servicio ${servicio.tipoServicio} agregado exitosamente`)
    return nuevoServicio
  }

  // Función para actualizar servicio
  const actualizarServicio = (id, servicioActualizado) => {
    const index = servicios.value.findIndex(s => s.id === id)
    if (index !== -1) {
      servicios.value[index] = { ...servicios.value[index], ...servicioActualizado }
      success(`Servicio ${servicioActualizado.tipoServicio} actualizado exitosamente`)
      return servicios.value[index]
    }
    error('Servicio no encontrado')
    return null
  }

  // Función para eliminar servicio
  const eliminarServicio = (id) => {
    const index = servicios.value.findIndex(s => s.id === id)
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
    return clientes.value.find(c => c.id === id)
  }

  // Función para obtener vehículo por ID
  const obtenerVehiculoPorId = (id) => {
    return vehiculos.value.find(v => v.id === id)
  }

  // Función para agregar orden
  const agregarOrden = (orden) => {
    const nuevaOrden = {
      id: Date.now(),
      ...orden,
      fechaCreacion: new Date().toISOString()
    }
    ordenes.value.push(nuevaOrden)
    success(`Orden agregada exitosamente`)
    return nuevaOrden
  }

  // Función para actualizar orden
  const actualizarOrden = (id, ordenActualizada) => {
    const index = ordenes.value.findIndex(o => o.id === id)
    if (index !== -1) {
      ordenes.value[index] = { ...ordenes.value[index], ...ordenActualizada }
      success(`Orden actualizada exitosamente`)
      return ordenes.value[index]
    }
    error('Orden no encontrada')
    return null
  }

  // Función para eliminar orden
  const eliminarOrden = (id) => {
    const index = ordenes.value.findIndex(o => o.id === id)
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
    return servicios.value.filter(s => s.vehiculoId === vehiculoId)
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
