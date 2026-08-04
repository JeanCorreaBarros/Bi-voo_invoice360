import { platformDb, ensureAllTenantsMigrated } from '../lib/db.js'

// El servidor ya llama a ensureAllTenantsMigrated() en cada arranque; este
// script queda para poder correrlo a mano (ej. justo después de mergear un
// cambio al schema tenant, sin esperar al próximo redeploy).
async function main() {
  await ensureAllTenantsMigrated()
  console.log('Todas las empresas quedaron al día con el schema tenant 🚀')
}

main()
  .catch((err) => {
    console.error(err)
    process.exitCode = 1
  })
  .finally(() => platformDb.$disconnect())
