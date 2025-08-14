import { ref, watch } from 'vue'
import { useAutoService } from './useAutoService'
import { useNotifications } from './useNotifications'
import { useGoogleDrive } from './useGoogleDrive'
import { useReports } from './useReports'

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
  
  // Estado del backup
  const ultimoBackup = ref(localStorage.getItem('ultimoBackup') || null)
  const backupAutomatico = ref(localStorage.getItem('backupAutomatico') === 'true')
  const intervaloBackup = ref(parseInt(localStorage.getItem('intervaloBackup') || '24')) // horas
  
  // 🆕 NUEVAS CONFIGURACIONES
  const backupGoogleDrive = ref(localStorage.getItem('backupGoogleDrive') === 'true')
  const backupAutomaticoGoogleDrive = ref(localStorage.getItem('backupAutomaticoGoogleDrive') === 'true')
  const ultimoBackupGoogleDrive = ref(localStorage.getItem('ultimoBackupGoogleDrive') || null)
  const backupsEnLaNube = ref([])
  
  // Guardar configuración
  watch(backupAutomatico, (valor) => {
    localStorage.setItem('backupAutomatico', valor)
  })
  
  watch(intervaloBackup, (valor) => {
    localStorage.setItem('intervaloBackup', valor)
  })
  
  // 🆕 WATCHERS PARA NUEVAS CONFIGURACIONES
  watch(backupGoogleDrive, (valor) => {
    localStorage.setItem('backupGoogleDrive', valor)
  })
  
  watch(backupAutomaticoGoogleDrive, (valor) => {
    localStorage.setItem('backupAutomaticoGoogleDrive', valor)
  })
  
  // Generar nombre de archivo con timestamp
  const generarNombreArchivo = (tipo = 'completo', extension = 'json') => {
    const fecha = new Date()
    const timestamp = fecha.toISOString().replace(/[:.]/g, '-').slice(0, -5)
    return `backup-autoservice-${tipo}-${timestamp}.${extension}`
  }

  // 🆕 GENERAR REPORTES CSV PARA BACKUP
  const generarReportesCSV = () => {
    const reportes = []
    
    try {
      // 1. Reporte de Clientes con estadísticas
      const clientesFrecuentes = getClientesFrecuentes(clientes.value.length)
      const csvClientes = generarCSVClientes(clientesFrecuentes)
      reportes.push({
        nombre: 'clientes-reporte.csv',
        contenido: csvClientes,
        tipo: 'text/csv'
      })
      
      // 2. Reporte de Vehículos
      const csvVehiculos = generarCSVVehiculos()
      reportes.push({
        nombre: 'vehiculos-reporte.csv',
        contenido: csvVehiculos,
        tipo: 'text/csv'
      })
      
      // 3. Reporte de Servicios (último año)
      const fechaHaceUnAno = new Date()
      fechaHaceUnAno.setFullYear(fechaHaceUnAno.getFullYear() - 1)
      const serviciosUltimoAno = getServiciosPorPeriodo(fechaHaceUnAno.toISOString().split('T')[0], new Date().toISOString().split('T')[0])
      const csvServicios = generarCSVServicios(serviciosUltimoAno)
      reportes.push({
        nombre: 'servicios-ultimo-ano.csv',
        contenido: csvServicios,
        tipo: 'text/csv'
      })
      
      // 4. Reporte de Órdenes
      const csvOrdenes = generarCSVOrdenes()
      reportes.push({
        nombre: 'ordenes-reporte.csv',
        contenido: csvOrdenes,
        tipo: 'text/csv'
      })
      
      // 5. Reporte de Ingresos (último año)
      const ingresosAno = getIngresosPorPeriodo(fechaHaceUnAno.toISOString().split('T')[0], new Date().toISOString().split('T')[0])
      const csvIngresos = generarCSVIngresos(ingresosAno)
      reportes.push({
        nombre: 'ingresos-ultimo-ano.csv',
        contenido: csvIngresos,
        tipo: 'text/csv'
      })
      
      // 6. Reporte de Vehículos por Marca/Modelo
      const vehiculosPorMarca = getVehiculosPorMarca()
      const csvMarcas = generarCSVVehiculosPorMarca(vehiculosPorMarca)
      reportes.push({
        nombre: 'vehiculos-por-marca.csv',
        contenido: csvMarcas,
        tipo: 'text/csv'
      })
      
      // 7. Estadísticas anuales
      const estadisticasAnuales = getEstadisticasAnuales()
      const csvEstadisticas = generarCSVEstadisticasAnuales(estadisticasAnuales)
      reportes.push({
        nombre: 'estadisticas-anuales.csv',
        contenido: csvEstadisticas,
        tipo: 'text/csv'
      })
      
      console.log(`✅ Se generaron ${reportes.length} reportes CSV para backup`)
      return reportes
      
    } catch (err) {
      console.error('❌ Error al generar reportes CSV:', err)
      return []
    }
  }
  
  // 🆕 FUNCIONES AUXILIARES PARA GENERAR CSV
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
    
    // Agregar totales
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
  
  // 🆕 CREAR BACKUP COMPLETO (MEJORADO CON GOOGLE DRIVE)
  const crearBackup = async (subirAGoogleDrive = false) => {
    try {
      const datos = {
        version: '1.0',
        fecha: new Date().toISOString(),
        datos: {
          clientes: clientes.value,
          vehiculos: vehiculos.value,
          servicios: servicios.value,
          ordenes: ordenes.value
        },
        estadisticas: {
          totalClientes: clientes.value.length,
          totalVehiculos: vehiculos.value.length,
          totalServicios: servicios.value.length,
          totalOrdenes: ordenes.value.length
        }
      }
      
      const nombreArchivo = generarNombreArchivo()
      
      // Crear archivo local
      const blob = new Blob([JSON.stringify(datos, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = nombreArchivo
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      
      // Actualizar último backup local
      ultimoBackup.value = new Date().toISOString()
      localStorage.setItem('ultimoBackup', ultimoBackup.value)
      
      let mensaje = 'Backup local creado exitosamente'
      
      // 🆕 SUBIR A GOOGLE DRIVE SI ESTÁ HABILITADO (CON REPORTES CSV)
      if ((subirAGoogleDrive || backupGoogleDrive.value) && estaAutenticado()) {
        try {
          console.log('📊 Iniciando backup completo con reportes CSV...')
          
          // 1. Subir el backup principal JSON
          const resultado = await subirBackupCompletoAGoogleDrive(datos, nombreArchivo)
          if (resultado.success) {
            ultimoBackupGoogleDrive.value = new Date().toISOString()
            localStorage.setItem('ultimoBackupGoogleDrive', ultimoBackupGoogleDrive.value)
            mensaje = 'Backup JSON subido a Google Drive'
            
            // 2. Generar y subir reportes CSV
            console.log('📊 Generando reportes CSV para backup...')
            const reportesCSV = generarReportesCSV()
            
            if (reportesCSV.length > 0) {
              console.log(`📊 Subiendo ${reportesCSV.length} reportes CSV a Google Drive...`)
              let csvSubidosExitosamente = 0
              
              // Subir cada reporte CSV individualmente
              for (const reporte of reportesCSV) {
                try {
                  const timestampReporte = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5)
                  const nombreReporte = `${timestampReporte}-${reporte.nombre}`
                  
                  // Convertir contenido a Blob
                  const blobCSV = new Blob([reporte.contenido], { type: reporte.tipo })
                  
                  const resultadoCSV = await subirArchivoAGoogleDrive(
                    blobCSV, 
                    nombreReporte, 
                    { carpeta: 'AutoService - Reportes CSV' }
                  )
                  
                  if (resultadoCSV.success) {
                    csvSubidosExitosamente++
                    console.log(`✅ CSV subido: ${nombreReporte}`)
                  } else {
                    console.warn(`⚠️ Error subiendo CSV: ${nombreReporte}`, resultadoCSV.error)
                  }
                  
                } catch (csvError) {
                  console.error(`❌ Error subiendo reporte ${reporte.nombre}:`, csvError)
                }
              }
              
              // Actualizar mensaje con resultados
              if (csvSubidosExitosamente === reportesCSV.length) {
                mensaje = `Backup completo subido: JSON + ${csvSubidosExitosamente} reportes CSV`
                console.log(`✅ Backup completo: JSON + ${csvSubidosExitosamente}/${reportesCSV.length} reportes CSV`)
              } else if (csvSubidosExitosamente > 0) {
                mensaje = `Backup parcial: JSON + ${csvSubidosExitosamente}/${reportesCSV.length} reportes CSV`
                console.log(`⚠️ Backup parcial: JSON + ${csvSubidosExitosamente}/${reportesCSV.length} reportes CSV`)
              } else {
                mensaje = 'Backup JSON subido (Error en reportes CSV)'
                console.log('⚠️ Solo se subió el JSON, falló la subida de reportes CSV')
              }
            } else {
              mensaje = 'Backup JSON subido (Sin reportes CSV generados)'
              console.log('⚠️ Solo se subió el JSON, no se generaron reportes CSV')
            }
          }
        } catch (err) {
          console.warn('Error al subir a Google Drive:', err)
          mensaje += ' (Error al subir a Google Drive)'
        }
      } else if (subirAGoogleDrive && !estaAutenticado()) {
        mensaje += ' (No autenticado en Google Drive)'
      }
      
      success(mensaje)
      return true
    } catch (err) {
      console.error('Error al crear backup:', err)
      error('Error al crear el backup')
      return false
    }
  }
  
  // Restaurar desde archivo
  const restaurarBackup = (archivo) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      
      reader.onload = async (e) => {
        try {
          const datos = JSON.parse(e.target.result)
          
          // Validar estructura del backup
          if (!datos.version || !datos.datos) {
            throw new Error('Formato de backup inválido')
          }
          
          // Confirmar antes de restaurar
          const confirmacion = confirm(
            `¿Estás seguro de restaurar el backup del ${new Date(datos.fecha).toLocaleString()}?\n\n` +
            `Esto reemplazará:\n` +
            `- ${datos.estadisticas.totalClientes} clientes\n` +
            `- ${datos.estadisticas.totalVehiculos} vehículos\n` +
            `- ${datos.estadisticas.totalServicios} servicios\n` +
            `- ${datos.estadisticas.totalOrdenes} órdenes\n\n` +
            `Los datos actuales se perderán.`
          )
          
          if (!confirmacion) {
            info('Restauración cancelada')
            resolve(false)
            return
          }
          
          // Crear backup de seguridad antes de restaurar
          const backupSeguridad = {
            clientes: [...clientes.value],
            vehiculos: [...vehiculos.value],
            servicios: [...servicios.value],
            ordenes: [...ordenes.value]
          }
          
          try {
            // Restaurar datos
            localStorage.setItem('autoservice_clientes', JSON.stringify(datos.datos.clientes || []))
            localStorage.setItem('autoservice_vehiculos', JSON.stringify(datos.datos.vehiculos || []))
            localStorage.setItem('autoservice_servicios', JSON.stringify(datos.datos.servicios || []))
            localStorage.setItem('autoservice_ordenes', JSON.stringify(datos.datos.ordenes || []))
            
            // Recargar página para aplicar cambios
            success('Backup restaurado exitosamente. La página se recargará...')
            setTimeout(() => {
              window.location.reload()
            }, 2000)
            
            resolve(true)
          } catch (err) {
            // Revertir cambios en caso de error
            localStorage.setItem('autoservice_clientes', JSON.stringify(backupSeguridad.clientes))
            localStorage.setItem('autoservice_vehiculos', JSON.stringify(backupSeguridad.vehiculos))
            localStorage.setItem('autoservice_servicios', JSON.stringify(backupSeguridad.servicios))
            localStorage.setItem('autoservice_ordenes', JSON.stringify(backupSeguridad.ordenes))
            
            throw err
          }
        } catch (err) {
          console.error('Error al restaurar backup:', err)
          error('Error al restaurar el backup: ' + err.message)
          reject(err)
        }
      }
      
      reader.onerror = () => {
        error('Error al leer el archivo')
        reject(new Error('Error al leer el archivo'))
      }
      
      reader.readAsText(archivo)
    })
  }
  
  // Exportar datos específicos (CSV)
  const exportarCSV = (tipo) => {
    try {
      let csvContent = ''
      let nombreArchivo = ''
      
      switch (tipo) {
        case 'clientes':
          csvContent = 'ID,Nombre,Email,Teléfono,Dirección,Fecha Creación\n'
          clientes.value.forEach(cliente => {
            csvContent += `${cliente.id},"${cliente.nombre}","${cliente.email}","${cliente.telefono}","${cliente.direccion || ''}","${cliente.fechaCreacion}"\n`
          })
          nombreArchivo = 'clientes-autoservice.csv'
          break
          
        case 'vehiculos':
          csvContent = 'ID,Cliente,Marca,Modelo,Año,Patente,VIN,Kilometraje\n'
          vehiculos.value.forEach(vehiculo => {
            const cliente = clientes.value.find(c => c.id === vehiculo.clienteId)
            csvContent += `${vehiculo.id},"${cliente?.nombre || ''}","${vehiculo.marca}","${vehiculo.modelo}",${vehiculo.año},"${vehiculo.patente}","${vehiculo.vin || ''}",${vehiculo.kilometraje || 0}\n`
          })
          nombreArchivo = 'vehiculos-autoservice.csv'
          break
          
        case 'servicios':
csvContent = 'ID,Fecha,Vehículo,Cliente,Email,Tipo Servicio,Kilometraje,Costo,Próximo Servicio\n'
          servicios.value.forEach(servicio => {
            const vehiculo = vehiculos.value.find(v => v.id === servicio.vehiculoId)
            const cliente = clientes.value.find(c => c.id === servicio.clienteId)
            csvContent += `${servicio.id},"${servicio.fechaServicio}","${vehiculo?.marca} ${vehiculo?.modelo}","${cliente?.nombre || ''}","${servicio.cliente?.email || ''}","${servicio.tipoServicio}",${servicio.kilometraje || 0},${servicio.costo || 0},"${servicio.proximoServicio || ''}"\n`
          })
          nombreArchivo = 'servicios-autoservice.csv'
          break
          
        case 'ordenes':
          csvContent = 'ID,Número Orden,Cliente,Vehículo,Estado,Prioridad,Fecha Creación,Costo Estimado,Descripción\n'
          ordenes.value.forEach(orden => {
            const vehiculo = vehiculos.value.find(v => v.id === orden.vehiculoId)
            const cliente = clientes.value.find(c => c.id === orden.clienteId)
            csvContent += `${orden.id},"${orden.numeroOrden}","${cliente?.nombre || ''}","${vehiculo?.marca} ${vehiculo?.modelo}","${orden.estado}","${orden.prioridad}","${orden.fechaCreacion}",${orden.costoEstimado || 0},"${orden.descripcionTrabajo?.replace(/"/g, '""') || ''}"\n`
          })
          nombreArchivo = 'ordenes-autoservice.csv'
          break
      }
      
      // Agregar BOM para UTF-8
      const BOM = '\uFEFF'
      const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = nombreArchivo
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      
      success(`Exportación de ${tipo} completada`)
    } catch (err) {
      console.error('Error al exportar CSV:', err)
      error('Error al exportar los datos')
    }
  }
  
  // Verificar si es necesario hacer backup automático
  const verificarBackupAutomatico = () => {
    if (!backupAutomatico.value) return false
    
    if (!ultimoBackup.value) return true
    
    const horasDesdeUltimoBackup = (new Date() - new Date(ultimoBackup.value)) / (1000 * 60 * 60)
    return horasDesdeUltimoBackup >= intervaloBackup.value
  }
  
  // 🆕 VERIFICAR SI ES NECESARIO HACER BACKUP AUTOMÁTICO EN GOOGLE DRIVE
  const verificarBackupAutomaticoGoogleDrive = () => {
    if (!backupAutomaticoGoogleDrive.value || !estaAutenticado()) return false
    
    if (!ultimoBackupGoogleDrive.value) return true
    
    const horasDesdeUltimoBackup = (new Date() - new Date(ultimoBackupGoogleDrive.value)) / (1000 * 60 * 60)
    return horasDesdeUltimoBackup >= intervaloBackup.value
  }
  
  // 🆕 CARGAR LISTA DE BACKUPS DESDE GOOGLE DRIVE
  const cargarBackupsDeGoogleDrive = async () => {
    console.log('🔄 [useBackupSystem] Iniciando cargarBackupsDeGoogleDrive...')
    
    if (!estaAutenticado()) {
      console.log('❌ [useBackupSystem] Usuario no autenticado')
      backupsEnLaNube.value = []
      return []
    }
    
    try {
      console.log('🔍 [useBackupSystem] Llamando a listarBackupsEnGoogleDrive...')
      const backups = await listarBackupsEnGoogleDrive()
      console.log('📊 [useBackupSystem] Backups recibidos:', backups)
      
      backupsEnLaNube.value = backups
      console.log('✅ [useBackupSystem] backupsEnLaNube actualizado:', backupsEnLaNube.value)
      
      return backups
    } catch (err) {
      console.error('❌ [useBackupSystem] Error al cargar backups de Google Drive:', err)
      backupsEnLaNube.value = []
      return []
    }
  }
  
  // 🆕 RESTAURAR BACKUP DESDE GOOGLE DRIVE
  const restaurarBackupDeGoogleDrive = async (backup) => {
    try {
      const confirmacion = confirm(
        `¿Estás seguro de restaurar el backup "${backup.nombre}" desde Google Drive?\n\n` +
        `Fecha: ${backup.fecha}\n\n` +
        `Esto reemplazará todos los datos actuales.`
      )
      
      if (!confirmacion) {
        info('Restauración cancelada')
        return false
      }
      
      // Descargar contenido del backup
      const resultado = await descargarBackupDeGoogleDrive(backup.id, backup.nombre)
      if (!resultado.success) {
        error('Error al descargar el backup de Google Drive')
        return false
      }
      
      // Parsear y validar el contenido
      const datos = JSON.parse(resultado.contenido)
      
      if (!datos.version || !datos.datos) {
        throw new Error('Formato de backup inválido')
      }
      
      // Restaurar datos
      localStorage.setItem('autoservice_clientes', JSON.stringify(datos.datos.clientes || []))
      localStorage.setItem('autoservice_vehiculos', JSON.stringify(datos.datos.vehiculos || []))
      localStorage.setItem('autoservice_servicios', JSON.stringify(datos.datos.servicios || []))
      localStorage.setItem('autoservice_ordenes', JSON.stringify(datos.datos.ordenes || []))
      
      success('Backup restaurado desde Google Drive. La página se recargará...')
      setTimeout(() => {
        window.location.reload()
      }, 2000)
      
      return true
    } catch (err) {
      console.error('Error al restaurar backup de Google Drive:', err)
      error('Error al restaurar el backup: ' + err.message)
      return false
    }
  }
  
  // 🆕 ELIMINAR BACKUP DE GOOGLE DRIVE
  const eliminarBackupDeGoogleDriveLocal = async (backup) => {
    try {
      const confirmacion = confirm(
        `¿Estás seguro de eliminar el backup "${backup.nombre}" de Google Drive?\n\n` +
        `Esta acción no se puede deshacer.`
      )
      
      if (!confirmacion) return false
      
      const resultado = await eliminarBackupDeGoogleDrive(backup.id, backup.nombre)
      if (resultado.success) {
        // Actualizar lista local
        await cargarBackupsDeGoogleDrive()
        return true
      }
      return false
    } catch (err) {
      console.error('Error al eliminar backup:', err)
      return false
    }
  }
  
  // Iniciar verificación periódica (cada hora)
  const iniciarBackupAutomatico = () => {
    // Verificar al iniciar
    if (verificarBackupAutomatico()) {
      info('Creando backup automático...')
      crearBackup()
    }
    
    // 🆕 VERIFICAR BACKUP AUTOMÁTICO EN GOOGLE DRIVE
    if (verificarBackupAutomaticoGoogleDrive()) {
      info('Creando backup automático en Google Drive...')
      crearBackup(true) // true = subir a Google Drive
    }
    
    // Verificar cada hora
    setInterval(() => {
      if (verificarBackupAutomatico()) {
        info('Creando backup automático...')
        crearBackup()
      }
      
      // 🆕 VERIFICAR BACKUP AUTOMÁTICO EN GOOGLE DRIVE
      if (verificarBackupAutomaticoGoogleDrive()) {
        info('Creando backup automático en Google Drive...')
        crearBackup(true) // true = subir a Google Drive
      }
    }, 60 * 60 * 1000) // 1 hora
  }
  
  // 🆕 EXPORTAR TODOS LOS REPORTES CSV A GOOGLE DRIVE
  const exportarTodosLosReportesCSV = async () => {
    try {
      if (!estaAutenticado()) {
        error('Debes conectar Google Drive primero')
        return { success: false, error: 'No autenticado' }
      }
      
      console.log('📊 Iniciando exportación de todos los reportes CSV...')
      info('Generando y subiendo reportes CSV a Google Drive...')
      
      // Generar reportes
      const reportesCSV = generarReportesCSV()
      
      if (reportesCSV.length === 0) {
        error('No se pudieron generar los reportes CSV')
        return { success: false, error: 'No se generaron reportes' }
      }
      
      let csvSubidosExitosamente = 0
      const errores = []
      
      // Subir cada reporte
      for (const reporte of reportesCSV) {
        try {
          const timestampReporte = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5)
          const nombreReporte = `${timestampReporte}-${reporte.nombre}`
          
          const blobCSV = new Blob([reporte.contenido], { type: reporte.tipo })
          
          const resultado = await subirArchivoAGoogleDrive(
            blobCSV, 
            nombreReporte, 
            { carpeta: 'AutoService - Reportes CSV' }
          )
          
          if (resultado.success) {
            csvSubidosExitosamente++
            console.log(`✅ Reporte CSV subido: ${nombreReporte}`)
          } else {
            errores.push(`${reporte.nombre}: ${resultado.error}`)
            console.warn(`⚠️ Error subiendo ${reporte.nombre}:`, resultado.error)
          }
          
        } catch (csvError) {
          errores.push(`${reporte.nombre}: ${csvError.message}`)
          console.error(`❌ Error subiendo reporte ${reporte.nombre}:`, csvError)
        }
      }
      
      // Informar resultados
      if (csvSubidosExitosamente === reportesCSV.length) {
        success(`✅ Todos los reportes CSV subidos exitosamente (${csvSubidosExitosamente}/${reportesCSV.length})`)
        return { success: true, subidos: csvSubidosExitosamente, total: reportesCSV.length }
      } else if (csvSubidosExitosamente > 0) {
        error(`⚠️ Subida parcial: ${csvSubidosExitosamente}/${reportesCSV.length} reportes CSV subidos`)
        return { success: false, subidos: csvSubidosExitosamente, total: reportesCSV.length, errores }
      } else {
        error('❌ No se pudo subir ningún reporte CSV')
        return { success: false, subidos: 0, total: reportesCSV.length, errores }
      }
      
    } catch (err) {
      console.error('❌ Error general al exportar reportes CSV:', err)
      error(`Error al exportar reportes: ${err.message}`)
      return { success: false, error: err.message }
    }
  }
  
  // 🆕 DESCARGAR TODOS LOS REPORTES CSV LOCALMENTE
  const descargarTodosLosReportesCSV = () => {
    try {
      console.log('📊 Generando reportes CSV para descarga local...')
      info('Generando reportes CSV...')
      
      const reportesCSV = generarReportesCSV()
      
      if (reportesCSV.length === 0) {
        error('No se pudieron generar los reportes CSV')
        return false
      }
      
      // Descargar cada reporte individualmente
      reportesCSV.forEach((reporte, index) => {
        setTimeout(() => {
          const blob = new Blob([reporte.contenido], { type: reporte.tipo })
          const url = URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url
          a.download = reporte.nombre
          document.body.appendChild(a)
          a.click()
          document.body.removeChild(a)
          URL.revokeObjectURL(url)
          
          console.log(`✅ Reporte descargado: ${reporte.nombre}`)
        }, index * 100) // Pequeño delay entre descargas
      })
      
      success(`✅ ${reportesCSV.length} reportes CSV descargados exitosamente`)
      return true
      
    } catch (err) {
      console.error('❌ Error al descargar reportes CSV:', err)
      error(`Error al descargar reportes: ${err.message}`)
      return false
    }
  }
  
  return {
    // Estado existente
    ultimoBackup,
    backupAutomatico,
    intervaloBackup,
    
    // 🆕 NUEVO ESTADO GOOGLE DRIVE
    backupGoogleDrive,
    backupAutomaticoGoogleDrive,
    ultimoBackupGoogleDrive,
    backupsEnLaNube,
    
    // Funciones existentes
    crearBackup,
    restaurarBackup,
    exportarCSV,
    iniciarBackupAutomatico,
    verificarBackupAutomatico,
    
    // 🆕 NUEVAS FUNCIONES GOOGLE DRIVE
    verificarBackupAutomaticoGoogleDrive,
    cargarBackupsDeGoogleDrive,
    restaurarBackupDeGoogleDrive,
    eliminarBackupDeGoogleDrive: eliminarBackupDeGoogleDriveLocal,
      
    // 🆕 NUEVAS FUNCIONES DE REPORTES CSV
    generarReportesCSV,
    exportarTodosLosReportesCSV,
    descargarTodosLosReportesCSV
  }
}
