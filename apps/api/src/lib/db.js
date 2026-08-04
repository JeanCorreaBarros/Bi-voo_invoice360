import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import pg from 'pg'
import bcrypt from 'bcryptjs'
import { PrismaClient as PlatformPrismaClient } from '../generated/platform/index.js'
import { PrismaClient as TenantPrismaClient } from '../generated/tenant/index.js'
import { seedTenantRolesAndPermissions } from '../seed/tenantRoles.js'
import { seedChartOfAccounts } from '../seed/chartOfAccounts.js'
import { seedAccountingSettings } from '../seed/accountingSettings.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const TENANT_SCHEMA_PATH = path.resolve(__dirname, '../../prisma/tenant/schema.prisma')
const PLATFORM_SCHEMA_PATH = path.resolve(__dirname, '../../prisma/platform/schema.prisma')
// Invocamos el entrypoint JS del CLI de Prisma directamente con `node` (en vez
// del wrapper node_modules/.bin/prisma.cmd) para no depender de shell:true en
// Windows, que rompe con rutas que tienen espacios.
const PRISMA_CLI_ENTRY = path.resolve(__dirname, '../../node_modules/prisma/build/index.js')

const execFileAsync = promisify(execFile)

// Cliente único a la BD de control-plane (registro de empresas + cuentas de plataforma).
export const platformDb = new PlatformPrismaClient()

// companyId -> TenantPrismaClient conectado a la BD física de esa empresa.
const tenantClientCache = new Map()

function buildTenantUrl(dbName) {
  const { TENANT_DB_HOST, TENANT_DB_PORT, TENANT_DB_USER, TENANT_DB_PASSWORD } = process.env
  return `postgresql://${TENANT_DB_USER}:${TENANT_DB_PASSWORD}@${TENANT_DB_HOST}:${TENANT_DB_PORT}/${dbName}?schema=public`
}

/**
 * Devuelve (o crea y cachea) el PrismaClient conectado a la BD física
 * de la empresa `companyId`. No hay filtrado de datos: el aislamiento
 * es la conexión misma.
 */
export async function getTenantClient(companyId) {
  if (!companyId) {
    throw new Error('getTenantClient requiere un companyId')
  }

  if (tenantClientCache.has(companyId)) {
    return tenantClientCache.get(companyId)
  }

  const company = await platformDb.company.findUnique({ where: { id: companyId } })
  if (!company || !company.active) {
    throw new Error('Empresa no encontrada o inactiva')
  }

  const client = new TenantPrismaClient({
    datasources: { db: { url: buildTenantUrl(company.dbName) } }
  })

  tenantClientCache.set(companyId, client)
  return client
}

// Usado durante el provisioning, antes de que exista una fila Company en platform.
export function getTenantClientByDbName(dbName) {
  return new TenantPrismaClient({
    datasources: { db: { url: buildTenantUrl(dbName) } }
  })
}

async function withAdminClient(fn) {
  const client = new pg.Client({ connectionString: process.env.POSTGRES_ADMIN_URL })
  await client.connect()
  try {
    return await fn(client)
  } finally {
    await client.end()
  }
}

// Nombres de BD Postgres válidos: minúsculas/dígitos/guion bajo, empieza con letra.
const DB_NAME_PATTERN = /^[a-z][a-z0-9_]{2,58}$/

/**
 * Crea la BD física de una empresa nueva y le aplica las migraciones
 * del schema tenant. No es transaccional con la BD platform: si falla
 * después de crear la BD, el llamador debe invocar dropTenantDatabase.
 */
export async function provisionTenantDatabase(dbName) {
  if (!DB_NAME_PATTERN.test(dbName)) {
    throw new Error(`Nombre de base de datos inválido: ${dbName}`)
  }

  await withAdminClient(async (client) => {
    await client.query(`CREATE DATABASE "${dbName}"`)
  })

  await migrateTenantDatabase(dbName)
}

// Aplica `prisma migrate deploy` del schema tenant contra la BD física de
// una empresa puntual (por nombre de BD, no requiere fila en platform).
export async function migrateTenantDatabase(dbName) {
  await execFileAsync(
    process.execPath,
    [PRISMA_CLI_ENTRY, 'migrate', 'deploy', `--schema=${TENANT_SCHEMA_PATH}`],
    { env: { ...process.env, DATABASE_URL: buildTenantUrl(dbName) } }
  )
}

/**
 * Pone al día el schema tenant de TODAS las empresas registradas: les
 * corre las migraciones pendientes y re-siembra permisos/plan de cuentas
 * (idempotente). Se llama en cada arranque del servidor, igual que
 * ensurePlatformDatabase(), para que un cambio al schema tenant llegue
 * solo a las empresas ya existentes sin correr nada a mano.
 */
export async function ensureAllTenantsMigrated() {
  const companies = await platformDb.company.findMany()

  for (const company of companies) {
    await migrateTenantDatabase(company.dbName)

    const tenantDb = getTenantClientByDbName(company.dbName)
    try {
      await seedTenantRolesAndPermissions(tenantDb)
      await seedChartOfAccounts(tenantDb)
      await seedAccountingSettings(tenantDb)
    } finally {
      await tenantDb.$disconnect()
    }
  }
}

/**
 * Crea la BD de control-plane si no existe y aplica sus migraciones.
 * Se llama en cada arranque del servidor: es idempotente (CREATE DATABASE
 * se salta si ya existe, migrate deploy no hace nada si no hay pendientes),
 * asi que un entorno nuevo (o un redeploy) no requiere ningun paso manual.
 */
export async function ensurePlatformDatabase() {
  const dbName = new URL(process.env.PLATFORM_DATABASE_URL).pathname.replace(/^\//, '')

  await withAdminClient(async (client) => {
    const { rowCount } = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [dbName])
    if (rowCount === 0) {
      await client.query(`CREATE DATABASE "${dbName}"`)
    }
  })

  await execFileAsync(
    process.execPath,
    [PRISMA_CLI_ENTRY, 'migrate', 'deploy', `--schema=${PLATFORM_SCHEMA_PATH}`],
    { env: process.env }
  )
}

/**
 * Crea la cuenta SUPER_ADMIN de plataforma si no existe (email/password
 * configurables por env var, con defaults solo para desarrollo local).
 * Idempotente: si el usuario ya existe no le toca la contraseña, para no
 * pisar un cambio que ya haya hecho el super admin desde la app.
 */
export async function ensureSuperAdmin() {
  const email = process.env.SUPER_ADMIN_EMAIL || 'admin@plasticoslc.com'
  const password = process.env.SUPER_ADMIN_PASSWORD || 'Admin123*'
  const hashedPassword = await bcrypt.hash(password, 10)

  await platformDb.platformUser.upsert({
    where: { email },
    update: {},
    create: { name: 'Super Admin', email, password: hashedPassword, active: true }
  })
}

// Limpieza best-effort cuando falla algún paso posterior a CREATE DATABASE.
export async function dropTenantDatabase(dbName) {
  if (!DB_NAME_PATTERN.test(dbName)) return

  await withAdminClient(async (client) => {
    await client.query(
      `SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1 AND pid <> pg_backend_pid()`,
      [dbName]
    )
    await client.query(`DROP DATABASE IF EXISTS "${dbName}"`)
  })
}
