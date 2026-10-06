<template>
  <div class="space-y-6 print:space-y-4">
    <header class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
      <div>
        <p class="text-sm font-semibold text-primary-700 mb-1">Guía de uso</p>
        <h1 class="text-3xl font-bold text-gray-900">Cómo usar ServiceCar</h1>
        <p class="text-gray-600 mt-2 max-w-3xl">
          Esta guía explica el trabajo diario del taller paso a paso. No necesitás conocimientos técnicos.
        </p>
      </div>
      <button type="button" class="btn-secondary inline-flex items-center print:hidden" @click="imprimirGuia">
        <Printer class="h-4 w-4 mr-2" aria-hidden="true" />
        Imprimir guía
      </button>
    </header>

    <section class="card border border-amber-200 bg-amber-50" aria-labelledby="important-title">
      <div class="flex items-start gap-3">
        <AlertTriangle class="h-6 w-6 text-amber-600 flex-shrink-0" aria-hidden="true" />
        <div>
          <h2 id="important-title" class="text-lg font-semibold text-amber-900">Antes de empezar</h2>
          <ul class="mt-2 space-y-1 text-sm text-amber-900 list-disc pl-5">
            <li>Usá siempre la misma computadora y el mismo navegador.</li>
            <li>Mantené una sola pestaña del programa abierta.</li>
            <li>No borres los datos del navegador ni uses el modo incógnito.</li>
            <li>Conectá Google Drive o descargá una copia externa con frecuencia.</li>
          </ul>
        </div>
      </div>
    </section>

    <section class="card" aria-labelledby="daily-flow-title">
      <h2 id="daily-flow-title" class="text-xl font-semibold text-gray-900 mb-2">Circuito recomendado</h2>
      <p class="text-gray-600 mb-5">Para que la información quede relacionada correctamente, seguí este orden:</p>
      <ol class="grid grid-cols-1 md:grid-cols-4 gap-4">
        <li v-for="paso in pasos" :key="paso.numero" class="rounded-lg border border-gray-200 p-4">
          <span class="inline-flex items-center justify-center w-8 h-8 rounded-full bg-primary-100 text-primary-700 font-bold">
            {{ paso.numero }}
          </span>
          <h3 class="font-semibold text-gray-900 mt-3">{{ paso.titulo }}</h3>
          <p class="text-sm text-gray-600 mt-1">{{ paso.descripcion }}</p>
          <router-link :to="paso.ruta" class="text-sm text-primary-700 hover:text-primary-800 font-medium inline-block mt-3 print:hidden">
            Ir a {{ paso.titulo }}
          </router-link>
        </li>
      </ol>
    </section>

    <section class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <article class="card">
        <div class="flex items-center gap-2 mb-3">
          <Users class="h-5 w-5 text-primary-600" aria-hidden="true" />
          <h2 class="text-xl font-semibold text-gray-900">1. Clientes</h2>
        </div>
        <ol class="list-decimal pl-5 space-y-2 text-gray-700">
          <li>Entrá en <strong>Clientes</strong> y seleccioná <strong>Nuevo Cliente</strong>.</li>
          <li>Completá nombre, email y teléfono.</li>
          <li>Presioná <strong>Crear</strong>.</li>
          <li>Usá Editar para corregir información o WhatsApp para comunicarte.</li>
        </ol>
        <p class="mt-4 text-sm text-gray-600">No se puede eliminar un cliente mientras tenga vehículos asociados.</p>
      </article>

      <article class="card">
        <div class="flex items-center gap-2 mb-3">
          <Car class="h-5 w-5 text-primary-600" aria-hidden="true" />
          <h2 class="text-xl font-semibold text-gray-900">2. Vehículos</h2>
        </div>
        <ol class="list-decimal pl-5 space-y-2 text-gray-700">
          <li>Primero asegurate de que el dueño esté registrado.</li>
          <li>Entrá en <strong>Vehículos</strong> y seleccioná <strong>Nuevo Vehículo</strong>.</li>
          <li>Elegí el cliente y completá patente, marca, modelo y año.</li>
          <li>La patente debe tener formato <strong>ABC123</strong> o <strong>AB123CD</strong>.</li>
        </ol>
        <p class="mt-4 text-sm text-gray-600">Un vehículo con servicios u órdenes no puede eliminarse por error.</p>
      </article>

      <article class="card">
        <div class="flex items-center gap-2 mb-3">
          <ClipboardList class="h-5 w-5 text-primary-600" aria-hidden="true" />
          <h2 class="text-xl font-semibold text-gray-900">3. Órdenes</h2>
        </div>
        <p class="text-gray-700 mb-3">La orden representa el trabajo que ingresa al taller.</p>
        <ol class="list-decimal pl-5 space-y-2 text-gray-700">
          <li>Entrá en <strong>Órdenes</strong> y seleccioná <strong>Nueva Orden</strong>.</li>
          <li>Elegí el vehículo; el cliente se completa automáticamente.</li>
          <li>Describí claramente el trabajo solicitado.</li>
          <li>Actualizá el estado: Pendiente, En proceso o Completada.</li>
        </ol>
      </article>

      <article class="card">
        <div class="flex items-center gap-2 mb-3">
          <Wrench class="h-5 w-5 text-primary-600" aria-hidden="true" />
          <h2 class="text-xl font-semibold text-gray-900">4. Servicios</h2>
        </div>
        <p class="text-gray-700 mb-3">El servicio registra el trabajo realizado y conserva el historial mecánico.</p>
        <ol class="list-decimal pl-5 space-y-2 text-gray-700">
          <li>Entrá en <strong>Servicios</strong> y seleccioná <strong>Nuevo Servicio</strong>.</li>
          <li>Elegí vehículo, tipo de trabajo, fecha, estado y costo final.</li>
          <li>Agregá kilometraje, observaciones y próximo servicio.</li>
          <li>En mantenimiento general, la próxima fecha se propone automáticamente.</li>
        </ol>
      </article>
    </section>

    <section class="card" aria-labelledby="difference-title">
      <h2 id="difference-title" class="text-xl font-semibold text-gray-900 mb-3">Diferencia entre orden y servicio</h2>
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-4 py-3 text-left text-sm font-semibold text-gray-700">Orden</th>
              <th class="px-4 py-3 text-left text-sm font-semibold text-gray-700">Servicio</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200">
            <tr>
              <td class="px-4 py-3 text-sm text-gray-700">Se crea cuando el vehículo ingresa o se programa el trabajo.</td>
              <td class="px-4 py-3 text-sm text-gray-700">Se registra cuando se realiza el trabajo.</td>
            </tr>
            <tr>
              <td class="px-4 py-3 text-sm text-gray-700">Contiene prioridad, presupuesto y vencimiento.</td>
              <td class="px-4 py-3 text-sm text-gray-700">Contiene costo final, kilometraje e historial.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <section class="card" aria-labelledby="backup-title">
      <div class="flex items-center gap-2 mb-3">
        <ShieldCheck class="h-5 w-5 text-green-600" aria-hidden="true" />
        <h2 id="backup-title" class="text-xl font-semibold text-gray-900">Cómo cuidar la información</h2>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div>
          <h3 class="font-semibold text-gray-900">Protección automática local</h3>
          <p class="text-sm text-gray-600 mt-1">El programa conserva hasta tres copias dentro del navegador y recupera la última válida cuando es necesario.</p>
        </div>
        <div>
          <h3 class="font-semibold text-gray-900">Copia externa</h3>
          <p class="text-sm text-gray-600 mt-1">La copia local no protege frente a una pérdida o rotura de la computadora. Conectá Drive o descargá un backup.</p>
        </div>
      </div>
      <router-link to="/configuracion" class="btn-primary inline-flex items-center mt-5 print:hidden">
        <Settings class="h-4 w-4 mr-2" aria-hidden="true" />
        Ir a Configuración
      </router-link>
    </section>

    <section class="card" aria-labelledby="routine-title">
      <h2 id="routine-title" class="text-xl font-semibold text-gray-900 mb-3">Rutina simple recomendada</h2>
      <ul class="space-y-3 text-gray-700">
        <li class="flex items-start gap-3"><CheckCircle class="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" aria-hidden="true" /><span><strong>Todos los días:</strong> revisá las órdenes pendientes y actualizá su estado.</span></li>
        <li class="flex items-start gap-3"><CheckCircle class="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" aria-hidden="true" /><span><strong>Al terminar un trabajo:</strong> registrá servicio, costo y kilometraje.</span></li>
        <li class="flex items-start gap-3"><CheckCircle class="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" aria-hidden="true" /><span><strong>Una vez por semana:</strong> comprobá que exista una copia externa reciente.</span></li>
      </ul>
    </section>

    <section class="card" aria-labelledby="problems-title">
      <h2 id="problems-title" class="text-xl font-semibold text-gray-900 mb-3">Si algo no funciona</h2>
      <div class="space-y-3">
        <details v-for="consulta in consultas" :key="consulta.pregunta" class="rounded-lg border border-gray-200 p-4">
          <summary class="font-medium text-gray-900 cursor-pointer">{{ consulta.pregunta }}</summary>
          <p class="text-sm text-gray-600 mt-2">{{ consulta.respuesta }}</p>
        </details>
      </div>
    </section>
  </div>
</template>

<script setup>
import { AlertTriangle, Car, CheckCircle, ClipboardList, Printer, Settings, ShieldCheck, Users, Wrench } from 'lucide-vue-next'

const pasos = [
  { numero: 1, titulo: 'Clientes', descripcion: 'Registrá los datos de contacto del dueño.', ruta: '/clientes' },
  { numero: 2, titulo: 'Vehículos', descripcion: 'Asociá cada vehículo con su dueño.', ruta: '/vehiculos' },
  { numero: 3, titulo: 'Órdenes', descripcion: 'Organizá el trabajo que ingresa al taller.', ruta: '/ordenes' },
  { numero: 4, titulo: 'Servicios', descripcion: 'Guardá el trabajo realizado y su costo final.', ruta: '/servicios' }
]

const consultas = [
  { pregunta: 'No puedo crear un vehículo, orden o servicio', respuesta: 'Revisá el orden: primero cliente, después vehículo y finalmente orden o servicio.' },
  { pregunta: 'Google Drive aparece desconectado', respuesta: 'Entrá en Configuración, presioná Conectar e iniciá sesión nuevamente.' },
  { pregunta: 'El programa recuperó información automáticamente', respuesta: 'Revisá los datos recuperados y creá una copia externa desde Configuración.' },
  { pregunta: 'Voy a cambiar de computadora', respuesta: 'Descargá un backup y, en la nueva computadora, usá Importar backup desde archivo.' }
]

const imprimirGuia = () => window.print()
</script>
