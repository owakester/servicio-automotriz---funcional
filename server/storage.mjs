import { DatabaseSync } from 'node:sqlite'
import { mkdirSync, existsSync, writeFileSync, renameSync, readFileSync, readdirSync, unlinkSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { homedir } from 'node:os'
import { createHash } from 'node:crypto'
import { analizarIntegridadDatos } from '../src/utils/dataIntegrity.js'

export const contarDatos = datos => Object.fromEntries(['clientes', 'vehiculos', 'servicios', 'ordenes'].map(k => [k, datos[k].length]))
const total = datos => Object.values(contarDatos(datos)).reduce((a, b) => a + b, 0)
const hash = contenido => createHash('sha256').update(contenido).digest('hex')
const fallo = (message, status = 400) => Object.assign(new Error(message), { status })

export const directorioDatos = () => resolve(process.env.BRABUS_DATA_DIR || join(process.env.LOCALAPPDATA || join(homedir(), '.local', 'share'), 'BrabusService'))

export function abrirAlmacenamiento(directory = directorioDatos()) {
  directory = resolve(directory)
  mkdirSync(directory, { recursive: true })
  const archivo = join(directory, 'taller.sqlite')
  // Si desapareció la base pero quedan respaldos, NO crear un taller vacío.
  const backupsDir = join(directory, 'backups')
  let respaldos = []
  let carpetaCopiasInaccesible = false
  try { mkdirSync(backupsDir, { recursive: true }); respaldos = readdirSync(backupsDir) }
  catch { carpetaCopiasInaccesible = true } // SQLite puede seguir disponible.
  const hayRespaldos = respaldos.some(n => /^backup-taller-.*\.json$/.test(n))
  const mayorRevisionRespaldada = respaldos.reduce((maximo, nombre) => {
    const revision = Number(nombre.match(/^backup-taller-.*-r(\d+)\.json$/)?.[1])
    return Number.isSafeInteger(revision) ? Math.max(maximo, revision) : maximo
  }, 0)
  const nombreCopia = estado => `backup-taller-${estado.fecha.replace(/[:.]/g, '-')}-r${estado.revision}.json`
  const advertenciaCopia = 'El registro quedó guardado en SQLite, pero falta la copia JSON local del último cambio. Revisá el espacio en disco y creá un backup externo.'
  const db = new DatabaseSync(archivo)
  db.exec(`PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; PRAGMA busy_timeout=5000;
    CREATE TABLE IF NOT EXISTS estado (id INTEGER PRIMARY KEY CHECK(id=1), revision INTEGER NOT NULL, fecha TEXT NOT NULL, contenido TEXT NOT NULL, checksum TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS historial (revision INTEGER PRIMARY KEY, fecha TEXT NOT NULL, accion TEXT NOT NULL, contenido TEXT NOT NULL, checksum TEXT NOT NULL);`)

  const leer = () => {
    const row = db.prepare('SELECT * FROM estado WHERE id=1').get()
    if (!row) return { initialized: false, revision: 0, datos: null, directory, recoveryRequired: hayRespaldos || carpetaCopiasInaccesible }
    if (hash(row.contenido) !== row.checksum) throw fallo('La base local no pasó la verificación. No se reemplazó por datos vacíos; restaurá una copia.', 503)
    const datos = JSON.parse(row.contenido)
    if (analizarIntegridadDatos(datos).length) throw fallo('La base local tiene relaciones inválidas. Conservá sus archivos y recuperá un backup.', 503)
    const resultado = { initialized: true, revision: row.revision, fecha: row.fecha, datos, counts: contarDatos(datos), directory }
    if (!existsSync(join(backupsDir, nombreCopia(resultado)))) resultado.backupWarning = advertenciaCopia
    return resultado
  }

  const escribirCopia = (estado) => {
    const nombre = nombreCopia(estado)
    const destino = join(backupsDir, nombre)
    const contenido = JSON.stringify({ version: '1.0', fecha: estado.fecha, datos: estado.datos, estadisticas: estado.counts, metadata: { revisionDisco: estado.revision } }, null, 2)
    writeFileSync(`${destino}.tmp`, contenido, { encoding: 'utf8', flag: 'wx', flush: true })
    if (readFileSync(`${destino}.tmp`, 'utf8') !== contenido) throw Error('No se pudo verificar la copia local')
    renameSync(`${destino}.tmp`, destino)
    // 50 cambios recientes + una copia por día de los últimos 30 días.
    // Una lista cerrada de nombres evita tocar archivos ajenos a esta aplicación.
    const nombres = readdirSync(backupsDir).filter(n => /^backup-taller-\d{4}-\d{2}-\d{2}T[\d-]+Z-r\d+\.json$/.test(n))
      .sort((a, b) => Number(b.match(/-r(\d+)\.json$/)[1]) - Number(a.match(/-r(\d+)\.json$/)[1]))
    const conservar = new Set(nombres.slice(0, 50))
    const dias = new Set()
    for (const nombre of nombres) {
      const dia = nombre.slice(14, 24)
      if (!dias.has(dia) && dias.size < 30) { dias.add(dia); conservar.add(nombre) }
    }
    for (const nombre of nombres) if (!conservar.has(nombre)) unlinkSync(join(backupsDir, nombre))
  }

  const guardar = ({ datos, expectedRevision, action = 'guardar', confirmEmpty = false }) => {
    if (!Number.isSafeInteger(expectedRevision) || expectedRevision < 0) throw fallo('Falta una revisión válida del guardado')
    const errores = analizarIntegridadDatos(datos)
    if (errores.length) throw fallo(`Datos inválidos: ${errores.slice(0, 3).join(' ')}`)
    const contenido = JSON.stringify(datos)
    const checksum = hash(contenido)
    db.exec('BEGIN IMMEDIATE')
    try {
      const previo = leer()
      if (previo.revision !== expectedRevision) throw fallo('Los datos cambiaron en otra pestaña. Recargá antes de guardar; no se sobrescribió ningún registro.', 409)
      if (!previo.initialized && !['migracion', 'restauracion', 'nuevo'].includes(action)) throw fallo('Primero importá los datos existentes o confirmá un taller nuevo.', 409)
      if (action === 'nuevo' && (previo.initialized || previo.recoveryRequired || total(datos))) throw fallo('No se puede crear un taller nuevo sobre información existente.', 409)
      if (action === 'restauracion' && !total(datos) && !confirmEmpty) throw fallo('La copia está vacía. Hace falta confirmar explícitamente el reemplazo por cero registros.')
      // Una recuperación de una base perdida no reinicia la numeración de las
      // copias: así la rotación conserva también el estado recién restaurado.
      const revision = Math.max(previo.revision, mayorRevisionRespaldada) + 1
      const fecha = new Date().toISOString()
      db.prepare('INSERT INTO historial (revision,fecha,accion,contenido,checksum) VALUES (?,?,?,?,?)').run(revision, fecha, action, contenido, checksum)
      db.prepare('INSERT INTO estado (id,revision,fecha,contenido,checksum) VALUES (1,?,?,?,?) ON CONFLICT(id) DO UPDATE SET revision=excluded.revision,fecha=excluded.fecha,contenido=excluded.contenido,checksum=excluded.checksum').run(revision, fecha, contenido, checksum)
      db.prepare('DELETE FROM historial WHERE revision <= ?').run(revision - 200)
      db.exec('COMMIT')
      const verificado = leer()
      if (verificado.revision !== revision || JSON.stringify(verificado.datos) !== contenido) throw fallo('No se pudo confirmar el guardado. Recargá y verificá los registros antes de repetir la operación.', 503)
      try { escribirCopia(verificado); delete verificado.backupWarning }
      catch { verificado.backupWarning = advertenciaCopia }
      return verificado
    } catch (error) {
      try { db.exec('ROLLBACK') } catch { /* Puede haber fallado la lectura posterior al COMMIT. */ }
      throw error
    }
  }
  return { leer, guardar, close: () => db.close(), directory, archivo }
}
