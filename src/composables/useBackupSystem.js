import { ref, watch } from 'vue'
import { useAutoService } from './useAutoService'
import { useNotifications } from './useNotifications'
import { useGoogleDrive } from './useGoogleDrive'
import { useReports } from './useReports'
import { useProximosServicios } from './useProximosServicios'
import { crearSnapshotRecuperacion, useDataRecovery, validarDatosAutoservice } from './useDataRecovery'

const leerPreferenciaLocal = (clave, valorPorDefecto = null) => {
  try {
    return localStorage.getItem(clave) ?? valorPorDefecto
  } catch {
    return valorPorDefecto
  }
}

const guardarPreferenciaLocal = (clave, valor) => {
  try {
    localStorage.setItem(clave, valor)
  } catch {
    // La protección de datos informará el problema principal en la interfaz.
  }
}

// Estado compartido entre main.js y la vista de Configuración.
// Si estos refs viven dentro del composable, cada llamada crea una copia y los
// cambios de configuración no llegan al programador iniciado por main.js.
const ultimoBackup = ref(leerPreferenciaLocal('ultimoBackup'))
const backupAutomatico = ref(leerPreferenciaLocal('backupAutomatico', 'true') !== 'false')
const intervaloBackup = ref(parseInt(leerPreferenciaLocal('intervaloBackup', '24')))
const backupAutomaticoGoogleDrive = ref(leerPreferenciaLocal('backupAutomaticoGoogleDrive', 'true') !== 'false')
const ultimoBackupGoogleDrive = ref(leerPreferenciaLocal('ultimoBackupGoogleDrive'))
const backupGoogleDrive = ref(
  leerPreferenciaLocal('backupGoogleDrive', 'false') === 'true' || Boolean(ultimoBackupGoogleDrive.value)
)
const copiaNubePendiente = ref(false)
const backupsEnLaNube = ref([])

let backupIntervalId = null
let backupEnCurso = null
let detenerObservadorBackup = null

watch(backupAutomatico, (valor) => { guardarPreferenciaLocal('backupAutomatico', valor) })
watch(intervaloBackup, (valor) => { guardarPreferenciaLocal('intervaloBackup', valor) })
watch(backupGoogleDrive, (valor) => { guardarPreferenciaLocal('backupGoogleDrive', valor) })
watch(backupAutomaticoGoogleDrive, (valor) => { guardarPreferenciaLocal('backupAutomaticoGoogleDrive', valor) })

export const useBackupSystem = () => {
  const { success, error, info, warning } = useNotifications()
  const { clientes, vehiculos, servicios, ordenes, inicializacionDatos } = useAutoService()
  const { ultimoSnapshotLocal } = useDataRecovery()
  const { 
    isAuthenticated,
    estaAutenticado,
    initializeGoogleDrive,
    asegurarTokenValido,
    subirBackupCompletoAGoogleDrive,
    subirArchivoAGoogleDrive, 
    listarBackupsEnGoogleDrive,
    descargarBackupDeGoogleDrive,
    eliminarBackupDeGoogleDrive
  } = useGoogleDrive()
  const { 
    getServiciosPorPeriodo,
    getIngresosPorPeriodo,
    getVehiculosPorMarca,
    getEstadisticasAnuales
  } = useReports()
  const { 
    obtenerDatosProximosServicios, 
    convertirACSV: convertirProximosServiciosACSV 
  } = useProximosServicios()
  
  const generarNombreArchivo = (tipo = 'completo', extension = 'json') => {
    const fecha = new Date()
    const timestamp = fecha.toISOString().replace(/[:.]/g, '-').slice(0, -5)
    return `backup-autoservice-${tipo}-${timestamp}.${extension}`
  }

  const agregarBOMUTF8 = (contenido) => '\uFEFF' + contenido

  const escaparCSV = (valor) => {
    if (valor === null || valor === undefined) return '""'

    let texto = String(valor)
    // Evita que Excel/Sheets interpreten datos ingresados por usuarios como fórmulas.
    if (/^[=+\-@]/.test(texto)) texto = `'${texto}`
    return `"${texto.replace(/"/g, '""')}"`
  }

  const crearCSV = (encabezados, filas) => {
    const contenido = [
      encabezados.map(escaparCSV).join(','),
      ...filas.map(fila => fila.map(escaparCSV).join(','))
    ].join('\n')
    return agregarBOMUTF8(contenido)
  }

  const formatearFechaCSV = (fecha) => {
    if (!fecha) return ''
    const valor = /^\d{4}-\d{2}-\d{2}$/.test(fecha) ? `${fecha}T00:00:00` : fecha
    const fechaNormalizada = new Date(valor)
    return Number.isNaN(fechaNormalizada.getTime()) ? '' : fechaNormalizada.toLocaleDateString('es-ES')
  }

  const descargarBlob = (blob, nombreArchivo) => {
    const url = URL.createObjectURL(blob)
    const enlace = document.createElement('a')
    enlace.href = url
    enlace.download = nombreArchivo
    document.body.appendChild(enlace)
    enlace.click()
    document.body.removeChild(enlace)
    URL.revokeObjectURL(url)
  }

  const normalizarBackup = (backup) => {
    if (!backup || typeof backup !== 'object' || !backup.version || !backup.datos) {
      throw new Error('Formato de backup inválido')
    }

    const colecciones = ['clientes', 'vehiculos', 'servicios']
    for (const coleccion of colecciones) {
      if (!Array.isArray(backup.datos[coleccion])) {
        throw new Error(`El backup no contiene una colección válida de ${coleccion}`)
      }
    }

    if (backup.datos.ordenes !== undefined && !Array.isArray(backup.datos.ordenes)) {
      throw new Error('El backup no contiene una colección válida de órdenes')
    }

    const datosNormalizados = {
      clientes: backup.datos.clientes,
      vehiculos: backup.datos.vehiculos,
      servicios: backup.datos.servicios,
      ordenes: backup.datos.ordenes || []
    }

    if (!validarDatosAutoservice(datosNormalizados)) {
      throw new Error('El backup contiene datos duplicados, incompletos o relaciones inválidas')
    }

    return datosNormalizados
  }

  const aplicarDatosRestaurados = (datos) => {
    const respaldoActual = {
      clientes: [...clientes.value],
      vehiculos: [...vehiculos.value],
      servicios: [...servicios.value],
      ordenes: [...ordenes.value]
    }

    try {
      localStorage.setItem('autoservice_clientes', JSON.stringify(datos.clientes))
      localStorage.setItem('autoservice_vehiculos', JSON.stringify(datos.vehiculos))
      localStorage.setItem('autoservice_servicios', JSON.stringify(datos.servicios))
      localStorage.setItem('autoservice_ordenes', JSON.stringify(datos.ordenes))

      clientes.value = datos.clientes
      vehiculos.value = datos.vehiculos
      servicios.value = datos.servicios
      ordenes.value = datos.ordenes
    } catch (err) {
      localStorage.setItem('autoservice_clientes', JSON.stringify(respaldoActual.clientes))
      localStorage.setItem('autoservice_vehiculos', JSON.stringify(respaldoActual.vehiculos))
      localStorage.setItem('autoservice_servicios', JSON.stringify(respaldoActual.servicios))
      localStorage.setItem('autoservice_ordenes', JSON.stringify(respaldoActual.ordenes))
      throw err
    }
  }

  const generarCSVClientes = (clientesData) => {
    return crearCSV(
      ['ID', 'Nombre', 'Email', 'Teléfono', 'Dirección', 'Cantidad Servicios', 'Total Gastado', 'Último Servicio', 'Fecha Registro'],
      clientesData.map(cliente => {
        const serviciosCliente = servicios.value.filter(servicio => servicio.clienteId === cliente.id)
        const ultimoServicio = [...serviciosCliente]
          .sort((a, b) => new Date(b.fechaServicio) - new Date(a.fechaServicio))[0]
        const totalGastado = serviciosCliente.reduce((total, servicio) => total + (Number(servicio.costo) || 0), 0)
        return [
          cliente.id,
          cliente.nombre,
          cliente.email,
          cliente.telefono,
          cliente.direccion || '',
          serviciosCliente.length,
          totalGastado,
          ultimoServicio ? formatearFechaCSV(ultimoServicio.fechaServicio) : 'Nunca',
          formatearFechaCSV(cliente.fechaCreacion)
        ]
      })
    )
  }
  
  const generarCSVVehiculos = () => {
    return crearCSV(
      ['ID', 'Cliente', 'Marca', 'Modelo', 'Año', 'Patente', 'Número Motor', 'Número Chasis', 'Kilometraje', 'Cantidad Servicios', 'Último Servicio'],
      vehiculos.value.map(vehiculo => {
        const cliente = clientes.value.find(c => c.id === vehiculo.clienteId)
        const serviciosVehiculo = servicios.value.filter(s => s.vehiculoId === vehiculo.id)
        const ultimoServicio = [...serviciosVehiculo]
          .sort((a, b) => new Date(b.fechaServicio) - new Date(a.fechaServicio))[0]
        return [
          vehiculo.id,
          cliente?.nombre || '',
          vehiculo.marca,
          vehiculo.modelo,
          vehiculo.anio ?? vehiculo.año ?? '',
          vehiculo.patente,
          vehiculo.numeroMotor || '',
          vehiculo.numeroChasis || vehiculo.vin || '',
          vehiculo.kilometraje || 0,
          serviciosVehiculo.length,
          ultimoServicio ? formatearFechaCSV(ultimoServicio.fechaServicio) : 'Nunca'
        ]
      })
    )
  }
  
  const generarCSVServicios = (serviciosData) => {
    return crearCSV(
      ['ID', 'Fecha', 'Cliente', 'Email', 'Vehículo', 'Patente', 'Tipo Servicio', 'Estado', 'Kilometraje', 'Costo', 'Próximo Servicio', 'Descripción', 'Observaciones'],
      serviciosData.map(servicio => [
        servicio.id,
        formatearFechaCSV(servicio.fechaServicio),
        servicio.cliente?.nombre || '',
        servicio.cliente?.email || '',
        `${servicio.vehiculo?.marca || ''} ${servicio.vehiculo?.modelo || ''}`.trim(),
        servicio.vehiculo?.patente || '',
        servicio.tipoServicio,
        servicio.estado,
        servicio.kilometrajeActual ?? servicio.kilometraje ?? 0,
        servicio.costo || 0,
        formatearFechaCSV(servicio.proximoServicio),
        servicio.descripcion || '',
        servicio.observaciones || ''
      ])
    )
  }
  
  const generarCSVOrdenes = () => {
    return crearCSV(
      ['ID', 'Número Orden', 'Cliente', 'Vehículo', 'Estado', 'Prioridad', 'Fecha Creación', 'Fecha Vencimiento', 'Costo Estimado', 'Costo Real', 'Descripción Trabajo', 'Observaciones'],
      ordenes.value.map(orden => {
        const cliente = clientes.value.find(c => c.id === orden.clienteId)
        const vehiculo = vehiculos.value.find(v => v.id === orden.vehiculoId)
        return [
          orden.id,
          orden.numeroOrden,
          cliente?.nombre || '',
          vehiculo ? `${vehiculo.marca} ${vehiculo.modelo}` : '',
          orden.estado,
          orden.prioridad,
          formatearFechaCSV(orden.fechaCreacion),
          formatearFechaCSV(orden.fechaVencimiento),
          orden.costoEstimado || 0,
          orden.costoReal || 0,
          orden.descripcionTrabajo || '',
          orden.observaciones || ''
        ]
      })
    )
  }
  
  const generarCSVIngresos = (datosIngresos) => {
    const filas = Object.entries(datosIngresos.ingresosPorTipo).map(([tipo, datos]) => [
      tipo,
      datos.cantidad,
      datos.total,
      datos.cantidad > 0 ? (datos.total / datos.cantidad).toFixed(2) : 0
    ])
    filas.push([
      'TOTAL GENERAL',
      datosIngresos.cantidadServicios,
      datosIngresos.totalIngresos,
      (datosIngresos.totalIngresos / datosIngresos.cantidadServicios || 0).toFixed(2)
    ])
    return crearCSV(['Tipo de Servicio', 'Cantidad', 'Total Ingresos', 'Promedio por Servicio'], filas)
  }
  
  const generarCSVVehiculosPorMarca = (vehiculosData) => {
    const total = vehiculosData.reduce((sum, item) => sum + item.cantidad, 0)
    return crearCSV(
      ['Marca', 'Modelo', 'Cantidad', 'Porcentaje'],
      vehiculosData.map(item => [
        item.marca,
        item.modelo,
        item.cantidad,
        `${total > 0 ? ((item.cantidad / total) * 100).toFixed(2) : 0}%`
      ])
    )
  }
  
  const generarCSVEstadisticasAnuales = (estadisticasData) => {
    return crearCSV(
      ['Mes', 'Cantidad Servicios', 'Ingresos'],
      estadisticasData.map(mes => [mes.mes, mes.cantidadServicios, mes.ingresos])
    )
  }
  
  const generarReportesCSV = () => {
    const reportes = []
    try {
      reportes.push({ nombre: 'clientes-reporte.csv', contenido: generarCSVClientes(clientes.value), tipo: 'text/csv' })
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
  
  const crearBackup = async (subirAGoogleDrive = false, opciones = {}) => {
    try {
      const datos = {
        version: '1.0', fecha: new Date().toISOString(),
        datos: { clientes: clientes.value, vehiculos: vehiculos.value, servicios: servicios.value, ordenes: ordenes.value },
        estadisticas: { totalClientes: clientes.value.length, totalVehiculos: vehiculos.value.length, totalServicios: servicios.value.length, totalOrdenes: ordenes.value.length }
      }
      const nombreArchivo = generarNombreArchivo()
      const descargar = opciones.descargar !== false
      const notificar = opciones.notificar !== false

      if (descargar) {
        const blob = new Blob([JSON.stringify(datos, null, 2)], { type: 'application/json' })
        descargarBlob(blob, nombreArchivo)
      }

      if (typeof indexedDB !== 'undefined') {
        await crearSnapshotRecuperacion(datos.datos, descargar ? 'manual' : 'programado')
      }
      
      ultimoBackup.value = new Date().toISOString()
      guardarPreferenciaLocal('ultimoBackup', ultimoBackup.value)
      let mensaje = descargar ? 'Backup local creado exitosamente' : 'Copia local de recuperación actualizada'

      const debeSubir = subirAGoogleDrive || backupGoogleDrive.value
      if (debeSubir && !estaAutenticado()) {
        await initializeGoogleDrive()
        const sesionRenovada = await asegurarTokenValido()
        if (!sesionRenovada) {
          copiaNubePendiente.value = true
          if (notificar) warning('La copia local se creó, pero debes volver a conectar Google Drive')
          return false
        }
      }

      if (debeSubir) {
        const resultado = await subirBackupCompletoAGoogleDrive(datos, nombreArchivo)
        if (!resultado.success) {
          copiaNubePendiente.value = true
          if (notificar) warning('La copia local se creó, pero no se pudo subir a Google Drive')
          return false
        }

        ultimoBackupGoogleDrive.value = new Date().toISOString()
        guardarPreferenciaLocal('ultimoBackupGoogleDrive', ultimoBackupGoogleDrive.value)
        backupGoogleDrive.value = true
        copiaNubePendiente.value = false
        mensaje = 'Backup JSON subido a Google Drive'
      }

      if (notificar) success(mensaje)
      return true
    } catch (err) {
      console.error('Error al crear el backup:', err)
      error(`Error al crear el backup: ${err.message}`)
      return false
    }
  }

  const restaurarBackup = (archivo) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = (e) => {
            try {
                const backup = JSON.parse(e.target.result)
                const datos = normalizarBackup(backup)
                const fecha = backup.fecha ? new Date(backup.fecha).toLocaleString('es-ES') : 'fecha desconocida'
                const confirmacion = confirm(
                  `¿Restaurar el backup del ${fecha}?\n\n` +
                  `Se reemplazarán los datos actuales por:\n` +
                  `- ${datos.clientes.length} clientes\n` +
                  `- ${datos.vehiculos.length} vehículos\n` +
                  `- ${datos.servicios.length} servicios\n` +
                  `- ${datos.ordenes.length} órdenes`
                )

                if (!confirmacion) {
                  info('Restauración cancelada')
                  resolve(false)
                  return
                }

                aplicarDatosRestaurados(datos)
                success('Backup restaurado exitosamente')
                resolve(true)
            } catch (err) {
                error('Error al restaurar el backup: ' + err.message); reject(err)
            }
        }
        reader.onerror = () => { error('Error al leer el archivo'); reject(new Error('Error al leer el archivo')) }
        reader.readAsText(archivo)
    })
  }
  
  const exportarCSV = (tipo) => {
    try {
      let contenido
      let nombreArchivo

      switch (tipo) {
        case 'clientes':
          contenido = crearCSV(
            ['ID', 'Nombre', 'Email', 'Teléfono', 'Dirección', 'Fecha Creación'],
            clientes.value.map(cliente => [
              cliente.id,
              cliente.nombre,
              cliente.email,
              cliente.telefono,
              cliente.direccion || '',
              cliente.fechaCreacion || ''
            ])
          )
          nombreArchivo = 'clientes-autoservice.csv'
          break

        case 'vehiculos':
          contenido = crearCSV(
            ['ID', 'Cliente', 'Marca', 'Modelo', 'Año', 'Patente', 'Número Motor', 'Número Chasis', 'Kilometraje'],
            vehiculos.value.map(vehiculo => {
              const cliente = clientes.value.find(c => c.id === vehiculo.clienteId)
              return [
                vehiculo.id,
                cliente?.nombre || '',
                vehiculo.marca,
                vehiculo.modelo,
                vehiculo.anio ?? vehiculo.año ?? '',
                vehiculo.patente,
                vehiculo.numeroMotor || '',
                vehiculo.numeroChasis || vehiculo.vin || '',
                vehiculo.kilometraje || 0
              ]
            })
          )
          nombreArchivo = 'vehiculos-autoservice.csv'
          break

        case 'servicios':
          contenido = crearCSV(
            ['ID', 'Fecha', 'Vehículo', 'Patente', 'Cliente', 'Email', 'Tipo Servicio', 'Estado', 'Kilometraje', 'Costo', 'Próximo Servicio', 'Descripción', 'Observaciones'],
            servicios.value.map(servicio => {
              const vehiculo = vehiculos.value.find(v => v.id === servicio.vehiculoId)
              const cliente = clientes.value.find(c => c.id === servicio.clienteId)
              return [
                servicio.id,
                servicio.fechaServicio || '',
                `${vehiculo?.marca || ''} ${vehiculo?.modelo || ''}`.trim(),
                vehiculo?.patente || '',
                cliente?.nombre || '',
                cliente?.email || '',
                servicio.tipoServicio,
                servicio.estado,
                servicio.kilometrajeActual ?? servicio.kilometraje ?? 0,
                servicio.costo || 0,
                servicio.proximoServicio || '',
                servicio.descripcion || '',
                servicio.observaciones || ''
              ]
            })
          )
          nombreArchivo = 'servicios-autoservice.csv'
          break

        case 'ordenes':
          contenido = crearCSV(
            ['ID', 'Número Orden', 'Cliente', 'Vehículo', 'Estado', 'Prioridad', 'Fecha Creación', 'Fecha Vencimiento', 'Costo Estimado', 'Costo Real', 'Descripción', 'Observaciones'],
            ordenes.value.map(orden => {
              const vehiculo = vehiculos.value.find(v => v.id === orden.vehiculoId)
              const cliente = clientes.value.find(c => c.id === orden.clienteId)
              return [
                orden.id,
                orden.numeroOrden,
                cliente?.nombre || '',
                `${vehiculo?.marca || ''} ${vehiculo?.modelo || ''}`.trim(),
                orden.estado,
                orden.prioridad,
                orden.fechaCreacion || '',
                orden.fechaVencimiento || '',
                orden.costoEstimado || 0,
                orden.costoReal || 0,
                orden.descripcionTrabajo || '',
                orden.observaciones || ''
              ]
            })
          )
          nombreArchivo = 'ordenes-autoservice.csv'
          break

        default:
          throw new Error(`Tipo de exportación desconocido: ${tipo}`)
      }

      descargarBlob(new Blob([contenido], { type: 'text/csv;charset=utf-8;' }), nombreArchivo)
      success(`Exportación de ${tipo} completada`)
      return true
    } catch (err) {
      console.error('Error al exportar CSV:', err)
      error(`Error al exportar los datos: ${err.message}`)
      return false
    }
  }

  const horasTranscurridas = (fecha) => {
    if (!fecha) return Number.POSITIVE_INFINITY
    const timestamp = new Date(fecha).getTime()
    if (Number.isNaN(timestamp)) return Number.POSITIVE_INFINITY
    return (Date.now() - timestamp) / (1000 * 60 * 60)
  }

  const verificarBackupAutomatico = () => {
    const intervalo = Number(intervaloBackup.value)
    return backupAutomatico.value &&
      Number.isFinite(intervalo) &&
      intervalo > 0 &&
      horasTranscurridas(ultimoBackup.value) >= intervalo
  }

  const verificarBackupAutomaticoGoogleDrive = () => {
    const intervalo = Number(intervaloBackup.value)
    return backupAutomaticoGoogleDrive.value &&
      backupGoogleDrive.value &&
      Number.isFinite(intervalo) &&
      intervalo > 0 &&
      horasTranscurridas(ultimoBackupGoogleDrive.value) >= intervalo
  }

  const ejecutarBackupAutomatico = () => {
    if (backupEnCurso) return backupEnCurso

    const requiereNube = verificarBackupAutomaticoGoogleDrive()
    const requiereLocal = verificarBackupAutomatico()
    if (!requiereNube && !requiereLocal) return Promise.resolve(false)

    backupEnCurso = Promise.resolve(inicializacionDatos)
      .then(() => crearBackup(requiereNube, { descargar: false, notificar: false }))
      .finally(() => { backupEnCurso = null })
    return backupEnCurso
  }

  const iniciarBackupAutomatico = () => {
    if (backupIntervalId) return backupIntervalId

    void ejecutarBackupAutomatico()
    detenerObservadorBackup = watch(
      [backupAutomatico, backupAutomaticoGoogleDrive, intervaloBackup, isAuthenticated],
      () => { void ejecutarBackupAutomatico() },
      { flush: 'post' }
    )
    backupIntervalId = setInterval(() => {
      void ejecutarBackupAutomatico()
    }, 60 * 60 * 1000)

    return backupIntervalId
  }

  const detenerBackupAutomatico = () => {
    if (backupIntervalId) clearInterval(backupIntervalId)
    backupIntervalId = null
    if (detenerObservadorBackup) detenerObservadorBackup()
    detenerObservadorBackup = null
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
    try {
      if (!backup?.id) throw new Error('Backup de Google Drive inválido')
      if (!estaAutenticado()) throw new Error('Debes conectar Google Drive primero')

      const confirmacion = confirm(
        `¿Restaurar el backup "${backup.nombre}" desde Google Drive?\n\n` +
        `Esto reemplazará todos los datos actuales.`
      )
      if (!confirmacion) {
        info('Restauración cancelada')
        return false
      }

      const resultado = await descargarBackupDeGoogleDrive(backup.id, backup.nombre, false)
      if (!resultado.success) throw new Error(resultado.error || 'No se pudo descargar el backup')

      const contenido = JSON.parse(resultado.contenido)
      const datos = normalizarBackup(contenido)
      aplicarDatosRestaurados(datos)
      success('Backup restaurado exitosamente desde Google Drive')
      return true
    } catch (err) {
      console.error('Error al restaurar backup de Google Drive:', err)
      error(`Error al restaurar el backup: ${err.message}`)
      return false
    }
  }

  const eliminarBackupDeGoogleDriveLocal = async (backup) => {
    try {
      if (!backup?.id) throw new Error('Backup de Google Drive inválido')
      if (!estaAutenticado()) throw new Error('Debes conectar Google Drive primero')

      const confirmacion = confirm(
        `¿Eliminar el backup "${backup.nombre}" de Google Drive?\n\n` +
        'Esta acción no se puede deshacer.'
      )
      if (!confirmacion) return false

      const resultado = await eliminarBackupDeGoogleDrive(backup.id, backup.nombre)
      if (!resultado.success) throw new Error(resultado.error || 'No se pudo eliminar el backup')

      backupsEnLaNube.value = backupsEnLaNube.value.filter(item => item.id !== backup.id)
      return true
    } catch (err) {
      console.error('Error al eliminar backup de Google Drive:', err)
      error(`Error al eliminar el backup: ${err.message}`)
      return false
    }
  }

  const exportarTodosLosReportesCSV = async () => {
    if (!estaAutenticado()) {
      error('Debes conectar Google Drive primero')
      return { success: false, subidos: 0, total: 0, errores: ['No autenticado'] }
    }

    const reportes = generarReportesCSV()
    if (reportes.length === 0) {
      error('No se pudieron generar los reportes CSV')
      return { success: false, subidos: 0, total: 0, errores: ['No se generaron reportes'] }
    }

    info('Generando y subiendo reportes CSV a Google Drive...')
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5)
    let subidos = 0
    const errores = []

    for (const reporte of reportes) {
      const nombre = `${timestamp}-${reporte.nombre}`
      try {
        const blob = new Blob([reporte.contenido], { type: `${reporte.tipo};charset=utf-8` })
        const resultado = await subirArchivoAGoogleDrive(blob, nombre, { carpeta: 'AutoService - Reportes CSV' })
        if (resultado.success) subidos++
        else errores.push(`${reporte.nombre}: ${resultado.error || 'error desconocido'}`)
      } catch (err) {
        errores.push(`${reporte.nombre}: ${err.message}`)
      }
    }

    if (subidos === reportes.length) {
      success(`${subidos} reportes CSV subidos exitosamente`)
      return { success: true, subidos, total: reportes.length, errores }
    }

    const mensaje = `Se subieron ${subidos} de ${reportes.length} reportes CSV`
    if (subidos > 0) warning(mensaje)
    else error(mensaje)
    return { success: false, subidos, total: reportes.length, errores }
  }

  const descargarTodosLosReportesCSV = () => {
    try {
      const reportes = generarReportesCSV()
      if (reportes.length === 0) throw new Error('No se generaron reportes')

      reportes.forEach((reporte, indice) => {
        setTimeout(() => {
          const blob = new Blob([reporte.contenido], { type: `${reporte.tipo};charset=utf-8` })
          descargarBlob(blob, reporte.nombre)
        }, indice * 150)
      })

      success(`${reportes.length} reportes CSV preparados para descargar`)
      return true
    } catch (err) {
      console.error('Error al descargar reportes CSV:', err)
      error(`Error al descargar reportes: ${err.message}`)
      return false
    }
  }

  // ✅ ¡ASEGÚRATE DE QUE ESTE BLOQUE EXISTA AL FINAL!
  return {
    ultimoBackup,
    ultimoSnapshotLocal,
    backupAutomatico,
    intervaloBackup,
    backupGoogleDrive,
    backupAutomaticoGoogleDrive,
    ultimoBackupGoogleDrive,
    copiaNubePendiente,
    backupsEnLaNube,
    crearBackup,
    restaurarBackup,
    exportarCSV,
    iniciarBackupAutomatico,
    detenerBackupAutomatico,
    verificarBackupAutomatico,
    verificarBackupAutomaticoGoogleDrive,
    cargarBackupsDeGoogleDrive,
    restaurarBackupDeGoogleDrive,
    eliminarBackupDeGoogleDrive: eliminarBackupDeGoogleDriveLocal,
    exportarTodosLosReportesCSV,
    descargarTodosLosReportesCSV
  }
}
