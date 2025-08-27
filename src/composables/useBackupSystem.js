import { ref, watch } from 'vue'
import { useAutoService } from './useAutoService'
import { useNotifications } from './useNotifications'
import { useGoogleDrive } from './useGoogleDrive'
import { useReports } from './useReports'
import { useProximosServicios } from './useProximosServicios'

export const useBackupSystem = () => {
  const { success, error, info } = useNotifications()
  const { clientes, vehiculos, servicios, ordenes } = useAutoService()
  const { 
    estaAutenticado, 
    subirBackupCompletoAGoogleDrive,
    subirArchivoAGoogleDrive, 
    listarBackupsEnGoogleDrive,
    descargarBackupDeGoogleDrive,
    eliminarBackupDeGoogleDrive
  } = useGoogleDrive()
  const { 
    getServiciosPorPeriodo,
    getIngresosPorPeriodo,
    getClientesFrecuentes,
    getVehiculosPorMarca,
    getEstadisticasAnuales
  } = useReports()
  const { 
    obtenerDatosProximosServicios, 
    convertirACSV: convertirProximosServiciosACSV 
  } = useProximosServicios()
  
  const ultimoBackup = ref(localStorage.getItem('ultimoBackup') || null)
  const backupAutomatico = ref(localStorage.getItem('backupAutomatico') === 'true')
  const intervaloBackup = ref(parseInt(localStorage.getItem('intervaloBackup') || '24'))
  const backupGoogleDrive = ref(localStorage.getItem('backupGoogleDrive') === 'true')
  const backupAutomaticoGoogleDrive = ref(localStorage.getItem('backupAutomaticoGoogleDrive') === 'true')
  const ultimoBackupGoogleDrive = ref(localStorage.getItem('ultimoBackupGoogleDrive') || null)
  const backupsEnLaNube = ref([])
  
  watch(backupAutomatico, (valor) => { localStorage.setItem('backupAutomatico', valor) })
  watch(intervaloBackup, (valor) => { localStorage.setItem('intervaloBackup', valor) })
  watch(backupGoogleDrive, (valor) => { localStorage.setItem('backupGoogleDrive', valor) })
  watch(backupAutomaticoGoogleDrive, (valor) => { localStorage.setItem('backupAutomaticoGoogleDrive', valor) })

  const generarNombreArchivo = (tipo = 'completo', extension = 'json') => {
    const fecha = new Date()
    const timestamp = fecha.toISOString().replace(/[:.]/g, '-').slice(0, -5)
    return `backup-autoservice-${tipo}-${timestamp}.${extension}`
  }

  const agregarBOMUTF8 = (contenido) => '\uFEFF' + contenido

  const generarCSVClientes = (clientesData) => {
    let csv = 'ID,Nombre,Email,Teléfono,Dirección,Cantidad Servicios,Total Gastado,Último Servicio,Fecha Registro\n'
    clientesData.forEach(cliente => {
      const ultimoServicio = cliente.ultimoServicio ? new Date(cliente.ultimoServicio.fechaServicio).toLocaleDateString('es-ES') : 'Nunca'
      csv += `${cliente.id},"${cliente.nombre}","${cliente.email}","${cliente.telefono}","${cliente.direccion || ''}",${cliente.cantidadServicios},${cliente.totalGastado},"${ultimoServicio}","${new Date(cliente.fechaCreacion).toLocaleDateString('es-ES')}"\n`
    })
    return agregarBOMUTF8(csv)
  }
  
  const generarCSVVehiculos = () => {
    let csv = 'ID,Cliente,Marca,Modelo,Año,Patente,VIN,Kilometraje,Cantidad Servicios,Último Servicio\n'
    vehiculos.value.forEach(vehiculo => {
      const cliente = clientes.value.find(c => c.id === vehiculo.clienteId)
      const serviciosVehiculo = servicios.value.filter(s => s.vehiculoId === vehiculo.id)
      const ultimoServicio = serviciosVehiculo.length > 0 ? 
        serviciosVehiculo.sort((a, b) => new Date(b.fechaServicio) - new Date(a.fechaServicio))[0] : null
      const fechaUltimoServicio = ultimoServicio ? new Date(ultimoServicio.fechaServicio).toLocaleDateString('es-ES') : 'Nunca'
      csv += `${vehiculo.id},"${cliente?.nombre || ''}","${vehiculo.marca}","${vehiculo.modelo}",${vehiculo.año},"${vehiculo.patente}","${vehiculo.vin || ''}",${vehiculo.kilometraje || 0},${serviciosVehiculo.length},"${fechaUltimoServicio}"\n`
    })
    return agregarBOMUTF8(csv)
  }
  
  const generarCSVServicios = (serviciosData) => {
    let csv = 'ID,Fecha,Cliente,Email,Vehículo,Patente,Tipo Servicio,Estado,Kilometraje,Costo,Próximo Servicio,Descripción,Observaciones\n'
    serviciosData.forEach(servicio => {
      const fechaServicio = new Date(servicio.fechaServicio).toLocaleDateString('es-ES')
      const vehiculoTexto = `${servicio.vehiculo?.marca || ''} ${servicio.vehiculo?.modelo || ''}`
      csv += `${servicio.id},"${fechaServicio}","${servicio.cliente?.nombre || ''}","${servicio.cliente?.email || ''}","${vehiculoTexto}","${servicio.vehiculo?.patente || ''}","${servicio.tipoServicio}","${servicio.estado}",${servicio.kilometraje || 0},${servicio.costo || 0},"${servicio.proximoServicio || ''}","${(servicio.descripcion || '').replace(/"/g, '""')}","${(servicio.observaciones || '').replace(/"/g, '""')}"\n`
    })
    return agregarBOMUTF8(csv)
  }
  
  const generarCSVOrdenes = () => {
    let csv = 'ID,Número Orden,Cliente,Vehículo,Estado,Prioridad,Fecha Creación,Fecha Vencimiento,Costo Estimado,Costo Real,Descripción Trabajo\n'
    ordenes.value.forEach(orden => {
      const cliente = clientes.value.find(c => c.id === orden.clienteId)
      const vehiculo = vehiculos.value.find(v => v.id === orden.vehiculoId)
      const vehiculoTexto = vehiculo ? `${vehiculo.marca} ${vehiculo.modelo}` : ''
      const fechaCreacion = new Date(orden.fechaCreacion).toLocaleDateString('es-ES')
      const fechaVencimiento = orden.fechaVencimiento ? new Date(orden.fechaVencimiento).toLocaleDateString('es-ES') : ''
      csv += `${orden.id},"${orden.numeroOrden}","${cliente?.nombre || ''}","${vehiculoTexto}","${orden.estado}","${orden.prioridad}","${fechaCreacion}","${fechaVencimiento}",${orden.costoEstimado || 0},${orden.costoReal || 0},"${(orden.descripcionTrabajo || '').replace(/"/g, '""')}"\n`
    })
    return agregarBOMUTF8(csv)
  }
  
  const generarCSVIngresos = (datosIngresos) => {
    let csv = 'Tipo de Servicio,Cantidad,Total Ingresos,Promedio por Servicio\n'
    Object.entries(datosIngresos.ingresosPorTipo).forEach(([tipo, datos]) => {
      const promedio = datos.cantidad > 0 ? (datos.total / datos.cantidad).toFixed(2) : 0
      csv += `"${tipo}",${datos.cantidad},${datos.total},${promedio}\n`
    })
    csv += `\n"TOTAL GENERAL",${datosIngresos.cantidadServicios},${datosIngresos.totalIngresos},${(datosIngresos.totalIngresos / datosIngresos.cantidadServicios || 0).toFixed(2)}\n`
    return agregarBOMUTF8(csv)
  }
  
  const generarCSVVehiculosPorMarca = (vehiculosData) => {
    let csv = 'Marca,Modelo,Cantidad,Porcentaje\n'
    const total = vehiculosData.reduce((sum, item) => sum + item.cantidad, 0)
    vehiculosData.forEach(item => {
      const porcentaje = total > 0 ? ((item.cantidad / total) * 100).toFixed(2) : 0
      csv += `"${item.marca}","${item.modelo}",${item.cantidad},${porcentaje}%\n`
    })
    return agregarBOMUTF8(csv)
  }
  
  const generarCSVEstadisticasAnuales = (estadisticasData) => {
    let csv = 'Mes,Cantidad Servicios,Ingresos\n'
    estadisticasData.forEach(mes => {
      csv += `"${mes.mes}",${mes.cantidadServicios},${mes.ingresos}\n`
    })
    return agregarBOMUTF8(csv)
  }
  
  const generarReportesCSV = () => {
    const reportes = []
    try {
      reportes.push({ nombre: 'clientes-reporte.csv', contenido: generarCSVClientes(getClientesFrecuentes(clientes.value.length)), tipo: 'text/csv' })
      reportes.push({ nombre: 'vehiculos-reporte.csv', contenido: generarCSVVehiculos(), tipo: 'text/csv' })
      const fechaHaceUnAno = new Date(); fechaHaceUnAno.setFullYear(fechaHaceUnAno.getFullYear() - 1)
      const serviciosUltimoAno = getServiciosPorPeriodo(fechaHaceUnAno.toISOString().split('T')[0], new Date().toISOString().split('T')[0])
      reportes.push({ nombre: 'servicios-ultimo-ano.csv', contenido: generarCSVServicios(serviciosUltimoAno), tipo: 'text/csv' })
      reportes.push({ nombre: 'ordenes-reporte.csv', contenido: generarCSVOrdenes(), tipo: 'text/csv' })
      const ingresosAno = getIngresosPorPeriodo(fechaHaceUnAno.toISOString().split('T')[0], new Date().toISOString().split('T')[0])
      reportes.push({ nombre: 'ingresos-ultimo-ano.csv', contenido: generarCSVIngresos(ingresosAno), tipo: 'text/csv' })
      reportes.push({ nombre: 'vehiculos-por-marca.csv', contenido: generarCSVVehiculosPorMarca(getVehiculosPorMarca()), tipo: 'text/csv' })
      reportes.push({ nombre: 'estadisticas-anuales.csv', contenido: generarCSVEstadisticasAnuales(getEstadisticasAnuales()), tipo: 'text/csv' })
      
      const datosProximosServicios = obtenerDatosProximosServicios()
      const csvProximosServicios = convertirProximosServiciosACSV(datosProximosServicios)
      if (csvProximosServicios) {
          reportes.push({ nombre: 'proximos-servicios-y-vencidos.csv', contenido: csvProximosServicios, tipo: 'text/csv' })
      }
      console.log(`✅ Se generaron ${reportes.length} reportes CSV para backup`)
      return reportes
    } catch (err) {
      console.error('❌ Error al generar reportes CSV:', err)
      return []
    }
  }
  
  const crearBackup = async (subirAGoogleDrive = false) => {
    try {
      const datos = {
        version: '1.0', fecha: new Date().toISOString(),
        datos: { clientes: clientes.value, vehiculos: vehiculos.value, servicios: servicios.value, ordenes: ordenes.value },
        estadisticas: { totalClientes: clientes.value.length, totalVehiculos: vehiculos.value.length, totalServicios: servicios.value.length, totalOrdenes: ordenes.value.length }
      }
      const nombreArchivo = generarNombreArchivo()
      const blob = new Blob([JSON.stringify(datos, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = nombreArchivo;
      document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
      
      ultimoBackup.value = new Date().toISOString(); localStorage.setItem('ultimoBackup', ultimoBackup.value)
      let mensaje = 'Backup local creado exitosamente'
      
      if ((subirAGoogleDrive || backupGoogleDrive.value) && estaAutenticado()) {
        const resultado = await subirBackupCompletoAGoogleDrive(datos, nombreArchivo)
        if (resultado.success) {
          ultimoBackupGoogleDrive.value = new Date().toISOString(); localStorage.setItem('ultimoBackupGoogleDrive', ultimoBackupGoogleDrive.value)
          mensaje = 'Backup JSON subido a Google Drive'
          const reportesCSV = generarReportesCSV()
          if (reportesCSV.length > 0) {
            let csvSubidosExitosamente = 0
            for (const reporte of reportesCSV) {
              const timestampReporte = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5)
              const nombreReporte = `${timestampReporte}-${reporte.nombre}`
              const blobCSV = new Blob([reporte.contenido], { type: reporte.tipo })
              const resultadoCSV = await subirArchivoAGoogleDrive(blobCSV, nombreReporte, { carpeta: 'AutoService - Reportes CSV' })
              if (resultadoCSV.success) csvSubidosExitosamente++
            }
            if (csvSubidosExitosamente > 0) mensaje = `Backup completo subido: JSON + ${csvSubidosExitosamente} reportes CSV`
          }
        }
      }
      success(mensaje)
      return true
    } catch (err) {
      error('Error al crear el backup')
      return false
    }
  }

  const restaurarBackup = (archivo) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = (e) => {
            try {
                const datos = JSON.parse(e.target.result)
                if (!datos.version || !datos.datos) throw new Error('Formato de backup inválido')
                if (confirm(`¿Restaurar backup del ${new Date(datos.fecha).toLocaleString()}?`)) {
                    localStorage.setItem('autoservice_clientes', JSON.stringify(datos.datos.clientes || []))
                    localStorage.setItem('autoservice_vehiculos', JSON.stringify(datos.datos.vehiculos || []))
                    localStorage.setItem('autoservice_servicios', JSON.stringify(datos.datos.servicios || []))
                    localStorage.setItem('autoservice_ordenes', JSON.stringify(datos.datos.ordenes || []))
                    success('Backup restaurado. La página se recargará...')
                    setTimeout(() => { window.location.reload() }, 2000)
                    resolve(true)
                } else {
                    info('Restauración cancelada'); resolve(false)
                }
            } catch (err) {
                error('Error al restaurar el backup: ' + err.message); reject(err)
            }
        }
        reader.onerror = () => { error('Error al leer el archivo'); reject(new Error('Error al leer el archivo')) }
        reader.readAsText(archivo)
    })
  }
  
  const exportarCSV = (tipo) => {
      // (Esta función no cambia)
  }

  const iniciarBackupAutomatico = () => {
      // (Esta función no cambia)
  }

  const cargarBackupsDeGoogleDrive = async () => {
    if (!estaAutenticado()) {
      backupsEnLaNube.value = []; return []
    }
    try {
      const backups = await listarBackupsEnGoogleDrive();
      backupsEnLaNube.value = backups;
      return backups;
    } catch (err) {
      backupsEnLaNube.value = []; return []
    }
  }

  const restaurarBackupDeGoogleDrive = async (backup) => {
      // (Esta función no cambia)
  }

  const eliminarBackupDeGoogleDriveLocal = async (backup) => {
      // (Esta función no cambia)
  }

  const exportarTodosLosReportesCSV = async () => {
      // (Esta función no cambia)
  }

  const descargarTodosLosReportesCSV = () => {
      // (Esta función no cambia)
  }

  // ✅ ¡ASEGÚRATE DE QUE ESTE BLOQUE EXISTA AL FINAL!
  return {
    ultimoBackup,
    backupAutomatico,
    intervaloBackup,
    backupGoogleDrive,
    backupAutomaticoGoogleDrive,
    ultimoBackupGoogleDrive,
    backupsEnLaNube,
    crearBackup,
    restaurarBackup,
    exportarCSV,
    iniciarBackupAutomatico,
    cargarBackupsDeGoogleDrive,
    restaurarBackupDeGoogleDrive,
    eliminarBackupDeGoogleDrive: eliminarBackupDeGoogleDriveLocal,
    exportarTodosLosReportesCSV,
    descargarTodosLosReportesCSV
  }
}