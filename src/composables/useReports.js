import { computed } from 'vue'
import { useAutoService } from './useAutoService'

export const useReports = () => {
  const { clientes, vehiculos, servicios, obtenerClientePorId, obtenerVehiculoPorId } = useAutoService()

  // Reporte de servicios por periodo
  const getServiciosPorPeriodo = (fechaInicio, fechaFin) => {
    const inicio = new Date(fechaInicio)
    const fin = new Date(fechaFin)
    
    return servicios.value
      .filter(servicio => {
        const fechaServicio = new Date(servicio.fechaServicio)
        return fechaServicio >= inicio && fechaServicio <= fin
      })
      .map(servicio => ({
        ...servicio,
        cliente: obtenerClientePorId(servicio.clienteId),
        vehiculo: obtenerVehiculoPorId(servicio.vehiculoId)
      }))
      .sort((a, b) => new Date(b.fechaServicio) - new Date(a.fechaServicio))
  }

  // Reporte de ingresos por periodo
  const getIngresosPorPeriodo = (fechaInicio, fechaFin) => {
    const serviciosPeriodo = getServiciosPorPeriodo(fechaInicio, fechaFin)
    
    const totalIngresos = serviciosPeriodo.reduce((total, servicio) => 
      total + (servicio.costo || 0), 0
    )

    const ingresosPorTipo = serviciosPeriodo.reduce((acc, servicio) => {
      const tipo = servicio.tipoServicio
      if (!acc[tipo]) {
        acc[tipo] = { cantidad: 0, total: 0 }
      }
      acc[tipo].cantidad++
      acc[tipo].total += servicio.costo || 0
      return acc
    }, {})

    return {
      totalIngresos,
      cantidadServicios: serviciosPeriodo.length,
      ingresosPorTipo,
      servicios: serviciosPeriodo
    }
  }

  // Reporte de clientes más frecuentes
  const getClientesFrecuentes = (limite = 10) => {
    const clientesConServicios = clientes.value.map(cliente => {
      const serviciosCliente = servicios.value.filter(s => s.clienteId === cliente.id)
      const totalGastado = serviciosCliente.reduce((total, servicio) => 
        total + (servicio.costo || 0), 0
      )
      
      return {
        ...cliente,
        cantidadServicios: serviciosCliente.length,
        totalGastado,
        ultimoServicio: serviciosCliente
          .sort((a, b) => new Date(b.fechaServicio) - new Date(a.fechaServicio))[0]
      }
    })
    .filter(cliente => cliente.cantidadServicios > 0)
    .sort((a, b) => b.cantidadServicios - a.cantidadServicios)
    .slice(0, limite)

    return clientesConServicios
  }

  // Reporte de vehículos por marca/modelo
  const getVehiculosPorMarca = () => {
    const vehiculosPorMarca = vehiculos.value.reduce((acc, vehiculo) => {
      const clave = `${vehiculo.marca} ${vehiculo.modelo}`
      if (!acc[clave]) {
        acc[clave] = {
          marca: vehiculo.marca,
          modelo: vehiculo.modelo,
          cantidad: 0,
          vehiculos: []
        }
      }
      acc[clave].cantidad++
      acc[clave].vehiculos.push(vehiculo)
      return acc
    }, {})

    return Object.values(vehiculosPorMarca)
      .sort((a, b) => b.cantidad - a.cantidad)
  }

  // Estadísticas mensuales del año actual
  const getEstadisticasAnuales = (anio = new Date().getFullYear()) => {
    const meses = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ]

    const estadisticasPorMes = meses.map((mes, index) => {
      const inicioMes = new Date(anio, index, 1)
      const finMes = new Date(anio, index + 1, 0)
      
      const serviciosMes = servicios.value.filter(servicio => {
        const fechaServicio = new Date(servicio.fechaServicio)
        return fechaServicio >= inicioMes && fechaServicio <= finMes
      })

      const ingresosMes = serviciosMes.reduce((total, servicio) => 
        total + (servicio.costo || 0), 0
      )

      return {
        mes,
        cantidadServicios: serviciosMes.length,
        ingresos: ingresosMes
      }
    })

    return estadisticasPorMes
  }

  // Exportar datos a CSV
  const exportarCSV = (datos, nombreArchivo, columnas) => {
    const headers = Object.keys(columnas).join(',')
    
    const filas = datos.map(item => 
      Object.keys(columnas).map(key => {
        const valor = columnas[key](item)
        return typeof valor === 'string' && valor.includes(',') 
          ? `"${valor}"` 
          : valor
      }).join(',')
    )

    const csv = [headers, ...filas].join('\n')
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob)
      link.setAttribute('href', url)
      link.setAttribute('download', `${nombreArchivo}.csv`)
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }
  }

  // Exportar servicios a CSV
  const exportarServicios = (fechaInicio, fechaFin) => {
    const servicios = getServiciosPorPeriodo(fechaInicio, fechaFin)
    
    const columnas = {
      'Fecha': (s) => new Date(s.fechaServicio).toLocaleDateString('es-ES'),
      'Cliente': (s) => s.cliente?.nombre || '',
      'Vehículo': (s) => `${s.vehiculo?.marca || ''} ${s.vehiculo?.modelo || ''}`,
      'Patente': (s) => s.vehiculo?.patente || '',
      'Tipo de Servicio': (s) => s.tipoServicio,
      'Estado': (s) => s.estado,
      'Costo': (s) => s.costo || 0,
      'Descripción': (s) => s.descripcion || '',
      'Observaciones': (s) => s.observaciones || ''
    }

    exportarCSV(servicios, `servicios_${fechaInicio}_${fechaFin}`, columnas)
  }

  // Exportar clientes a CSV
  const exportarClientes = () => {
    const clientesConDatos = getClientesFrecuentes(clientes.value.length)
    
    const columnas = {
      'Nombre': (c) => c.nombre,
      'Email': (c) => c.email,
      'Teléfono': (c) => c.telefono,
      'Dirección': (c) => c.direccion || '',
      'Cantidad de Servicios': (c) => c.cantidadServicios,
      'Total Gastado': (c) => c.totalGastado,
      'Último Servicio': (c) => c.ultimoServicio ? new Date(c.ultimoServicio.fechaServicio).toLocaleDateString('es-ES') : '',
      'Fecha de Registro': (c) => new Date(c.fechaCreacion).toLocaleDateString('es-ES')
    }

    exportarCSV(clientesConDatos, 'clientes', columnas)
  }

  return {
    getServiciosPorPeriodo,
    getIngresosPorPeriodo,
    getClientesFrecuentes,
    getVehiculosPorMarca,
    getEstadisticasAnuales,
    exportarCSV,
    exportarServicios,
    exportarClientes
  }
}
