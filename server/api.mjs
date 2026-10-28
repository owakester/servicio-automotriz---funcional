import { abrirAlmacenamiento } from './storage.mjs'

export function crearAPI({ directory } = {}) {
  let store
  let errorInicio
  try { store = abrirAlmacenamiento(directory) } catch { errorInicio = 'No se pudo abrir SQLite. Conservá la carpeta de datos; no se creó un taller vacío.' }
  const responder = (res, status, data) => {
    res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' })
    res.end(JSON.stringify(data))
  }
  const middleware = async (req, res, next) => {
    if (req.url?.split('?')[0] !== '/api/taller/state') return next()
    const host = req.headers.host || ''
    const remoto = req.socket.remoteAddress || ''
    if (!/^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(host) || !['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(remoto)) return responder(res, 403, { error: 'El almacenamiento solo se utiliza desde esta computadora.' })
    if (req.headers.origin && ![`http://${host}`, `https://${host}`].includes(req.headers.origin)) return responder(res, 403, { error: 'Origen no permitido' })
    if (errorInicio) return responder(res, 503, { error: errorInicio })
    try {
      if (req.method === 'GET') return responder(res, 200, store.leer())
      if (req.method !== 'PUT') return responder(res, 405, { error: 'Método no permitido' })
      if (req.headers['x-brabus-local'] !== '1' || !req.headers['content-type']?.startsWith('application/json')) return responder(res, 403, { error: 'Solicitud de guardado no permitida' })
      const chunks = []
      let bytes = 0
      for await (const chunk of req) {
        bytes += chunk.length
        if (bytes > 25 * 1024 * 1024) return responder(res, 413, { error: 'La copia supera el límite de 25 MB' })
        chunks.push(chunk)
      }
      return responder(res, 200, store.guardar(JSON.parse(Buffer.concat(chunks).toString('utf8'))))
    } catch (error) {
      // No exponer registros, rutas de SQL o datos del cliente en los errores.
      const status = error.status || (error instanceof SyntaxError ? 400 : 503)
      responder(res, status, { error: error.status ? error.message : 'No se pudo confirmar la operación en disco. Recargá y verificá los datos; no repitas el alta sin comprobarla.' })
    }
  }
  return { middleware, close: () => store?.close() }
}

export function almacenamientoLocalPlugin() {
  const instalar = server => {
    const api = crearAPI()
    server.middlewares.use(api.middleware)
    ;(server.httpServer || server).once?.('close', api.close)
  }
  return { name: 'brabus-sqlite-local', configureServer: instalar, configurePreviewServer: instalar }
}
