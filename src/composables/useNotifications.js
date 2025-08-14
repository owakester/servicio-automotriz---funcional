import { ref, computed } from 'vue'

const notifications = ref([])
const notificationHistory = ref(JSON.parse(localStorage.getItem('notificationHistory') || '[]'))

export const useNotifications = () => {
  const addNotification = (notification) => {
    const newNotification = {
      id: Date.now(),
      timestamp: new Date().toISOString(),
      ...notification
    }
    
    notifications.value.push(newNotification)
    
    // Guardar en historial si es importante
    if (notification.type === 'error' || notification.persistent) {
      notificationHistory.value.unshift(newNotification)
      // Mantener solo los últimos 50
      if (notificationHistory.value.length > 50) {
        notificationHistory.value = notificationHistory.value.slice(0, 50)
      }
      localStorage.setItem('notificationHistory', JSON.stringify(notificationHistory.value))
    }
    
    // Auto-eliminar después de 5 segundos si no es persistente
    if (!notification.persistent) {
      setTimeout(() => {
        removeNotification(newNotification.id)
      }, notification.duration || 5000)
    }
  }

  const removeNotification = (id) => {
    const index = notifications.value.findIndex(n => n.id === id)
    if (index > -1) {
      notifications.value.splice(index, 1)
    }
  }

  const clearHistory = () => {
    notificationHistory.value = []
    localStorage.removeItem('notificationHistory')
  }

  const success = (message, options = {}) => {
    addNotification({
      type: 'success',
      message,
      ...options
    })
  }

  const error = (message, options = {}) => {
    addNotification({
      type: 'error',
      message,
      persistent: true,
      ...options
    })
  }

  const warning = (message, options = {}) => {
    addNotification({
      type: 'warning',
      message,
      ...options
    })
  }

  const info = (message, options = {}) => {
    addNotification({
      type: 'info',
      message,
      ...options
    })
  }

  // Notificaciones no leídas
  const unreadCount = computed(() => {
    const lastRead = localStorage.getItem('lastNotificationRead')
    if (!lastRead) return notificationHistory.value.length
    
    return notificationHistory.value.filter(n => 
      new Date(n.timestamp) > new Date(lastRead)
    ).length
  })

  const markAllAsRead = () => {
    localStorage.setItem('lastNotificationRead', new Date().toISOString())
  }

  return {
    notifications,
    notificationHistory,
    unreadCount,
    success,
    error,
    warning,
    info,
    removeNotification,
    clearHistory,
    markAllAsRead
  }
}
