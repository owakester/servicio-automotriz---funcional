import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { build } from 'esbuild'
import { parse, compileScript } from '@vue/compiler-sfc'

// Renderiza el componente real con estados simulados. No abre bases de datos,
// no se conecta a Drive y no modifica información del taller.
const compiled = await build({
  stdin: { contents: "export {default as EstadoDisco} from './src/components/EstadoDisco.vue'; export {createRenderer, ref, nextTick} from 'vue'", resolveDir: process.cwd() },
  bundle: true, format: 'esm', platform: 'node', write: false,
  plugins: [{ name: 'storage-status-fixtures', setup(builder) {
    builder.onLoad({ filter: /EstadoDisco\.vue$/ }, ({ path }) => {
      const { descriptor } = parse(readFileSync(path, 'utf8'))
      return { contents: compileScript(descriptor, { id: 'storage-status-qa', inlineTemplate: true }).content, loader: 'js' }
    })
    builder.onResolve({ filter: /composables\/use(DiskStorage|AutoService|BackupSystem|Notifications)$/ }, ({ path }) => ({ path: path.split('/').at(-1), namespace: 'storage-qa' }))
    builder.onLoad({ filter: /.*/, namespace: 'storage-qa' }, ({ path }) => ({ contents: {
      useDiskStorage: 'export const usaDisco = true; export const useDiskStorage = () => globalThis.storageStatusQA.disk',
      useAutoService: 'export const useAutoService = () => ({ reemplazarDatos() { throw Error("No debe escribir durante esta prueba") } })',
      useBackupSystem: 'export const useBackupSystem = () => globalThis.storageStatusQA.backup',
      useNotifications: 'export const useNotifications = () => ({success() {}, error() {}})'
    }[path], loader: 'js' }))
  } }]
})
const { EstadoDisco, createRenderer, ref, nextTick } = await import(`data:text/javascript;base64,${Buffer.from(compiled.outputFiles[0].contents).toString('base64')}`)
const disk = {
  estado: ref('listo'), mensaje: ref('Guardado en disco verificado'), carpeta: ref('C:\\Datos-ficticios\\BrabusService'),
  guardando: ref(false), ultimaConfirmacion: ref('2026-10-28T12:00:00.000Z'), candidatoMigracion: ref(null), bloqueoPestana: ref(false)
}
const backup = { copiaNubePendiente: ref(false), ultimoBackupGoogleDrive: ref('2026-10-28T12:01:00.000Z'), backupGoogleDrive: ref(true) }
globalThis.storageStatusQA = { disk, backup }
const node = (type, text = '') => ({ type, text, props: {}, children: [], parent: null })
const remove = child => {
  if (child.parent) child.parent.children.splice(child.parent.children.indexOf(child), 1)
  child.parent = null
}
const { createApp } = createRenderer({
  createElement: type => node(type), createText: text => node('#text', text), createComment: () => node('#comment'),
  setText: (target, text) => { target.text = text },
  setElementText: (target, text) => { target.text = text; target.children = [] },
  patchProp: (target, key, previous, value) => { target.props[key] = value },
  insert(child, parent, anchor = null) {
    remove(child)
    const index = anchor ? parent.children.indexOf(anchor) : -1
    parent.children.splice(index < 0 ? parent.children.length : index, 0, child)
    child.parent = parent
  },
  remove, parentNode: child => child.parent,
  nextSibling: child => child.parent?.children[child.parent.children.indexOf(child) + 1] || null
})
const root = node('root'), app = createApp(EstadoDisco)
const text = target => target.text + target.children.map(text).join(' ')
const find = (target, predicate) => predicate(target) ? target : target.children.map(child => find(child, predicate)).find(Boolean)
const detailsButton = () => find(root, n => n.type === 'button' && n.props['aria-controls'] === 'detalles-guardado')
const panel = () => find(root, n => n.props.id === 'detalles-guardado')
let checks = 0
const check = async (name, fn) => { await fn(); checks++; console.log(`✓ ${name}`) }
try {
  app.mount(root)
  await check('el estado confirmado ocupa una línea y no expone carpeta ni fechas hasta abrir detalles', () => {
    assert.match(text(root), /Datos guardados · Drive actualizado/)
    assert.equal(panel(), undefined)
    assert.equal(detailsButton().props['aria-expanded'], false)
    assert.equal(find(root, n => n.type === 'section').props.role, 'status')
  })
  await check('Ver detalles y Ocultar detalles funcionan sin modificar el guardado', async () => {
    detailsButton().props.onClick(); await nextTick()
    assert.equal(detailsButton().props['aria-expanded'], true)
    assert.match(text(panel()), /Carpeta de datos y copias: C:\\Datos-ficticios/)
    assert.match(text(panel()), /Último guardado confirmado/)
    assert.match(text(panel()), /Última copia confirmada en Drive/)
    detailsButton().props.onClick(); await nextTick()
    assert.equal(panel(), undefined)
    assert.equal(disk.ultimaConfirmacion.value, '2026-10-28T12:00:00.000Z')
  })
  for (const [name, change, message, restore] of [
    ['guardado en curso', () => { disk.guardando.value = true }, /Guardando en disco/, () => { disk.guardando.value = false }],
    ['error de disco', () => { disk.estado.value = 'error'; disk.mensaje.value = 'No se confirmó el guardado' }, /No se confirmó el guardado/, () => { disk.estado.value = 'listo'; disk.mensaje.value = 'Guardado en disco verificado' }],
    ['advertencia de copia JSON', () => { disk.estado.value = 'advertencia'; disk.mensaje.value = 'Falta la copia JSON local' }, /Falta la copia JSON local/, () => { disk.estado.value = 'listo'; disk.mensaje.value = 'Guardado en disco verificado' }],
    ['pestaña duplicada', () => { disk.bloqueoPestana.value = true }, /Otra pestaña tiene la edición/, () => { disk.bloqueoPestana.value = false }],
    ['copia pendiente en Drive', () => { backup.copiaNubePendiente.value = true }, /Drive pendiente/, () => { backup.copiaNubePendiente.value = false }],
    ['Drive desactivado', () => { backup.backupGoogleDrive.value = false }, /respaldo de Drive está desactivado/, () => { backup.backupGoogleDrive.value = true }],
    ['primera migración', () => { disk.estado.value = 'migracion' }, /Importar una copia JSON existente/, () => { disk.estado.value = 'listo' }]
  ]) {
    await check(`${name}: el aviso completo aparece aunque los detalles estuvieran cerrados`, async () => {
      change(); await nextTick()
      assert.ok(panel())
      assert.equal(detailsButton(), undefined)
      assert.match(text(root), message)
      assert.doesNotMatch(text(root), /Drive actualizado/)
      restore(); await nextTick()
      assert.ok(detailsButton())
      assert.equal(panel(), undefined)
    })
  }
  await check('una fecha anterior, ausente o inválida de Drive nunca se presenta como actualizado', async () => {
    for (const date of ['2026-10-28T11:00:00.000Z', null, 'fecha-invalida']) {
      backup.ultimoBackupGoogleDrive.value = date; await nextTick()
      assert.ok(panel())
      assert.doesNotMatch(text(root), /Drive actualizado/)
      assert.match(text(root), date ? /Drive pendiente/ : /Drive todavía no tiene una copia confirmada/)
    }
  })
  console.log(`${checks}/${checks} pruebas del indicador de guardado superadas`)
} finally { app.unmount(); delete globalThis.storageStatusQA }
