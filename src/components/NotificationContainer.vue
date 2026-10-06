<template>
  <Teleport to="body">
  <div class="notification-region">
    <TransitionGroup name="notification" tag="div" class="notification-list">
      <div
        v-for="notification in notifications"
        :key="notification.id"
        :role="notification.type === 'error' ? 'alert' : 'status'"
        :aria-live="notification.type === 'error' ? 'assertive' : 'polite'"
        :class="[
          'w-full min-w-0 bg-white shadow-lg rounded-lg pointer-events-auto flex ring-1 ring-black ring-opacity-5',
          getNotificationClasses(notification.type)
        ]"
      >
        <div class="flex-1 min-w-0 p-4">
          <div class="flex items-start">
            <div class="flex-shrink-0">
              <component 
                :is="getIcon(notification.type)" 
                :class="['h-5 w-5', getIconClasses(notification.type)]" 
                aria-hidden="true"
              />
            </div>
            <div class="ml-3 min-w-0 flex-1">
              <p class="notification-message text-sm font-medium text-gray-900">
                {{ notification.message }}
              </p>
            </div>
            <div class="ml-4 flex-shrink-0 flex">
              <button
                type="button"
                @click="removeNotification(notification.id)"
                class="bg-white rounded-md inline-flex p-1 text-gray-500 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                aria-label="Cerrar notificación"
              >
                <X class="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </TransitionGroup>
  </div>
  </Teleport>
</template>

<script setup>
import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-vue-next'
import { useNotifications } from '../composables/useNotifications'

const { notifications, removeNotification } = useNotifications()

const getIcon = (type) => {
  const icons = {
    success: CheckCircle,
    error: XCircle,
    warning: AlertCircle,
    info: Info
  }
  return icons[type] || Info
}

const getIconClasses = (type) => {
  const classes = {
    success: 'text-green-400',
    error: 'text-red-400',
    warning: 'text-yellow-400',
    info: 'text-blue-400'
  }
  return classes[type] || 'text-blue-400'
}

const getNotificationClasses = (type) => {
  const classes = {
    success: 'border-l-4 border-green-400',
    error: 'border-l-4 border-red-400',
    warning: 'border-l-4 border-yellow-400',
    info: 'border-l-4 border-blue-400'
  }
  return classes[type] || 'border-l-4 border-blue-400'
}
</script>

<style scoped>
.notification-region {
  position: fixed;
  top: 1rem;
  left: 50%;
  transform: translateX(-50%);
  width: calc(100% - 2rem);
  max-width: 32rem;
  z-index: 100;
  pointer-events: none;
}

.notification-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  max-height: calc(100dvh - 2rem);
  overflow-y: auto;
  padding: 0.25rem;
}

.notification-list > div {
  flex-shrink: 0;
}

.notification-message {
  overflow-wrap: anywhere;
  white-space: pre-line;
}

.notification-enter-active,
.notification-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.notification-enter-from,
.notification-leave-to {
  opacity: 0;
  transform: translateY(-0.5rem);
}

.notification-move {
  transition: transform 0.3s ease;
}

@media (prefers-reduced-motion: reduce) {
  .notification-enter-active,
  .notification-leave-active,
  .notification-move {
    transition: none;
  }
}
</style>
