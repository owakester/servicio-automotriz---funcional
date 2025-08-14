import { useAutoService } from './useAutoService'
import { useNotifications } from './useNotifications'

export const useBackup = () => {
  const { clientes, vehiculos, servicios, ordenes } = useAutoService()
  const { success, error } = useNotifications()

  // Exportar backup completo
  const exportarBackup = () => {
    try {
      const backup = {
        version: '1.0.0',
        fecha: new Date().toISOString(),
        datos: {
          clientes: clientes.value,
          vehiculos: vehiculos.value,
          servicios: servicios.value,
          ordenes: ordenes.value
        }
      }

      const dataStr = JSON.stringify(backup, null, 2)
      const blob = new Blob([dataStr], { type: 'application/json' })
      
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = `backup_autoservice_${new Date().toISOString().split('T')[0]}.json`
      
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      success('Backup exportado exitosamente')
    } catch (err) {
      console.error('Error al exportar backup:', err)
      error('Error al exportar backup')
    }
  }

  // Importar backup
  const importarBackup = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      
      reader.onload = (e) => {
        try {
          const backup = JSON.parse(e.target.result)
          
          // Validar estructura del backup
          if (!backup.datos || !backup.datos.clientes || !backup.datos.vehiculos || !backup.datos.servicios) {
            throw new Error('Formato de backup inválido')
          }
          
          // Verificar si el backup incluye órdenes (retrocompatibilidad)
          const incluirOrdenes = backup.datos.ordenes !== undefined

          // Confirmar antes de restaurar
          if (confirm(`¿Estás seguro de que deseas restaurar el backup del ${new Date(backup.fecha).toLocaleDateString('es-ES')}? Esto reemplazará todos los datos actuales.`)) {
            
            // Guardar datos en localStorage
            localStorage.setItem('autoservice_clientes', JSON.stringify(backup.datos.clientes))
            localStorage.setItem('autoservice_vehiculos', JSON.stringify(backup.datos.vehiculos))
            localStorage.setItem('autoservice_servicios', JSON.stringify(backup.datos.servicios))
            
            // Guardar órdenes si están presentes en el backup
            if (incluirOrdenes) {
              localStorage.setItem('autoservice_ordenes', JSON.stringify(backup.datos.ordenes))
            }
            
            // Actualizar estado reactivo
            clientes.value = backup.datos.clientes
            vehiculos.value = backup.datos.vehiculos
            servicios.value = backup.datos.servicios
            
            // Actualizar órdenes si están presentes
            if (incluirOrdenes) {
              ordenes.value = backup.datos.ordenes
            }
            
            success('Backup restaurado exitosamente')
            resolve(backup)
          } else {
            resolve(null)
          }
        } catch (err) {
          console.error('Error al importar backup:', err)
          error('Error al importar backup: formato inválido')
          reject(err)
        }
      }
      
      reader.onerror = () => {
        error('Error al leer el archivo')
        reject(new Error('Error al leer el archivo'))
      }
      
      reader.readAsText(file)
    })
  }

  // Limpiar todos los datos
  const limpiarDatos = () => {
    if (confirm('¿Estás seguro de que deseas eliminar TODOS los datos? Esta acción no se puede deshacer.')) {
      if (confirm('Esta es tu última oportunidad para cancelar. ¿Realmente deseas eliminar todo?')) {
        // Eliminar todos los datos del localStorage relacionados con la aplicación
        localStorage.removeItem('autoservice_clientes')
        localStorage.removeItem('autoservice_vehiculos')
        localStorage.removeItem('autoservice_servicios')
        localStorage.removeItem('autoservice_ordenes')
        localStorage.removeItem('autoservice_configuracion')
        
        // También buscar y eliminar cualquier otro dato que pueda existir
        const keysToRemove = []
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i)
          if (key && key.startsWith('autoservice_')) {
            keysToRemove.push(key)
          }
        }
        
        // Eliminar todas las claves encontradas
        keysToRemove.forEach(key => {
          localStorage.removeItem(key)
        })
        
        // Limpiar el estado reactivo
        clientes.value = []
        vehiculos.value = []
        servicios.value = []
        ordenes.value = []
        
        // Forzar una recarga completa de la página para asegurar que todos los estados se reinicien
        setTimeout(() => {
          window.location.reload()
        }, 1000)
        
        success('Todos los datos han sido eliminados exitosamente. La página se recargará en un momento...')
      }
    }
  }

  // Obtener estadísticas del sistema
  const getEstadisticasSistema = () => {
    const totalClientes = clientes.value.length
    const totalVehiculos = vehiculos.value.length
    const totalServicios = servicios.value.length
    const totalOrdenes = ordenes.value.length
    
    const tamanoClientes = new Blob([JSON.stringify(clientes.value)]).size
    const tamanoVehiculos = new Blob([JSON.stringify(vehiculos.value)]).size
    const tamanoServicios = new Blob([JSON.stringify(servicios.value)]).size
    const tamanoOrdenes = new Blob([JSON.stringify(ordenes.value)]).size
    const tamanoTotal = tamanoClientes + tamanoVehiculos + tamanoServicios + tamanoOrdenes

    const formatBytes = (bytes) => {
      if (bytes === 0) return '0 Bytes'
      const k = 1024
      const sizes = ['Bytes', 'KB', 'MB', 'GB']
      const i = Math.floor(Math.log(bytes) / Math.log(k))
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
    }

    return {
      totalClientes,
      totalVehiculos,
      totalServicios,
      totalOrdenes,
      tamanoClientes: formatBytes(tamanoClientes),
      tamanoVehiculos: formatBytes(tamanoVehiculos),
      tamanoServicios: formatBytes(tamanoServicios),
      tamanoOrdenes: formatBytes(tamanoOrdenes),
      tamanoTotal: formatBytes(tamanoTotal)
    }
  }

  return {
    exportarBackup,
    importarBackup,
    limpiarDatos,
    getEstadisticasSistema
  }
}
