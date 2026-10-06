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
                <p v-if="copiaNubePendiente" class="text-xs font-medium text-amber-700 mt-1">
                  Hay una copia pendiente de subir. Se reintentará cuando vuelvas a conectar Drive.
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

        <!-- Protección local automática -->
        <div class="border-b pb-6">
          <div class="flex items-start justify-between gap-4">
            <div>
              <h3 class="text-lg font-medium text-gray-900">Protección Local Automática</h3>
              <p class="text-sm text-gray-600">
                Se guardan silenciosamente las últimas 3 copias cada vez que cambian los datos.
              </p>
              <p
                class="text-sm mt-2"
                :class="estadoRecuperacion === 'advertencia' ? 'text-red-700' : 'text-green-700'"
              >
                {{ mensajeRecuperacion }}
              </p>
            </div>
            <span
              class="px-3 py-1 rounded-full text-xs font-medium"
              :class="estadoRecuperacion === 'advertencia' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'"
            >
              {{ estadoRecuperacion === 'advertencia' ? 'Revisar' : 'Activa' }}
            </span>
          </div>
        </div>

        <div
          v-if="requiereCopiaExterna"
          class="bg-amber-50 border border-amber-200 rounded-lg p-4"
          role="status"
        >
          <div class="flex items-start gap-3">
            <AlertTriangle class="h-5 w-5 text-amber-600 mt-0.5" aria-hidden="true" />
            <div>
              <h3 class="text-sm font-medium text-amber-900">Conviene crear una copia externa</h3>
              <p class="text-sm text-amber-800 mt-1">
                {{ ultimoBackupGoogleDrive
                  ? 'La última copia de Google Drive tiene más de 7 días.'
                  : 'Todavía no hay una copia fuera de esta computadora.' }}
              </p>
            </div>
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
          <div v-if="backupAutomaticoGoogleDrive" class="ml-7">
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Frecuencia de la copia externa
            </label>
            <select v-model="intervaloBackup" class="input-field w-40">
              <option :value="6">Cada 6 horas</option>
              <option :value="12">Cada 12 horas</option>
              <option :value="24">Una vez al día</option>
              <option :value="48">Cada 2 días</option>
              <option :value="168">Una vez por semana</option>
            </select>
            <p class="text-xs text-gray-500 mt-2">Drive conserva solamente la copia más reciente y la anterior.</p>
          </div>
        </div>
        
        <!-- Información de últimos backups -->
        <div class="bg-gray-50 rounded-lg p-4">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <!-- Último backup local -->
            <div>
              <div class="flex items-center justify-between mb-2">
                <p class="text-sm font-medium text-gray-700">Última copia local</p>
<button
  @click="crearBackupLocalAhora"
  :disabled="subiendoLocal"
  class="btn-primary text-sm flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
>
  <RefreshCw class="h-3 w-3 mr-1" :class="{ 'animate-spin': subiendoLocal }" aria-hidden="true" />
  <span>{{ subiendoLocal ? 'Guardando…' : 'Guardar copia' }}</span>
</button>

              </div>
              <p class="text-sm text-gray-600">
                {{ ultimoSnapshotLocal ? new Date(ultimoSnapshotLocal).toLocaleString('es-AR') : 'Preparando primera copia...' }}
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
            <h4 class="font-medium text-gray-900 mb-2">Importar backup desde archivo</h4>
            <p class="text-sm text-gray-600 mb-4">Reemplaza los datos actuales por una copia JSON que hayas guardado.</p>
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
    
    <!-- 🆕 MODAL DE BACKUPS EN GOOGLE DRIVE -->
    <div
      v-if="mostrarBackupsGoogleDrive"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      @click.self="mostrarBackupsGoogleDrive = false"
      @keydown.esc="mostrarBackupsGoogleDrive = false"
    >
      <div v-focus-trap class="bg-white rounded-lg p-6 w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto" role="dialog" aria-modal="true" aria-labelledby="cloud-backups-title" tabindex="-1">
        <div class="flex justify-between items-center mb-6">
          <h2 id="cloud-backups-title" class="text-xl font-bold text-gray-900 flex items-center">
            <Cloud class="h-6 w-6 mr-2 text-blue-600" />
            Backups en Google Drive
          </h2>
          <button
            type="button"
            @click="mostrarBackupsGoogleDrive = false"
            class="p-2 text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Cerrar backups de Google Drive"
          >
            <X class="h-6 w-6" aria-hidden="true" />
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
        <div class="pt-4 border-t">
          <p class="text-sm text-gray-600">
            Esta aplicación guarda los datos en este navegador y conserva tres copias locales de recuperación.
            Para protegerte ante una falla de la computadora, mantén también conectado Google Drive.
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { Database, Upload, Cloud, RefreshCw, Eye, X, AlertTriangle } from 'lucide-vue-next'
import { useBackupSystem } from '../composables/useBackupSystem'
import { useAutoService } from '../composables/useAutoService'
import { useNotifications } from '../composables/useNotifications'
import { useGoogleDrive } from '../composables/useGoogleDrive'
import { useDataRecovery } from '../composables/useDataRecovery'


// ⬇️ nuevos flags de UI
const subiendoNube = ref(false)
const subiendoLocal = ref(false)
const conectandoGD  = ref(false)

// ⬇️ reemplaza tu crearBackupConGoogleDrive
const crearBackupConGoogleDrive = async () => {
  if (subiendoNube.value) return
  subiendoNube.value = true
  try {
    await crearBackup(true)
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
    const inicializado = await initializeGoogleDrive()
    const autenticado = inicializado && await authenticateUser()
    if (autenticado) backupGoogleDrive.value = true
  } catch (error) {
    console.error('Error al conectar Google Drive:', error)
  } finally {
    conectandoGD.value = false
  }
}

const { success, info: showInfo, error: showError } = useNotifications()
const { clientes, vehiculos, servicios, ordenes } = useAutoService()
const { estadoRecuperacion, mensajeRecuperacion } = useDataRecovery()
const {
  ultimoSnapshotLocal,
  intervaloBackup,
  crearBackup,
  restaurarBackup,
  exportarCSV,
  // 🆕 NUEVAS FUNCIONALIDADES
  backupGoogleDrive,
  backupAutomaticoGoogleDrive,
  ultimoBackupGoogleDrive,
  copiaNubePendiente,
  backupsEnLaNube,
  cargarBackupsDeGoogleDrive,
  restaurarBackupDeGoogleDrive,
  eliminarBackupDeGoogleDrive
} = useBackupSystem()

// 🆕 GOOGLE DRIVE
const { estaAutenticado, initializeGoogleDrive, authenticateUser } = useGoogleDrive()

// 🆕 NUEVOS ESTADOS LOCALES
const mostrarBackupsGoogleDrive = ref(false)
const cargandoBackups = ref(false)

// Computed
const estadisticas = computed(() => ({
  totalRegistros: clientes.value.length + vehiculos.value.length + 
                  servicios.value.length + ordenes.value.length
}))

const requiereCopiaExterna = computed(() => {
  if (!ultimoBackupGoogleDrive.value) return true
  const fecha = new Date(ultimoBackupGoogleDrive.value).getTime()
  if (Number.isNaN(fecha)) return true
  return Date.now() - fecha > 7 * 24 * 60 * 60 * 1000
})

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

</script>
