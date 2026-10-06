import assert from 'node:assert/strict'
import { build } from 'esbuild'

// No usa credenciales reales, navegador ni solicitudes a Google.
const expectedEmail = 'taller@example.com'
const storage = new Map()
globalThis.localStorage = {
  getItem: key => storage.get(key) ?? null,
  setItem: (key, value) => storage.set(key, String(value)),
  removeItem: key => storage.delete(key)
}
const originalSetTimeout = globalThis.setTimeout
globalThis.setTimeout = (...args) => {
  const timer = originalSetTimeout(...args)
  timer.unref()
  return timer
}
let apiToken = null
let tokenClient
let clientOptions
let nextEmail = expectedEmail
let profileOK = true
let profileThrows = false
let nextOAuthError = false
let deferOAuth = false
let deferProfile = false
let releaseProfile
let tokenNumber = 0
let requests = []
let fileCalls = 0
let fetchCalls = 0
globalThis.window = {
  gapi: {
    load: (_, options) => options.callback(),
    client: {
      init: async () => {},
      getToken: () => apiToken,
      setToken: token => { apiToken = token },
      drive: { files: {
        create: async () => { fileCalls++; return { result: { id: 'carpeta-simulada' } } },
        list: async () => { fileCalls++; return { result: { files: [] } } }
      } }
    }
  },
  google: { accounts: { oauth2: {
    initTokenClient(options) {
      clientOptions = options
      tokenClient = {
        ...options,
        requestAccessToken(config) {
          requests.push(config)
          if (deferOAuth) return
          const response = nextOAuthError ? { error: 'access_denied' } : { access_token: `token-simulado-${++tokenNumber}`, expires_in: 3600 }
          queueMicrotask(() => tokenClient.callback(response))
        }
      }
      return tokenClient
    },
    revoke() {}
  } } }
}
globalThis.fetch = async (url, options) => {
  fetchCalls++
  assert.equal(url, 'https://www.googleapis.com/drive/v3/about?fields=user(emailAddress)')
  assert.match(options.headers.Authorization, /^Bearer token-simulado-/)
  if (profileThrows) throw new Error('Fallo de red simulado')
  if (deferProfile) await new Promise(resolve => { releaseProfile = resolve })
  return { ok: profileOK, json: async () => ({ user: { emailAddress: nextEmail } }) }
}

const compiled = await build({
  stdin: { contents: "export { useGoogleDrive } from './src/composables/useGoogleDrive.js'", resolveDir: process.cwd() },
  bundle: true, format: 'esm', platform: 'node', write: false,
  define: {
    'import.meta.env.VITE_GOOGLE_CLIENT_ID': '"cliente-simulado"',
    'import.meta.env.VITE_GOOGLE_DRIVE_EMAIL': JSON.stringify(expectedEmail)
  }
})
const moduleUrl = `data:text/javascript;base64,${Buffer.from(compiled.outputFiles[0].contents).toString('base64')}`
const { useGoogleDrive } = await import(moduleUrl)
const drive = useGoogleDrive()
let checks = 0
const check = async (name, fn) => {
  await fn()
  checks++
  process.stdout.write(`✓ ${name}\n`)
}
const disconnected = () => {
  assert.equal(drive.estaAutenticado(), false)
  assert.equal(drive.isAuthenticated.value, false)
  assert.equal(drive.cuentaGoogleDrive.value, '')
  assert.equal(drive.currentAccessToken(), null)
  assert.equal(apiToken, null)
}
try {
  await check('sugiere la cuenta configurada sin ampliar los permisos de Drive', async () => {
    assert.equal(await drive.initializeGoogleDrive(), true)
    assert.equal(clientOptions.login_hint, expectedEmail)
    assert.equal(clientOptions.scope, 'https://www.googleapis.com/auth/drive.file')
  })
  await check('rechaza otra cuenta y bloquea creación de carpetas, backups y fotos', async () => {
    nextEmail = 'otra@example.com'
    assert.equal(await drive.authenticateUser(), false)
    assert.equal(requests.at(-1).login_hint, expectedEmail)
    disconnected()
    await assert.rejects(drive.crearCarpeta('No crear'), /cuenta de Google Drive/)
    assert.equal((await drive.subirBackupCompletoAGoogleDrive({ datos: {} }, 'no-subir.json')).success, false)
    assert.equal((await drive.subirImagen({ type: 'image/png', size: 1 }, 'OM-QA')).success, false)
    assert.equal(fileCalls, 0)
  })
  await check('acepta la cuenta correcta, normaliza mayúsculas y reutiliza la verificación', async () => {
    nextEmail = ' TALLER@EXAMPLE.COM '
    assert.equal(await drive.authenticateUser(), true)
    assert.equal(drive.estaAutenticado(), true)
    assert.equal(drive.cuentaGoogleDrive.value, expectedEmail)
    const before = fetchCalls
    assert.equal(await drive.asegurarTokenValido(), true)
    assert.equal(await drive.crearCarpeta('Permitida'), 'carpeta-simulada')
    assert.equal(fetchCalls, before)
  })
  await check('una renovación con otra cuenta no recupera el token anterior', async () => {
    const originalNow = Date.now
    const now = originalNow()
    Date.now = () => now + 56 * 60 * 1000
    nextEmail = 'otra@example.com'
    try {
      assert.equal(await drive.asegurarTokenValido(), false)
      disconnected()
    } finally { Date.now = originalNow }
  })
  await check('no adopta un token ajeno que aparezca en gapi', async () => {
    apiToken = { access_token: 'token-ajeno-no-verificado' }
    assert.equal(drive.estaAutenticado(), false)
    assert.equal(await drive.asegurarTokenValido(), false)
    disconnected()
  })
  await check('sin correo verificado, con error HTTP o sin red no habilita Drive', async () => {
    nextEmail = ''
    assert.equal(await drive.authenticateUser(), false)
    disconnected()
    profileOK = false
    assert.equal(await drive.authenticateUser(), false)
    disconnected()
    profileOK = true
    profileThrows = true
    assert.equal(await drive.authenticateUser(), false)
    disconnected()
    profileThrows = false
  })
  await check('una autorización denegada no habilita Drive', async () => {
    nextOAuthError = true
    assert.equal(await drive.authenticateUser(), false)
    disconnected()
    nextOAuthError = false
  })
  await check('dos conexiones simultáneas usan una sola solicitud OAuth', async () => {
    nextEmail = expectedEmail
    const before = requests.length
    assert.deepEqual(await Promise.all([drive.authenticateUser(), drive.authenticateUser()]), [true, true])
    assert.equal(requests.length, before + 1)
  })
  await check('cerrar sesión durante OAuth descarta una respuesta tardía', async () => {
    deferOAuth = true
    const pending = drive.authenticateUser()
    await new Promise(resolve => setImmediate(resolve))
    drive.cerrarSesion()
    await tokenClient.callback({ access_token: 'token-simulado-tardio', expires_in: 3600 })
    assert.equal(await pending, false)
    disconnected()
    deferOAuth = false
  })
  await check('cerrar sesión durante la verificación impide reconectar al terminar', async () => {
    deferProfile = true
    const pending = drive.authenticateUser()
    await new Promise(resolve => setImmediate(resolve))
    assert.equal(drive.estaAutenticado(), false)
    drive.cerrarSesion()
    releaseProfile()
    assert.equal(await pending, false)
    disconnected()
    deferProfile = false
  })
  process.stdout.write(`${checks}/${checks} pruebas de cuenta de Drive superadas\n`)
} catch (err) {
  console.error(`${err.name}: ${err.message}`)
  process.exitCode = 1
}
