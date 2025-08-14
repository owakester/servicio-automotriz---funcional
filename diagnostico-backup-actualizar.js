// DIAGNÓSTICO Y FIX PARA BOTÓN ACTUALIZAR BACKUPS

console.clear()
console.log('🔧 DIAGNÓSTICO DE BACKUP DE GOOGLE DRIVE')
console.log('=' .repeat(50))

// Verificar variables de entorno
console.log('📋 Variables de entorno:')
console.log('- CLIENT_ID:', import.meta?.env?.VITE_GOOGLE_CLIENT_ID?.substring(0, 20) + '...')
console.log('- APP_NAME:', import.meta?.env?.VITE_APP_NAME)

// Verificar disponibilidad de APIs
console.log('\n🔍 Verificando APIs de Google:')
console.log('- window.gapi:', typeof window.gapi !== 'undefined')
console.log('- window.google:', typeof window.google !== 'undefined')
console.log('- gapi.client:', window.gapi?.client !== undefined)
console.log('- google.accounts:', window.google?.accounts !== undefined)

// Función para probar la carga de backups
const diagnosticarBackups = async () => {
  console.log('\n🧪 PROBANDO FUNCIONES DE BACKUP:')
  
  try {
    // Verificar si las funciones están disponibles
    if (window.debugBackup) {
      console.log('✅ window.debugBackup disponible')
      
      // Verificar autenticación
      const auth = window.debugBackup.estaAutenticado()
      console.log('🔑 Estado de autenticación:', auth)
      
      if (auth) {
        console.log('🔄 Probando carga de backups...')
        const result = await window.debugBackup.cargarBackups()
        console.log('📊 Resultado:', result)
      } else {
        console.log('❌ Usuario no autenticado. Conecta Google Drive primero.')
      }
    } else {
      console.log('❌ window.debugBackup no disponible. Recarga la página.')
    }
  } catch (error) {
    console.error('🚨 Error en diagnóstico:', error)
  }
}

// Ejecutar diagnóstico si debug está disponible
if (window.debugBackup) {
  diagnosticarBackups()
} else {
  console.log('⏳ Esperando a que window.debugBackup esté disponible...')
  setTimeout(() => {
    if (window.debugBackup) {
      diagnosticarBackups()
    } else {
      console.log('❌ window.debugBackup no disponible después de 3 segundos')
    }
  }, 3000)
}

// Exportar para uso manual
window.diagnosticarBackups = diagnosticarBackups

console.log('\n💡 INSTRUCCIONES:')
console.log('1. Asegúrate de estar en la página de Configuración')
console.log('2. Conecta Google Drive si no lo has hecho')
console.log('3. Ejecuta: await window.diagnosticarBackups()')
console.log('4. O usa: await window.debugBackup.testearFunciones()')
