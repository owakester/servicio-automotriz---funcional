const [major, minor] = process.versions.node.split('.').map(Number)
if (major < 22 || major === 22 && minor < 13) {
  console.error('Brabus Service requiere Node.js 22.13 o superior para guardar los registros en SQLite. Actualizá Node antes de iniciar; no se modificaron tus datos.')
  process.exit(1)
}
