import { computed } from 'vue'
import { useAutoService } from './useAutoService'
import { useNotifications } from './useNotifications'

export const useOrdenes = () => {
  const { ordenes, obtenerVehiculoPorId, obtenerClientePorId, agregarOrden, actualizarOrden: actualizarOrdenService, eliminarOrden: eliminarOrdenService } = useAutoService()
  const { success, error } = useNotifications()

  // Generar número de orden automático
  const generarNumeroOrden = () => {
    const año = new Date().getFullYear()
    const ultimaOrden = ordenes.value
      .filter(o => o.numeroOrden.startsWith(`OM-${año}-`))
      .sort((a, b) => b.numeroOrden.localeCompare(a.numeroOrden))[0]
    
    if (ultimaOrden) {
      const ultimoNumero = parseInt(ultimaOrden.numeroOrden.split('-')[2])
      return `OM-${año}-${String(ultimoNumero + 1).padStart(4, '0')}`
    } else {
      return `OM-${año}-0001`
    }
  }

  // Crear nueva orden
  const crearOrden = (datosOrden) => {
    const nuevaOrden = {
      numeroOrden: generarNumeroOrden(),
      fechaCreacion: new Date().toISOString(),
      fechaVencimiento: datosOrden.fechaVencimiento || null,
      estado: 'pendiente', // pendiente, en_proceso, completada, cancelada
      prioridad: datosOrden.prioridad || 'media', // baja, media, alta, urgente
      imagenes: [], // Array para almacenar imágenes del servicio
      ...datosOrden
    }

    const ordenCreada = agregarOrden(nuevaOrden)
    success(`Orden ${nuevaOrden.numeroOrden} creada exitosamente`)
    return ordenCreada
  }

  // Actualizar orden
  const actualizarOrden = (id, datosActualizados) => {
    const datosConModificacion = {
      ...datosActualizados,
      fechaModificacion: new Date().toISOString()
    }
    return actualizarOrdenService(id, datosConModificacion)
  }

  // Eliminar orden
  const eliminarOrden = (id) => {
    const orden = ordenes.value.find(o => o.id === id)
    if (orden) {
      const resultado = eliminarOrdenService(id)
      if (resultado) {
        success(`Orden ${orden.numeroOrden} eliminada`)
      }
      return resultado
    }
    error('Orden no encontrada')
    return false
  }

  // Cambiar estado de orden
  const cambiarEstadoOrden = (id, nuevoEstado) => {
    const orden = ordenes.value.find(o => o.id === id)
    if (orden) {
      const datosActualizados = {
        estado: nuevoEstado,
        fechaModificacion: new Date().toISOString()
      }
      
      // Agregar fecha de finalización si se completa
      if (nuevoEstado === 'completada') {
        datosActualizados.fechaFinalizacion = new Date().toISOString()
      }
      
      const ordenActualizada = actualizarOrdenService(id, datosActualizados)
      if (ordenActualizada) {
        success(`Orden ${orden.numeroOrden} marcada como ${nuevoEstado}`)
      }
      return ordenActualizada
    }
    error('Orden no encontrada')
    return null
  }

  // Obtener órdenes con información completa
  const ordenesCompletas = computed(() => {
    return ordenes.value.map(orden => ({
      ...orden,
      vehiculo: obtenerVehiculoPorId(orden.vehiculoId),
      cliente: obtenerClientePorId(orden.clienteId)
    }))
  })

  // Filtrar órdenes por estado
  const ordenesPorEstado = (estado) => {
    return ordenesCompletas.value.filter(o => o.estado === estado)
  }

  // Órdenes vencidas
  const ordenesVencidas = computed(() => {
    const hoy = new Date()
    return ordenesCompletas.value.filter(o => 
      o.fechaVencimiento && 
      new Date(o.fechaVencimiento) < hoy && 
      o.estado !== 'completada' && 
      o.estado !== 'cancelada'
    )
  })

  // Órdenes próximas a vencer
  const ordenesProximasVencer = computed(() => {
    const hoy = new Date()
    const enTresDias = new Date(hoy.getTime() + 3 * 24 * 60 * 60 * 1000)
    
    return ordenesCompletas.value.filter(o => 
      o.fechaVencimiento && 
      new Date(o.fechaVencimiento) >= hoy &&
      new Date(o.fechaVencimiento) <= enTresDias &&
      o.estado !== 'completada' && 
      o.estado !== 'cancelada'
    )
  })

  // Estadísticas de órdenes
  const estadisticasOrdenes = computed(() => {
    const total = ordenes.value.length
    const pendientes = ordenes.value.filter(o => o.estado === 'pendiente').length
    const enProceso = ordenes.value.filter(o => o.estado === 'en_proceso').length
    const completadas = ordenes.value.filter(o => o.estado === 'completada').length
    const canceladas = ordenes.value.filter(o => o.estado === 'cancelada').length
    const vencidas = ordenesVencidas.value.length
    const proximasVencer = ordenesProximasVencer.value.length

    return {
      total,
      pendientes,
      enProceso,
      completadas,
      canceladas,
      vencidas,
      proximasVencer
    }
  })

  // Agregar imagen a orden
  const agregarImagenAOrden = (idOrden, imagen) => {
    const orden = ordenes.value.find(o => o.id === idOrden)
    if (orden) {
      const imagenesActuales = orden.imagenes || []
      const nuevasImagenes = [...imagenesActuales, imagen]
      
      const ordenActualizada = actualizarOrdenService(idOrden, { imagenes: nuevasImagenes })
      if (ordenActualizada) {
        success('Imagen agregada a la orden')
      }
      return ordenActualizada
    }
    error('Orden no encontrada')
    return null
  }

  // Eliminar imagen de orden
  const eliminarImagenDeOrden = (idOrden, idImagen) => {
    const orden = ordenes.value.find(o => o.id === idOrden)
    if (orden && orden.imagenes) {
      const imagenesActualizadas = orden.imagenes.filter(img => img.fileId !== idImagen)
      
      const ordenActualizada = actualizarOrdenService(idOrden, { imagenes: imagenesActualizadas })
      if (ordenActualizada) {
        success('Imagen eliminada de la orden')
      }
      return ordenActualizada
    }
    error('Imagen no encontrada')
    return null
  }

  // Obtener imágenes de una orden
  const obtenerImagenesDeOrden = (idOrden) => {
    const orden = ordenes.value.find(o => o.id === idOrden)
    return orden?.imagenes || []
  }

  return {
    ordenes,
    ordenesCompletas,
    crearOrden,
    actualizarOrden,
    eliminarOrden,
    cambiarEstadoOrden,
    agregarImagenAOrden,
    eliminarImagenDeOrden,
    obtenerImagenesDeOrden,
    ordenesPorEstado,
    ordenesVencidas,
    ordenesProximasVencer,
    estadisticasOrdenes,
    generarNumeroOrden
  }
}
