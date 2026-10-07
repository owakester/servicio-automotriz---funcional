import { useAutoService } from './useAutoService'
import { useGoogleDrive } from './useGoogleDrive'
import { useNotifications } from './useNotifications'
import { diasHastaFecha, fechaParaInput, formatearFecha, parsearFechaLocal } from '../utils/dates'
import { formatearDniCuil } from '../utils/clientIdentity'

export const useProximosServicios = () => {
  const { vehiculos, servicios, obtenerClientePorId, obtenerServiciosPorVehiculo } = useAutoService()
  const { subirArchivoAGoogleDrive, estaAutenticado } = useGoogleDrive()
  const { success, error } = useNotifications()

  const obtenerDatosProximosServicios = () => {
    const hoy = new Date()
    hoy.setHours(0, 0, 0, 0)
    const proximosServicios = []

    vehiculos.value.forEach(vehiculo => {
      const cliente = obtenerClientePorId(vehiculo.clienteId)
      const serviciosVehiculo = obtenerServiciosPorVehiculo(vehiculo.id)
      
      const ultimoServicio = serviciosVehiculo
        .filter(s => s.estado !== 'cancelado')
        .sort((a, b) => parsearFechaLocal(b.fechaServicio) - parsearFechaLocal(a.fechaServicio))[0]

      if (ultimoServicio && ultimoServicio.proximoServicio) {
        const diasRestantes = diasHastaFecha(ultimoServicio.proximoServicio, hoy)
        if (diasRestantes === null) return
        
        let estado = 'Normal'; let prioridad = 'Baja'
        
        if (diasRestantes < 0) {
          estado = 'Vencido'; prioridad = 'Crítica'
        } else if (diasRestantes <= 7) {
          estado = 'Urgente'; prioridad = 'Alta'
        } else if (diasRestantes <= 30) {
          estado = 'Próximo'; prioridad = 'Media'
        }

        proximosServicios.push({
          fecha_proximo_servicio: ultimoServicio.proximoServicio,
          dias_restantes: diasRestantes, estado, prioridad,
          cliente_nombre: cliente?.nombre || 'Sin cliente',
          cliente_dni_cuil: formatearDniCuil(cliente?.dniCuil),
          cliente_telefono: cliente?.telefono || 'Sin teléfono',
          cliente_email: cliente?.email || 'Sin email',
          vehiculo_marca: vehiculo.marca, vehiculo_modelo: vehiculo.modelo,
          vehiculo_patente: vehiculo.patente, vehiculo_año: vehiculo.año,
          vehiculo_color: vehiculo.color || '',
          ultimo_servicio_fecha: ultimoServicio.fechaServicio,
          ultimo_servicio_tipo: ultimoServicio.tipoServicio,
          ultimo_servicio_km: ultimoServicio.kilometrajeActual || 0,
          ultimo_servicio_costo: ultimoServicio.costo || 0,
          observaciones: (ultimoServicio.observaciones || '').replace(/"/g, '""')
        })
      }
    })
    return proximosServicios.sort((a, b) => a.dias_restantes - b.dias_restantes)
  }

  const convertirACSV = (datos) => {
    if (datos.length === 0) { return '' }
    const headers = [
      'Fecha Próximo Servicio', 'Días Restantes', 'Estado', 'Prioridad', 'Cliente', 'DNI/CUIL', 'Teléfono',
      'Email', 'Marca', 'Modelo', 'Patente', 'Año', 'Color', 'Último Servicio (Fecha)',
      'Último Servicio (Tipo)', 'Último Servicio (KM)', 'Último Servicio (Costo)', 'Observaciones'
    ]
    const filas = datos.map(s => [
      formatearFecha(s.fecha_proximo_servicio),
      s.dias_restantes, s.estado, s.prioridad, `"${s.cliente_nombre}"`, s.cliente_dni_cuil || '', s.cliente_telefono,
      s.cliente_email, s.vehiculo_marca, s.vehiculo_modelo, s.vehiculo_patente, s.vehiculo_año,
      s.vehiculo_color, formatearFecha(s.ultimo_servicio_fecha),
      `"${s.ultimo_servicio_tipo}"`, s.ultimo_servicio_km, s.ultimo_servicio_costo, `"${s.observaciones}"`
    ])
    return [headers, ...filas].map(fila => fila.join(',')).join('\n')
  }

  const descargarCSVLocal = () => {
    try {
      const datosServicios = obtenerDatosProximosServicios()
      if (datosServicios.length === 0) {
        error('No hay próximos servicios programados para exportar'); return
      }
      const csvContent = convertirACSV(datosServicios)
      if (!csvContent) return;

      const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' })
      const fechaHoy = fechaParaInput()
      const nombreArchivo = `proximos_servicios_${fechaHoy}.csv`
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob); link.download = nombreArchivo;
      document.body.appendChild(link); link.click(); document.body.removeChild(link);
      success(`CSV descargado: ${nombreArchivo}`)
    } catch (err) {
      console.error('Error al descargar CSV:', err); error('Error al descargar el archivo CSV')
    }
  }

  // ✅ BLOQUE CORREGIDO
  return {
    obtenerDatosProximosServicios,
    convertirACSV, // Esta función faltaba aquí
    descargarCSVLocal
  }
}
