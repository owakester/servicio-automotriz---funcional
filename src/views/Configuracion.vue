<template>
  <div class="space-y-6">
    <h1 class="text-3xl font-bold text-gray-900">Configuración</h1>
    
    <!-- Sección de Backup -->
    <div class="card">
      <h2 class="text-xl font-semibold text-gray-900 mb-6 flex items-center">
        <Database class="h-6 w-6 mr-2 text-primary-600" />
        Sistema de Backup
      </h2>
      
      <div class="space-y-6">
        <!-- Estado de Google Drive -->
        <div class="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div class="flex items-center justify-between">
            <div class="flex items-center">
              <Cloud class="h-5 w-5 text-blue-600 mr-2" />
              <div>
                <h3 class="text-sm font-medium text-blue-900">
                  {{ estaAutenticado() ? 'Google Drive Conectado' : 'Google Drive No Conectado' }}
                </h3>
                <p class="text-xs text-blue-700">
                  {{ estaAutenticado() ? 'Tus backups pueden guardarse automáticamente en la nube' : 'Conecta para habilitar backup automático en la nube' }}
                </p>
              </div>
            </div>
            <button
              v-if="!estaAutenticado()"
              @click="conectarGoogleDrive"
              class="btn-primary text-sm"
            >
              <Cloud class="h-4 w-4 mr-1" />
              Conectar
            </button>
          </div>
        </div>

        <!-- Backup Automático Local -->
        <div class="border-b pb-6">
          <div class="flex items-center justify-between mb-4">
            <div>
              <h3 class="text-lg font-medium text-gray-900">Backup Automático Local</h3>
              <p class="text-sm text-gray-600">Crear respaldos locales automáticamente según el intervalo configurado</p>
            </div>
            <label class="relative inline-flex items-center cursor-pointer">
              <input
                v-model="backupAutomatico"
                type="checkbox"
                class="sr-only peer"
              >
              <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
            </label>
          </div>
          
          <div v-if="backupAutomatico" class="ml-4">
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Intervalo de backup (horas)
            </label>
            <select v-model="intervaloBackup" class="input-field w-32">
              <option :value="6">6 horas</option>
              <option :value="12">12 horas</option>
              <option :value="24">24 horas</option>
              <option :value="48">48 horas</option>
              <option :value="168">1 semana</option>
            </select>
          </div>
        </div>
        
        <!-- 🆕 Backup Automático Google Drive -->
        <div v-if="estaAutenticado()" class="border-b pb-6">
          <div class="flex items-center justify-between mb-4">
            <div>
              <h3 class="text-lg font-medium text-gray-900 flex items-center">
                <Cloud class="h-5 w-5 mr-2 text-blue-600" />
                Backup Automático Google Drive
              </h3>
              <p class="text-sm text-gray-600">Subir respaldos automáticamente a Google Drive (requiere conexión)</p>
            </div>
            <label class="relative inline-flex items-center cursor-pointer">
              <input
                v-model="backupAutomaticoGoogleDrive"
                type="checkbox"
                class="sr-only peer"
              >
              <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
        </div>
        
        <!-- Información de últimos backups -->
        <div class="bg-gray-50 rounded-lg p-4">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <!-- Último backup local -->
            <div>
              <div class="flex items-center justify-between mb-2">
                <p class="text-sm font-medium text-gray-700">Último backup local</p>
<button
  @click="crearBackupLocalAhora"
  :disabled="subiendoLocal"
  class="btn-primary text-sm flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
>
  <Download class="h-3 w-3 mr-1" />
  <span>{{ subiendoLocal ? 'Creando…' : 'Crear Ahora' }}</span>
</button>

              </div>
              <p class="text-sm text-gray-600">
                {{ ultimoBackup ? new Date(ultimoBackup).toLocaleString('es-ES') : 'Nunca' }}
              </p>
            </div>
            
            <!-- Último backup Google Drive -->
            <div v-if="estaAutenticado()">
              <div class="flex items-center justify-between mb-2">
                <p class="text-sm font-medium text-gray-700 flex items-center">
                  <Cloud class="h-4 w-4 mr-1 text-blue-600" />
                  Último backup Google Drive
                </p>
<button
  @click="crearBackupConGoogleDrive"
  :disabled="subiendoNube"
  class="bg-blue-600 hover:bg-blue-700 text-white text-sm px-3 py-1 rounded flex items-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
  :aria-busy="subiendoNube"
>
  <Cloud class="h-3 w-3 mr-1" />
  <span v-if="!subiendoNube">Subir Ahora</span>
  <span v-else>Subiendo…</span>
</button>
              </div>
              <p class="text-sm text-gray-600">
                {{ ultimoBackupGoogleDrive ? new Date(ultimoBackupGoogleDrive).toLocaleString('es-ES') : 'Nunca' }}
              </p>
            </div>
          </div>
        </div>
        
        <!-- Acciones de Backup -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div class="border rounded-lg p-4">
            <h4 class="font-medium text-gray-900 mb-2">Restaurar Backup Local</h4>
            <p class="text-sm text-gray-600 mb-4">Cargar un archivo de backup desde tu dispositivo</p>
            <input
              ref="fileInput"
              type="file"
              accept=".json"
              @change="handleFileSelect"
              class="hidden"
            />
            <button
              @click="$refs.fileInput.click()"
              class="btn-secondary w-full flex items-center justify-center"
            >
              <Upload class="h-4 w-4 mr-2" />
              Seleccionar Archivo
            </button>
          </div>
          
          <!-- 🆕 Gestión de backups en Google Drive -->
          <div v-if="estaAutenticado()" class="border rounded-lg p-4 bg-blue-50 border-blue-200">
            <h4 class="font-medium text-gray-900 mb-2 flex items-center">
              <Cloud class="h-4 w-4 mr-2 text-blue-600" />
              Backups en Google Drive
            </h4>
            <p class="text-sm text-gray-600 mb-4">Ver y restaurar backups guardados en la nube</p>
            <button
              @click="toggleBackupsGoogleDrive"
              class="bg-blue-600 hover:bg-blue-700 text-white w-full px-4 py-2 rounded flex items-center justify-center transition-colors"
            >
              <Eye class="h-4 w-4 mr-2" />
              Ver Backups en la Nube
            </button>
          </div>
          
          <div class="border rounded-lg p-4">
            <h4 class="font-medium text-gray-900 mb-2">Exportar Datos</h4>
            <p class="text-sm text-gray-600 mb-4">Exportar datos en formato CSV</p>
            <div class="space-y-2">
              <button
                @click="exportarCSV('clientes')"
                class="btn-secondary w-full text-sm"
              >
                Exportar Clientes
              </button>
              <button
                @click="exportarCSV('vehiculos')"
                class="btn-secondary w-full text-sm"
              >
                Exportar Vehículos
              </button>
              <button
                @click="exportarCSV('servicios')"
                class="btn-secondary w-full text-sm"
              >
                Exportar Servicios
              </button>
              <button
                @click="exportarCSV('ordenes')"
                class="btn-secondary w-full text-sm"
              >
                Exportar Órdenes
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- 🆕 NUEVA SECCIÓN: REPORTES CSV AVANZADOS -->
    <div class="card">
      <h2 class="text-xl font-semibold text-gray-900 mb-6 flex items-center">
        <Database class="h-6 w-6 mr-2 text-green-600" />
        Reportes CSV Avanzados
      </h2>
      
      <div class="space-y-6">
        <div class="bg-green-50 border border-green-200 rounded-lg p-4">
          <div class="flex items-center mb-2">
            <Database class="h-5 w-5 text-green-600 mr-2" />
            <h3 class="text-sm font-medium text-green-900">Exportación Completa de Reportes</h3>
          </div>
          <p class="text-xs text-green-700 mb-4">
            Genera automáticamente 7 reportes detallados en formato CSV con estadísticas avanzadas
          </p>
          <div class="grid grid-cols-2 gap-2 text-xs text-green-700">
            <div>• Clientes con historial</div>
            <div>• Vehículos con servicios</div>
            <div>• Servicios del último año</div>
            <div>• Órdenes completas</div>
            <div>• Ingresos por tipo</div>
            <div>• Vehículos por marca</div>
            <div>• Estadísticas anuales</div>
            <div></div>
          </div>
        </div>
        
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <!-- Descargar reportes localmente -->
          <div class="border rounded-lg p-4">
            <h4 class="font-medium text-gray-900 mb-2 flex items-center">
              <Download class="h-4 w-4 mr-2 text-gray-600" />
              Descargar Reportes Localmente
            </h4>
            <p class="text-sm text-gray-600 mb-4">
              Genera y descarga todos los reportes CSV a tu dispositivo
            </p>
            <button
              @click="descargarReportesCSVLocal"
              class="btn-primary w-full flex items-center justify-center"
            >
              <Download class="h-4 w-4 mr-2" />
              Descargar 7 Reportes CSV
            </button>
          </div>
          
          <!-- Subir reportes a Google Drive -->
          <div v-if="estaAutenticado()" class="border rounded-lg p-4 bg-green-50 border-green-200">
            <h4 class="font-medium text-gray-900 mb-2 flex items-center">
              <Cloud class="h-4 w-4 mr-2 text-green-600" />
              Subir Reportes a Google Drive
            </h4>
            <p class="text-sm text-gray-600 mb-4">
              Genera y sube todos los reportes CSV a tu carpeta de Google Drive
            </p>
            <button
              @click="exportarReportesCSVAGoogleDrive"
              class="bg-green-600 hover:bg-green-700 text-white w-full px-4 py-2 rounded flex items-center justify-center transition-colors"
            >
              <Cloud class="h-4 w-4 mr-2" />
              Subir 7 Reportes CSV
            </button>
          </div>
          
          <!-- Mensaje cuando no está autenticado -->
          <div v-else class="border rounded-lg p-4 bg-gray-50 border-gray-200">
            <h4 class="font-medium text-gray-500 mb-2 flex items-center">
              <Cloud class="h-4 w-4 mr-2 text-gray-400" />
              Subir Reportes a Google Drive
            </h4>
            <p class="text-sm text-gray-500 mb-4">
              Conecta Google Drive para subir reportes automáticamente
            </p>
            <button
              @click="conectarGoogleDrive"
              class="btn-secondary w-full flex items-center justify-center"
            >
              <Cloud class="h-4 w-4 mr-2" />
              Conectar Google Drive
            </button>
          </div>
        </div>
        
        <div class="border-t pt-4">
          <div class="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p class="text-sm text-blue-800">
              <strong>Nota:</strong> Los reportes CSV incluyen datos enriquecidos como estadísticas de clientes, 
              historial de servicios por vehículo, análisis de ingresos y más. Son ideales para análisis 
              detallados en Excel, Google Sheets o herramientas de Business Intelligence.
            </p>
          </div>
        </div>
      </div>
    </div>
    
    <!-- 🆕 MODAL DE BACKUPS EN GOOGLE DRIVE -->
    <div
      v-if="mostrarBackupsGoogleDrive"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
    >
      <div class="bg-white rounded-lg p-6 w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
        <div class="flex justify-between items-center mb-6">
          <h2 class="text-xl font-bold text-gray-900 flex items-center">
            <Cloud class="h-6 w-6 mr-2 text-blue-600" />
            Backups en Google Drive
          </h2>
          <button
            @click="mostrarBackupsGoogleDrive = false"
            class="p-2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X class="h-6 w-6" />
          </button>
        </div>
        
        <div class="flex justify-between items-center mb-4">
          <p class="text-sm text-gray-600">
            Backups almacenados en tu cuenta de Google Drive
          </p>
          <button
            @click="cargarListaBackups"
            :disabled="cargandoBackups"
            class="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-4 py-2 rounded text-sm flex items-center transition-colors"
          >
            <RefreshCw :class="['h-4 w-4 mr-2', cargandoBackups ? 'animate-spin' : '']" />
            {{ cargandoBackups ? 'Cargando...' : 'Actualizar' }}
          </button>
        </div>
        
        <!-- Lista de backups -->
        <div v-if="cargandoBackups" class="text-center py-12">
          <RefreshCw class="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p class="text-gray-600">Cargando backups desde Google Drive...</p>
        </div>
        
        <div v-else-if="backupsEnLaNube.length === 0" class="text-center py-12">
          <Cloud class="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 class="text-lg font-medium text-gray-900 mb-2">No hay backups en Google Drive</h3>
          <p class="text-gray-500 mb-6">Crea tu primer backup automático habilitando la opción arriba</p>
          <button
            @click="crearBackupConGoogleDrive"
            class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded transition-colors"
          >
            Crear Primer Backup
          </button>
        </div>
        
        <div v-else class="space-y-3">
          <div
            v-for="backup in backupsEnLaNube"
            :key="backup.id"
            class="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
          >
            <div class="flex items-center justify-between">
              <div class="flex-1">
                <h3 class="font-medium text-gray-900">{{ backup.nombre }}</h3>
                <div class="flex items-center text-sm text-gray-600 mt-1">
                  <span>{{ backup.fecha }}</span>
                  <span class="mx-2">•</span>
                  <span>{{ backup.tamaño }}</span>
                </div>
              </div>
              <div class="flex items-center space-x-2">
                <a
                  :href="backup.enlace"
                  target="_blank"
                  class="p-2 text-blue-600 hover:text-blue-800 transition-colors"
                  title="Ver en Google Drive"
                >
                  <Eye class="h-4 w-4" />
                </a>
                <button
                  @click="restaurarDesdeGoogleDrive(backup)"
                  class="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm transition-colors"
                  title="Restaurar este backup"
                >
                  Restaurar
                </button>
                <button
                  @click="eliminarDeGoogleDrive(backup)"
                  class="p-2 text-red-600 hover:text-red-800 transition-colors"
                  title="Eliminar backup"
                >
                  <X class="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
        
        <div class="mt-6 pt-4 border-t">
          <button
            @click="mostrarBackupsGoogleDrive = false"
            class="btn-secondary"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
    
    <!-- Sección de Rendimiento -->
    <div class="card">
      <h2 class="text-xl font-semibold text-gray-900 mb-6 flex items-center">
        <Zap class="h-6 w-6 mr-2 text-primary-600" />
        Optimización y Rendimiento
      </h2>
      
      <div class="space-y-4">
        <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p class="text-sm text-blue-800">
            <strong>Modo de Aplicación Local:</strong> Esta aplicación está optimizada para funcionar 
            completamente offline sin necesidad de conexión a internet (excepto para Google Drive).
          </p>
        </div>
        
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div class="text-center p-4 bg-gray-50 rounded-lg">
            <div class="text-2xl font-bold text-primary-600">{{ estadisticas.totalRegistros }}</div>
            <div class="text-sm text-gray-600">Total de Registros</div>
          </div>
          <div class="text-center p-4 bg-gray-50 rounded-lg">
            <div class="text-2xl font-bold text-primary-600">{{ tamanoEstimado }}</div>
            <div class="text-sm text-gray-600">Uso de Almacenamiento</div>
          </div>
          <div class="text-center p-4 bg-gray-50 rounded-lg">
            <div class="text-2xl font-bold text-primary-600">{{ rendimiento }}ms</div>
            <div class="text-sm text-gray-600">Tiempo de Carga</div>
          </div>
        </div>
        
        <div class="border-t pt-4">
          <button
            @click="limpiarCache"
            class="btn-secondary flex items-center"
          >
            <Trash2 class="h-4 w-4 mr-2" />
            Limpiar Caché de Navegador
          </button>
        </div>
      </div>
    </div>
    
    <!-- Sección de Información -->
    <div class="card">
      <h2 class="text-xl font-semibold text-gray-900 mb-6 flex items-center">
        <Info class="h-6 w-6 mr-2 text-primary-600" />
        Acerca de AutoService Pro
      </h2>
      
      <div class="space-y-4">
        <div>
          <p class="text-sm text-gray-600">Versión</p>
          <p class="font-medium">1.0.0</p>
        </div>
        <div>
          <p class="text-sm text-gray-600">Desarrollado por</p>
          <p class="font-medium">Tu Empresa</p>
        </div>
        <div>
          <p class="text-sm text-gray-600">Tecnologías</p>
          <p class="font-medium">Vue 3, Vite, Tailwind CSS</p>
        </div>
        <div class="pt-4 border-t">
          <p class="text-sm text-gray-600">
            Esta aplicación almacena todos los datos localmente en tu navegador. 
            Recuerda hacer backups periódicos para evitar pérdida de información.
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { Database, Download, Upload, Zap, Info, Trash2, Cloud, RefreshCw, Eye, X } from 'lucide-vue-next'
import { useBackupSystem } from '../composables/useBackupSystem'
import { useAutoService } from '../composables/useAutoService'
import { useNotifications } from '../composables/useNotifications'
import { useGoogleDrive } from '../composables/useGoogleDrive'

// al inicio, junto a los otros `import`
import { AlertTriangle } from 'lucide-vue-next'
import { useProximosServicios } from '../composables/useProximosServicios'

// ⬇️ nuevos flags de UI
const subiendoNube = ref(false)
const subiendoLocal = ref(false)
const conectandoGD  = ref(false)

// ⬇️ reemplaza tu crearBackupConGoogleDrive
const crearBackupConGoogleDrive = async () => {
  if (subiendoNube.value) return
  subiendoNube.value = true
  try {
    // tu sistema ya hace todo si le pasás true
    const r = await crearBackup(true)

    // si tu useBackupSystem ya setea ultimoBackupGoogleDrive, no hace falta esto:
    if (!ultimoBackupGoogleDrive.value && (r?.success || r === true)) {
      ultimoBackupGoogleDrive.value = new Date().toISOString()
      localStorage.setItem('ultimoBackupGoogleDrive', ultimoBackupGoogleDrive.value)
    }
  } catch (e) {
    console.error(e)
  } finally {
    subiendoNube.value = false
  }
}

// ⬇️ opcional: envolver el local para evitar dobles clics también
const crearBackupLocalAhora = async () => {
  if (subiendoLocal.value) return
  subiendoLocal.value = true
  try {
    await crearBackup(false) // local
  } catch (e) {
    console.error(e)
  } finally {
    subiendoLocal.value = false
  }
}

// ⬇️ opcional: evitar doble clic en conectar
const conectarGoogleDrive = async () => {
  if (conectandoGD.value || estaAutenticado()) return
  conectandoGD.value = true
  try {
    await initializeGoogleDrive()
    await authenticateUser()
  } catch (error) {
    console.error('Error al conectar Google Drive:', error)
  } finally {
    conectandoGD.value = false
  }
}

const { success, info: showInfo, error: showError } = useNotifications()
const { clientes, vehiculos, servicios, ordenes } = useAutoService()
const {
  ultimoBackup,
  backupAutomatico,
  intervaloBackup,
  crearBackup,
  restaurarBackup,
  exportarCSV,
  // 🆕 NUEVAS FUNCIONALIDADES
  backupGoogleDrive,
  backupAutomaticoGoogleDrive,
  ultimoBackupGoogleDrive,
  backupsEnLaNube,
  cargarBackupsDeGoogleDrive,
  restaurarBackupDeGoogleDrive,
  eliminarBackupDeGoogleDrive,
  // 🆕 FUNCIONES DE REPORTES CSV
  exportarTodosLosReportesCSV,
  descargarTodosLosReportesCSV
} = useBackupSystem()

// 🆕 GOOGLE DRIVE
const { estaAutenticado, initializeGoogleDrive, authenticateUser } = useGoogleDrive()

// Estado local
const rendimiento = ref(0)
// 🆕 NUEVOS ESTADOS LOCALES
const mostrarBackupsGoogleDrive = ref(false)
const cargandoBackups = ref(false)

// Computed
const estadisticas = computed(() => ({
  totalRegistros: clientes.value.length + vehiculos.value.length + 
                  servicios.value.length + ordenes.value.length
}))

const tamanoEstimado = computed(() => {
  const totalSize = JSON.stringify({
    clientes: clientes.value,
    vehiculos: vehiculos.value,
    servicios: servicios.value,
    ordenes: ordenes.value
  }).length
  
  if (totalSize < 1024) return `${totalSize} B`
  if (totalSize < 1024 * 1024) return `${(totalSize / 1024).toFixed(2)} KB`
  return `${(totalSize / (1024 * 1024)).toFixed(2)} MB`
})

// 🆕 NUEVAS FUNCIONES

// (función duplicada eliminada)



// (función duplicada eliminada)


const toggleBackupsGoogleDrive = async () => {
  if (!estaAutenticado()) {
    await conectarGoogleDrive()
    return
  }
  
  mostrarBackupsGoogleDrive.value = !mostrarBackupsGoogleDrive.value
  
  if (mostrarBackupsGoogleDrive.value) {
    await cargarListaBackups()
  }
}

const cargarListaBackups = async () => {
  console.log('🔍 Iniciando carga de backups desde Google Drive...')
  cargandoBackups.value = true
  
  try {
    if (!estaAutenticado()) {
      console.log('❌ Usuario no autenticado para cargar backups')
      await conectarGoogleDrive()
      return
    }
    
    console.log('✅ Usuario autenticado, llamando a cargarBackupsDeGoogleDrive...')
    const backups = await cargarBackupsDeGoogleDrive()
    console.log('📊 Backups obtenidos:', backups)
    
    if (backups && backups.length > 0) {
      success(`✅ ${backups.length} backups encontrados en Google Drive`)
    } else {
      showInfo('📁 No se encontraron backups en Google Drive')
    }
  } catch (error) {
    console.error('❌ Error detallado al cargar backups:', error)
    showError(`Error al cargar backups: ${error.message}`)
  } finally {
    cargandoBackups.value = false
  }
}

const restaurarDesdeGoogleDrive = async (backup) => {
  const resultado = await restaurarBackupDeGoogleDrive(backup)
  if (resultado) {
    mostrarBackupsGoogleDrive.value = false
  }
}

const eliminarDeGoogleDrive = async (backup) => {
  const eliminado = await eliminarBackupDeGoogleDrive(backup)
  if (eliminado) {
    await cargarListaBackups()
  }
}

// 🆕 NUEVAS FUNCIONES PARA REPORTES CSV
const exportarReportesCSVAGoogleDrive = async () => {
  await exportarTodosLosReportesCSV()
}

const descargarReportesCSVLocal = () => {
  descargarTodosLosReportesCSV()
}

// 🆕 FUNCIÓN DE DEBUG TEMPORAL
const testearFuncionesBackup = async () => {
  console.log('🧪 INICIANDO TEST DE FUNCIONES DE BACKUP...')
  
  console.log('1. Verificando autenticación...')
  const auth = estaAutenticado()
  console.log('Autenticado:', auth)
  
  if (auth) {
    console.log('2. Probando cargarBackupsDeGoogleDrive directamente...')
    try {
      const backups = await cargarBackupsDeGoogleDrive()
      console.log('Resultado directo:', backups)
    } catch (error) {
      console.error('Error en test directo:', error)
    }
  }
}

// Métodos
const handleFileSelect = async (event) => {
  const file = event.target.files[0]
  if (file) {
    try {
      await restaurarBackup(file)
    } catch (error) {
      console.error('Error al restaurar backup:', error)
    }
  }
  // Limpiar el input
  event.target.value = ''
}

const limpiarCache = () => {
  if (confirm('¿Estás seguro de limpiar la caché? Esto recargará la aplicación.')) {
    // Limpiar caché del navegador
    if ('caches' in window) {
      caches.keys().then(names => {
        names.forEach(name => {
          caches.delete(name)
        })
      })
    }
    
    // Recargar la página
    showInfo('Limpiando caché...')
    setTimeout(() => {
      window.location.reload(true)
    }, 1000)
  }
}

// Medir rendimiento al cargar
onMounted(() => {
  const startTime = performance.now()
  // Simular carga de datos
  setTimeout(() => {
    rendimiento.value = Math.round(performance.now() - startTime)
  }, 100)
  
 
  console.log('🆕 Funciones de debug disponibles en window.debugBackup')
})

// ... debajo de los otros `use` composables
const { descargarCSVLocal: descargarProximosServiciosCSV } = useProximosServicios()
</script>
