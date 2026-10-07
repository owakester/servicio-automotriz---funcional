import { ref, computed } from 'vue'
import { esDniCuilValido } from '../utils/clientIdentity'

export const useFormValidation = () => {
  const errors = ref({})

  const validateRequired = (value, fieldName) => {
    if (!value || (typeof value === 'string' && value.trim() === '')) {
      errors.value[fieldName] = `${fieldName} es requerido`
      return false
    }
    delete errors.value[fieldName]
    return true
  }

  const validateEmail = (email, fieldName = 'email') => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (email && !emailRegex.test(email)) {
      errors.value[fieldName] = 'Formato de email inválido'
      return false
    }
    delete errors.value[fieldName]
    return true
  }

  const validatePhone = (phone, fieldName = 'telefono') => {
    const phoneRegex = /^[\d\s\-\+\(\)]+$/
    if (phone && !phoneRegex.test(phone)) {
      errors.value[fieldName] = 'Formato de teléfono inválido'
      return false
    }
    delete errors.value[fieldName]
    return true
  }

  const validateDniCuil = (value, fieldName = 'dniCuil') => {
    if (!esDniCuilValido(value)) {
      errors.value[fieldName] = 'Ingresá un DNI de 7 u 8 dígitos o un CUIL de 11 dígitos'
      return false
    }
    delete errors.value[fieldName]
    return true
  }

  const validatePatente = (patente, fieldName = 'patente') => {
    // Formato argentino: ABC123 o AB123CD
    const patenteRegex = /^[A-Z]{2,3}\d{3}[A-Z]{0,2}$/
    if (patente && !patenteRegex.test(patente.toUpperCase())) {
      errors.value[fieldName] = 'Formato de patente inválido (ej: ABC123)'
      return false
    }
    delete errors.value[fieldName]
    return true
  }

  const validateYear = (year, fieldName = 'anio') => {
    const currentYear = new Date().getFullYear()
    const numYear = parseInt(year)
    if (year && (numYear < 1900 || numYear > currentYear + 1)) {
      errors.value[fieldName] = `Año debe estar entre 1900 y ${currentYear + 1}`
      return false
    }
    delete errors.value[fieldName]
    return true
  }

  const validatePositiveNumber = (value, fieldName) => {
    const num = parseFloat(value)
    if (value && (isNaN(num) || num < 0)) {
      errors.value[fieldName] = 'Debe ser un número positivo'
      return false
    }
    delete errors.value[fieldName]
    return true
  }

  const validateDate = (date, fieldName) => {
    if (date && isNaN(Date.parse(date))) {
      errors.value[fieldName] = 'Formato de fecha inválido'
      return false
    }
    delete errors.value[fieldName]
    return true
  }

  const validateFutureDate = (date, fieldName) => {
    if (date) {
      const selectedDate = new Date(date)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      
      if (selectedDate < today) {
        errors.value[fieldName] = 'La fecha debe ser futura'
        return false
      }
    }
    delete errors.value[fieldName]
    return true
  }

  const clearErrors = () => {
    errors.value = {}
  }

  const hasErrors = computed(() => Object.keys(errors.value).length > 0)

  const getError = (fieldName) => errors.value[fieldName] || ''

  return {
    errors,
    hasErrors,
    validateRequired,
    validateEmail,
    validatePhone,
    validateDniCuil,
    validatePatente,
    validateYear,
    validatePositiveNumber,
    validateDate,
    validateFutureDate,
    clearErrors,
    getError
  }
}
