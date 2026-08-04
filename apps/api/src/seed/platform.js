import { platformDb, ensureSuperAdmin } from '../lib/db.js'

// Crea la primera cuenta SUPER_ADMIN de plataforma. Las cuentas de
// plataforma no tienen roles/permisos en BD: su único permiso
// (company.manage) se estampa directo en el JWT al hacer login.
// El servidor ya llama a ensureSuperAdmin() solo al arrancar; este script
// queda para poder correrlo a mano cuando haga falta.
async function main() {
  await ensureSuperAdmin()
  console.log('SUPER ADMIN de plataforma listo 🚀')
}

main()
  .catch(console.error)
  .finally(() => platformDb.$disconnect())
