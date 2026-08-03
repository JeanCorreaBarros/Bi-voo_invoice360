import { PrismaClient as TenantPrismaClient } from '../generated/tenant/index.js'
import { seedTenantRolesAndPermissions } from './tenantRoles.js'
import { seedChartOfAccounts } from './chartOfAccounts.js'
import { seedAccountingSettings } from './accountingSettings.js'

// Siembra roles/permisos/PUC/parametrización contable en la BD de tenant
// apuntada por DATABASE_URL (la BD "sandbox" de desarrollo, ver
// apps/api/.env). Para empresas reales esto lo hace automáticamente
// company.service.js al provisionar.
const tenantDb = new TenantPrismaClient()

async function main() {
  await seedTenantRolesAndPermissions(tenantDb)
  await seedChartOfAccounts(tenantDb)
  await seedAccountingSettings(tenantDb)
}

main()
  .then(() => console.log('Roles, permisos, plan de cuentas y parametrización contable listos 🚀'))
  .catch(console.error)
  .finally(() => tenantDb.$disconnect())
