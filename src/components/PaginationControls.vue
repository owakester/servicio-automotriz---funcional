<template>
  <div class="flex flex-col sm:flex-row items-center justify-between space-y-4 sm:space-y-0">
    <!-- Información de paginación -->
    <div class="text-sm text-gray-700">
      Mostrando 
      <span class="font-medium">{{ paginationInfo.start }}</span>
      a 
      <span class="font-medium">{{ paginationInfo.end }}</span>
      de 
      <span class="font-medium">{{ paginationInfo.total }}</span>
      resultados
    </div>
    
    <!-- Controles de paginación -->
    <div class="flex items-center space-x-2">
      <!-- Items por página -->
      <div class="flex items-center space-x-2 mr-4">
        <label class="text-sm text-gray-700">Mostrar:</label>
        <select
          :value="itemsPerPage"
          @change="$emit('update:itemsPerPage', parseInt($event.target.value))"
          class="px-3 py-1 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option :value="5">5</option>
          <option :value="10">10</option>
          <option :value="20">20</option>
          <option :value="50">50</option>
          <option :value="100">100</option>
        </select>
      </div>
      
      <!-- Botones de navegación -->
      <nav class="flex items-center space-x-1">
        <!-- Primera página -->
        <button
          @click="firstPage"
          :disabled="currentPage === 1"
          :class="[
            'p-2 rounded-lg transition-colors',
            currentPage === 1
              ? 'text-gray-300 cursor-not-allowed'
              : 'text-gray-600 hover:bg-gray-100'
          ]"
          :aria-label="'Primera página'"
        >
          <ChevronFirst class="h-4 w-4" />
        </button>
        
        <!-- Página anterior -->
        <button
          @click="prevPage"
          :disabled="currentPage === 1"
          :class="[
            'p-2 rounded-lg transition-colors',
            currentPage === 1
              ? 'text-gray-300 cursor-not-allowed'
              : 'text-gray-600 hover:bg-gray-100'
          ]"
          :aria-label="'Página anterior'"
        >
          <ChevronLeft class="h-4 w-4" />
        </button>
        
        <!-- Números de página -->
        <div class="hidden sm:flex items-center space-x-1">
          <!-- Puntos suspensivos al inicio -->
          <span
            v-if="pageRange[0] > 1"
            class="px-3 py-2 text-gray-500"
          >
            ...
          </span>
          
          <!-- Páginas -->
          <button
            v-for="page in pageRange"
            :key="page"
            @click="goToPage(page)"
            :class="[
              'px-3 py-1 rounded-lg text-sm font-medium transition-colors',
              page === currentPage
                ? 'bg-primary-600 text-white'
                : 'text-gray-700 hover:bg-gray-100'
            ]"
            :aria-label="`Página ${page}`"
            :aria-current="page === currentPage ? 'page' : undefined"
          >
            {{ page }}
          </button>
          
          <!-- Puntos suspensivos al final -->
          <span
            v-if="pageRange[pageRange.length - 1] < totalPages"
            class="px-3 py-2 text-gray-500"
          >
            ...
          </span>
        </div>
        
        <!-- Indicador móvil -->
        <div class="sm:hidden px-3 py-1 text-sm text-gray-700">
          {{ currentPage }} / {{ totalPages }}
        </div>
        
        <!-- Página siguiente -->
        <button
          @click="nextPage"
          :disabled="currentPage === totalPages"
          :class="[
            'p-2 rounded-lg transition-colors',
            currentPage === totalPages
              ? 'text-gray-300 cursor-not-allowed'
              : 'text-gray-600 hover:bg-gray-100'
          ]"
          :aria-label="'Página siguiente'"
        >
          <ChevronRight class="h-4 w-4" />
        </button>
        
        <!-- Última página -->
        <button
          @click="lastPage"
          :disabled="currentPage === totalPages"
          :class="[
            'p-2 rounded-lg transition-colors',
            currentPage === totalPages
              ? 'text-gray-300 cursor-not-allowed'
              : 'text-gray-600 hover:bg-gray-100'
          ]"
          :aria-label="'Última página'"
        >
          <ChevronLast class="h-4 w-4" />
        </button>
      </nav>
    </div>
  </div>
</template>

<script setup>
import { ChevronLeft, ChevronRight, ChevronFirst, ChevronLast } from 'lucide-vue-next'

defineProps({
  currentPage: {
    type: Number,
    required: true
  },
  totalPages: {
    type: Number,
    required: true
  },
  itemsPerPage: {
    type: Number,
    required: true
  },
  paginationInfo: {
    type: Object,
    required: true
  },
  pageRange: {
    type: Array,
    required: true
  },
  goToPage: {
    type: Function,
    required: true
  },
  nextPage: {
    type: Function,
    required: true
  },
  prevPage: {
    type: Function,
    required: true
  },
  firstPage: {
    type: Function,
    required: true
  },
  lastPage: {
    type: Function,
    required: true
  }
})

defineEmits(['update:itemsPerPage'])
</script>
