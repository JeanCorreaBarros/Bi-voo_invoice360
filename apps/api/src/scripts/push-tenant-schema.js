import 'dotenv/config'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { platformDb } from '../lib/db.js'

// Aplica `prisma db push` del schema tenant contra la BD física de CADA
// empresa registrada en platform. A diferencia de migrate-all-tenants.js
// (que usa `migrate deploy` y depende de archivos de migración), esto
// sincroniza el schema directamente sin tocar el historial de migraciones.
// Usar solo para cambios aditivos y no destructivos.
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
  console.log(`Encontradas ${companies.length} empresa(s). Aplicando db push...\n`)

  const results = { ok: [], failed: [] }

  for (const company of companies) {
    process.stdout.write(`- ${company.businessName} (${company.dbName})... `)
    try {
      const { stdout } = await execFileAsync(
        process.execPath,
        [PRISMA_CLI_ENTRY, 'db', 'push', `--schema=${TENANT_SCHEMA_PATH}`, '--skip-generate'],
        { env: { ...process.env, DATABASE_URL: buildTenantUrl(company.dbName) } }
      )
      console.log('OK')
      if (process.env.VERBOSE) console.log(stdout)
      results.ok.push(company.businessName)
    } catch (error) {
      console.log('FALLÓ')
      console.error(`  ${error.stdout || error.message}`)
      results.failed.push(company.businessName)
    }
  }

  console.log(`\nListo: ${results.ok.length} OK, ${results.failed.length} fallaron.`)
  if (results.failed.length) process.exitCode = 1
}

main()
  .catch((err) => {
    console.error(err)
    process.exitCode = 1
  })
  .finally(() => platformDb.$disconnect())
