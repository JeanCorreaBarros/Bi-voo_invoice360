import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { platformDb, getTenantClientByDbName } from '../lib/db.js'
import { seedTenantRolesAndPermissions } from '../seed/tenantRoles.js'
import { seedChartOfAccounts } from '../seed/chartOfAccounts.js'
import { seedAccountingSettings } from '../seed/accountingSettings.js'

// Aplica `prisma migrate deploy` del schema tenant contra la BD física de
// CADA empresa registrada en platform, y re-corre los seeds idempotentes
// (permisos + plan de cuentas) para que las empresas que ya existían
// reciban los permisos/cuentas nuevas agregadas después de su creación.
// Correr esto después de cualquier cambio al schema tenant.
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const TENANT_SCHEMA_PATH = path.resolve(__dirname, '../../prisma/tenant/schema.prisma')
const PRISMA_CLI_ENTRY = path.resolve(__dirname, '../../node_modules/prisma/build/index.js')
const execFileAsync = promisify(execFile)

function buildTenantUrl(dbName) {
  const { TENANT_DB_HOST, TENANT_DB_PORT, TENANT_DB_USER, TENANT_DB_PASSWORD } = process.env
  return `postgresql://${TENANT_DB_USER}:${TENANT_DB_PASSWORD}@${TENANT_DB_HOST}:${TENANT_DB_PORT}/${dbName}?schema=public`
}

async function main() {
  const companies = await platformDb.company.findMany({ orderBy: { createdAt: 'asc' } })

  console.log(`Encontradas ${companies.length} empresa(s). Aplicando migraciones del schema tenant...\n`)

  const results = { ok: [], failed: [] }

  for (const company of companies) {
    process.stdout.write(`- ${company.businessName} (${company.dbName})... `)
    try {
      await execFileAsync(
        process.execPath,
        [PRISMA_CLI_ENTRY, 'migrate', 'deploy', `--schema=${TENANT_SCHEMA_PATH}`],
        { env: { ...process.env, DATABASE_URL: buildTenantUrl(company.dbName) } }
      )

      const tenantDb = getTenantClientByDbName(company.dbName)
      await seedTenantRolesAndPermissions(tenantDb)
      await seedChartOfAccounts(tenantDb)
      await seedAccountingSettings(tenantDb)
      await tenantDb.$disconnect()

      console.log('OK')
      results.ok.push(company.businessName)
    } catch (error) {
      console.log('FALLÓ')
      console.error(`  ${error.message}`)
      results.failed.push(company.businessName)
    }
  }

  console.log(`\nListo: ${results.ok.length} OK, ${results.failed.length} fallaron.`)
  if (results.failed.length) {
    console.log('Fallaron:', results.failed.join(', '))
    process.exitCode = 1
  }
}

main()
  .catch((err) => {
    console.error(err)
    process.exitCode = 1
  })
  .finally(() => platformDb.$disconnect())
