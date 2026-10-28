<template>
  <section v-if="usaDisco" class="mb-4 rounded-lg border" :class="estadoNormal ? 'bg-green-50 border-green-200 px-3 py-2' : 'bg-amber-50 border-amber-300 p-4'" role="status">
    <div v-if="estadoNormal" class="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-sm">
      <p class="flex items-center gap-2 text-green-800">
        <CheckCircle2 class="h-4 w-4 flex-shrink-0" aria-hidden="true" />
        <span>Datos guardados · Drive actualizado</span>
      </p>
      <button type="button" @click="mostrarDetalles = !mostrarDetalles" :aria-expanded="mostrarDetalles" aria-controls="detalles-guardado" class="inline-flex items-center gap-1 rounded text-green-800 underline underline-offset-2 hover:text-green-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-700">
        {{ mostrarDetalles ? 'Ocultar detalles' : 'Ver detalles' }}
        <ChevronDown class="h-4 w-4" :class="{ 'rotate-180': mostrarDetalles }" aria-hidden="true" />
      </button>
    </div>
    <div v-if="!estadoNormal || mostrarDetalles" id="detalles-guardado" :class="{ 'mt-3 border-t border-green-200 pt-3': estadoNormal }">
      <p class="font-medium">{{ guardando ? 'Guardando en disco… No cierres el programa.' : bloqueoPestana ? 'Otra pestaña tiene la edición. Cerrá las duplicadas y recargá esta antes de guardar.' : mensaje }}</p>
      <p v-if="carpeta" class="mt-1 text-xs break-all">Carpeta de datos y copias: {{ carpeta }}</p>
      <p v-if="ultimaConfirmacion" class="mt-1 text-xs">Último guardado confirmado: {{ new Date(ultimaConfirmacion).toLocaleString('es-AR') }}</p>
      <p v-if="backupGoogleDrive" class="mt-2 text-sm" :class="drivePendiente ? 'font-semibold text-amber-900' : ''">{{ drivePendiente ? 'Drive pendiente: los últimos cambios aún no tienen una copia confirmada en la nube. Verificá la conexión en Configuración.' : ultimoBackupGoogleDrive ? `Última copia confirmada en Drive: ${new Date(ultimoBackupGoogleDrive).toLocaleString('es-AR')}` : 'Drive todavía no tiene una copia confirmada.' }}</p>
      <p v-else class="mt-2 text-sm font-semibold text-amber-900">El respaldo de Drive está desactivado. Los datos están en esta PC, pero necesitás una copia externa para cubrir una falla del disco.</p>
      <button v-if="estado === 'error' || bloqueoPestana" @click="recargar" class="btn-secondary mt-3">Recargar y verificar datos</button>
      <div v-if="estado === 'migracion' && !bloqueoPestana" class="mt-4 space-y-3">
        <h2 class="text-lg font-semibold">Preparar el almacenamiento seguro del taller</h2>
        <p>No se importará ni reemplazará información sin tu confirmación. Los backups JSON anteriores siguen siendo compatibles.</p>
        <div v-if="candidatoMigracion">
          <p>Encontramos en este navegador: {{ resumen(candidatoMigracion) }}.</p>
          <button :disabled="guardando" @click="migrar" class="btn-primary mt-2">Migrar estos registros al disco</button>
        </div>
        <label class="block font-medium" for="initial-backup">Importar una copia JSON existente (local o descargada de Drive)</label>
        <input id="initial-backup" :disabled="guardando" type="file" accept=".json,application/json" @change="importar" class="block w-full" />
        <p class="text-sm">Si falta una base que ya usabas, conservá la carpeta y elegí un JSON de su subcarpeta backups. No borres archivos.</p>
        <button :disabled="guardando || Boolean(candidatoMigracion)" @click="nuevo" class="btn-secondary">Solo para una instalación nueva: empezar sin registros</button>
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed, ref } from 'vue'
import { CheckCircle2, ChevronDown } from 'lucide-vue-next'
import { usaDisco, useDiskStorage } from '../composables/useDiskStorage'
import { useAutoService } from '../composables/useAutoService'
import { useBackupSystem } from '../composables/useBackupSystem'
import { useNotifications } from '../composables/useNotifications'
const { estado, mensaje, carpeta, guardando, ultimaConfirmacion, candidatoMigracion, bloqueoPestana } = useDiskStorage()
const { reemplazarDatos } = useAutoService()
const { restaurarBackup, copiaNubePendiente, ultimoBackupGoogleDrive, backupGoogleDrive } = useBackupSystem()
const { success, error } = useNotifications()
const mostrarDetalles = ref(false)
const driveActualizado = computed(() => {
  const fechaLocal = new Date(ultimaConfirmacion.value || '').getTime()
  const fechaDrive = new Date(ultimoBackupGoogleDrive.value || '').getTime()
  return backupGoogleDrive.value && !copiaNubePendiente.value &&
    Number.isFinite(fechaLocal) && Number.isFinite(fechaDrive) && fechaDrive >= fechaLocal
})
const drivePendiente = computed(() => copiaNubePendiente.value || Boolean(ultimoBackupGoogleDrive.value && !driveActualizado.value))
const estadoNormal = computed(() => estado.value === 'listo' && !guardando.value && !bloqueoPestana.value && driveActualizado.value)
const resumen = datos => `${datos.clientes.length} clientes, ${datos.vehiculos.length} vehículos, ${datos.servicios.length} servicios y ${datos.ordenes.length} órdenes`
const recargar = () => { if (!guardando.value) window.location.reload() }
const migrar = async () => {
  if (!confirm(`¿Migrar al disco ${resumen(candidatoMigracion.value)}? Se conserva la copia del navegador.`)) return
  try { await reemplazarDatos(candidatoMigracion.value, { action: 'migracion' }); success('Migración verificada en disco') }
  catch (err) { error(err.message, { persistent: true }) }
}
const importar = async event => {
  const file = event.target.files[0]
  if (file) { try { await restaurarBackup(file) } catch { /* El restaurador informa el error. */ } }
  event.target.value = ''
}
const nuevo = async () => {
  if (!confirm('¿Confirmás que es un taller nuevo y que NO tenés registros anteriores para recuperar?')) return
  try { await reemplazarDatos({ clientes: [], vehiculos: [], servicios: [], ordenes: [] }, { action: 'nuevo' }) }
  catch (err) { error(err.message, { persistent: true }) }
}
</script>
