import { getTenantClientByDbName } from '../src/lib/db.js'

async function main() {
  const db = getTenantClientByDbName('tenant_6743848_421d9d')
  
  console.log('Checking existing tables in Bivoo Enterprise SAS:')
  
  const counts = {
    users: await db.user.count(),
    roles: await db.role.count(),
    products: await db.product.count(),
    customers: await db.customer.count(),
    suppliers: await db.supplier.count(),
    costCenters: await db.costCenter.count(),
    bankAccounts: await db.bankAccount.count(),
    taxRates: await db.taxRate.count(),
    fixedAssets: await db.fixedAsset.count(),
    budgets: await db.budget.count(),
    invoices: await db.invoice.count(),
    purchases: await db.purchase.count(),
    journalEntries: await db.journalEntry.count(),
    bankReconciliations: await db.bankReconciliation.count(),
    accountingPeriodCloses: await db.accountingPeriodClose.count(),
    auditLogs: await db.auditLog.count(),
  }
  
  console.log(JSON.stringify(counts, null, 2))
  await db.$disconnect()
}

main().catch(console.error)
