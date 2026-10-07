import { computed, ref } from 'vue'
import { useAutoService } from './useAutoService'
import { useFechaActual } from './useFechaActual'
import { useNotifications } from './useNotifications'

export const CLAVE_ULTIMO_RECORDATORIO = 'autoservice_ultimo_recordatorio_servicios'
const CLAVE_ACTIVADO = 'autoservice_recordatorios_activados'
const leerSeguro = (clave) => {
  try { return localStorage.getItem(clave) } catch { return null }
}
const guardarSeguro = (clave, valor) => {
  try { localStorage.setItem(clave, valor) } catch { /* Sigue funcionando en esta sesión. */ }
}

const panelAbierto = ref(false)
const recordatoriosActivados = ref(leerSeguro(CLAVE_ACTIVADO) !== 'false')
let ultimoDiaNotificado = null

export const useRecordatoriosServicios = () => {
  const { datosListos, vehiculosConAlertas } = useAutoService()
  const { fechaActual } = useFechaActual()
  const { warning, notifications, removeNotification } = useNotifications()

  // Reutilizar las fechas y reglas del Dashboard; un recordatorio por vehículo.
  const recordatorios = computed(() => vehiculosConAlertas.value
    .filter(v => v.alerta?.tipo === 'vencido' || v.alerta?.tipo === 'urgente')
    .map(v => ({ ...v, diasRestantes: v.alerta.tipo === 'vencido' ? -v.alerta.dias : v.alerta.dias }))
    .sort((a, b) => a.diasRestantes - b.diasRestantes))

  const resumen = computed(() => ({
    vencidos: recordatorios.value.filter(v => v.diasRestantes < 0).length,
    hoy: recordatorios.value.filter(v => v.diasRestantes === 0).length,
    proximos: recordatorios.value.filter(v => v.diasRestantes > 0).length
  }))

  const mostrarResumenDiario = () => {
    if (!datosListos.value) return false
    if (!recordatorios.value.length) {
      notifications.value.filter(n => n.action === 'recordatorios-servicios')
        .forEach(n => removeNotification(n.id))
      return false
    }
    if (!recordatoriosActivados.value) return false
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return false
    const dia = fechaActual.value
    const { vencidos, hoy, proximos } = resumen.value
    const mensaje = `Recordatorio de servicios: ${vencidos} vencidos · ${hoy} para hoy · ${proximos} en los próximos 7 días.`
    if (ultimoDiaNotificado === dia || leerSeguro(CLAVE_ULTIMO_RECORDATORIO) === dia) {
      // Si sigue abierto el aviso de hoy, mantener sus cifras actualizadas.
      notifications.value.filter(n => n.action === 'recordatorios-servicios')
        .forEach(n => { n.message = mensaje })
      return false
    }
    // Reemplazar el resumen anterior si la aplicación permaneció abierta varios días.
    notifications.value.filter(n => n.action === 'recordatorios-servicios')
      .forEach(n => removeNotification(n.id))
    warning(mensaje, {
      persistent: true,
      action: 'recordatorios-servicios'
    })
    ultimoDiaNotificado = dia
    guardarSeguro(CLAVE_ULTIMO_RECORDATORIO, dia)
    return true
  }

  const configurarRecordatorios = (activados) => {
    recordatoriosActivados.value = Boolean(activados)
    guardarSeguro(CLAVE_ACTIVADO, String(recordatoriosActivados.value))
    if (activados) mostrarResumenDiario()
    else notifications.value.filter(n => n.action === 'recordatorios-servicios')
      .forEach(n => removeNotification(n.id))
  }

  return {
    datosListos, fechaActual, recordatorios, resumen, panelAbierto, recordatoriosActivados,
    mostrarResumenDiario, configurarRecordatorios,
    abrirRecordatorios: () => { panelAbierto.value = true },
    cerrarRecordatorios: () => { panelAbierto.value = false }
  }
}
