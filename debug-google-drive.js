// Función de prueba mejorada para verificar la configuración de Google Drive
// Ejecutar en la consola del navegador para diagnosticar problemas

function testGoogleDriveConfig() {
  console.log('=== DIAGNÓSTICO COMPLETO DE GOOGLE DRIVE ===')
  
  const results = {
    errors: [],
    warnings: [],
    success: []
  };
  
  // 1. Verificar librerías básicas
  console.log('1. VERIFICANDO LIBRERÍAS BÁSICAS')
  const gapiLoaded = typeof window.gapi !== 'undefined';
  const googleLoaded = typeof window.google !== 'undefined';
  const accountsLoaded = window.google && typeof window.google.accounts !== 'undefined';
  
  console.log('   - GAPI cargado:', gapiLoaded);
  console.log('   - Google cargado:', googleLoaded);
  console.log('   - Google Accounts cargado:', accountsLoaded);
  
  if (!gapiLoaded) {
    results.errors.push('Google API (gapi) no está cargada');
  } else {
    results.success.push('Google API (gapi) cargada correctamente');
  }
  
  if (!googleLoaded) {
    results.errors.push('Google library no está cargada');
  } else {
    results.success.push('Google library cargada correctamente');
  }
  
  if (!accountsLoaded) {
    results.errors.push('Google Accounts no está disponible');
  } else {
    results.success.push('Google Accounts disponible');
  }
  
  // 2. Verificar variables de entorno
  console.log('2. VERIFICANDO CONFIGURACIÓN')
  const clientIdFromEnv = import.meta?.env?.VITE_GOOGLE_CLIENT_ID;
  const clientIdHardcoded = '396701986433-vgqqsijbqm5ak71irloa1t5rbb2thr6u.apps.googleusercontent.com';
  
  console.log('   - Client ID desde .env:', clientIdFromEnv);
  console.log('   - Client ID hardcodeado:', clientIdHardcoded);
  
  if (!clientIdFromEnv && !clientIdHardcoded) {
    results.errors.push('No se encontró CLIENT_ID');
  } else {
    results.success.push('CLIENT_ID encontrado');
  }
  
  // 3. Verificar dominio
  console.log('3. VERIFICANDO DOMINIO')
  const currentDomain = window.location.origin;
  console.log('   - Dominio actual:', currentDomain);
  
  const authorizedDomains = [
    'http://localhost:5173',
    'http://localhost:3000',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:3000'
  ];
  
  if (authorizedDomains.includes(currentDomain)) {
    results.success.push('Dominio está en la lista de dominios autorizados comunes');
  } else {
    results.warnings.push(`Dominio ${currentDomain} podría no estar autorizado en Google Cloud Console`);
  }
  
  // 4. Verificar estado de las librerías globales
  console.log('4. VERIFICANDO ESTADO DE LIBRERÍAS GLOBALES')
  if (window.googleLibrariesLoaded) {
    console.log('   - Estado de carga tracking:', window.googleLibrariesLoaded);
    if (window.checkGoogleLibraries && window.checkGoogleLibraries()) {
      results.success.push('Todas las librerías están completamente cargadas');
    } else {
      results.warnings.push('Las librerías están parcialmente cargadas');
    }
  } else {
    results.warnings.push('No se encontró el sistema de tracking de librerías');
  }
  
  // 5. Test de inicialización básica
  console.log('5. PROBANDO INICIALIZACIÓN BÁSICA')
  if (gapiLoaded && googleLoaded && accountsLoaded) {
    try {
      // Test de inicialización de gapi
      const testPromise = new Promise((resolve, reject) => {
        window.gapi.load('client', {
          callback: () => {
            console.log('   ✅ gapi.client se puede cargar');
            results.success.push('gapi.client funcional');
            resolve();
          },
          onerror: () => {
            console.log('   ❌ Error cargando gapi.client');
            results.errors.push('gapi.client no se puede cargar');
            reject();
          }
        });
        
        // Timeout
        setTimeout(() => {
          results.warnings.push('Timeout cargando gapi.client');
          reject();
        }, 5000);
      });
      
    } catch (error) {
      console.log('   ❌ Error en test de inicialización:', error);
      results.errors.push(`Error en inicialización: ${error.message}`);
    }
  }
  
  // 6. Mostrar resumen
  console.log('6. RESUMEN DE DIAGNÓSTICO')
  console.log('   ✅ ÉXITOS:', results.success.length);
  results.success.forEach(msg => console.log(`      - ${msg}`));
  
  console.log('   ⚠️  ADVERTENCIAS:', results.warnings.length);
  results.warnings.forEach(msg => console.log(`      - ${msg}`));
  
  console.log('   ❌ ERRORES:', results.errors.length);
  results.errors.forEach(msg => console.log(`      - ${msg}`));
  
  // 7. Recomendaciones
  console.log('7. RECOMENDACIONES')
  if (results.errors.length === 0) {
    console.log('   🎉 Todo parece estar configurado correctamente');
  } else {
    console.log('   🔧 Acciones recomendadas:');
    
    if (results.errors.some(e => e.includes('CLIENT_ID'))) {
      console.log('      - Verifica que el archivo .env existe y contiene VITE_GOOGLE_CLIENT_ID');
    }
    
    if (results.errors.some(e => e.includes('gapi') || e.includes('Google'))) {
      console.log('      - Verifica tu conexión a internet');
      console.log('      - Intenta recargar la página');
    }
    
    if (results.warnings.some(w => w.includes('autorizado'))) {
      console.log('      - Ve a https://console.cloud.google.com/apis/credentials');
      console.log('      - Edita tu Client ID OAuth 2.0');
      console.log(`      - Agrega "${currentDomain}" a "Orígenes de JavaScript autorizados"`);
    }
  }
  
  return {
    success: results.success,
    warnings: results.warnings,
    errors: results.errors,
    allGood: results.errors.length === 0
  };
}

// Función para probar la autenticación completa
async function testFullAuthentication() {
  console.log('=== PRUEBA DE AUTENTICACIÓN COMPLETA ===');
  
  try {
    // Importar el composable (esto solo funciona si se ejecuta desde la app Vue)
    if (window.Vue && window.useGoogleDrive) {
      const { initializeGoogleDrive, authenticateUser, getDebugInfo } = window.useGoogleDrive();
      
      console.log('1. Información de debug inicial:');
      console.log(getDebugInfo());
      
      console.log('2. Inicializando...');
      const initialized = await initializeGoogleDrive();
      
      if (initialized) {
        console.log('3. Iniciando autenticación...');
        await authenticateUser();
      }
      
    } else {
      console.log('⚠️  Esta función requiere ejecutarse desde la aplicación Vue');
      console.log('   Usa testGoogleDriveConfig() para diagnósticos básicos');
    }
    
  } catch (error) {
    console.error('❌ Error en prueba de autenticación:', error);
  }
}

// Ejecutar diagnóstico automáticamente
console.log('🔍 Ejecutando diagnóstico automático...');
const diagnosticResult = testGoogleDriveConfig();

// Exponer funciones globalmente para uso manual
window.testGoogleDriveConfig = testGoogleDriveConfig;
window.testFullAuthentication = testFullAuthentication;

console.log('📋 Funciones disponibles:');
console.log('   - testGoogleDriveConfig(): Diagnóstico completo');
console.log('   - testFullAuthentication(): Prueba de autenticación (solo desde Vue app)');
