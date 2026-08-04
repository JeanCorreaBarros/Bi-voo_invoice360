import { getTenantClientByDbName } from '../src/lib/db.js'
import { seedDemoData } from '../src/seed/demoData.js'

async function main() {
  const db = getTenantClientByDbName('tenant_6743848_421d9d')
  
  console.log('Obtaining user jean@bivoo.com...')
  const user = await db.user.findFirst({
    where: { email: 'jean@bivoo.com' }
  })
  if (!user) {
    throw new Error('User jean@bivoo.com not found')
  }
  
  console.log('Truncating tables CASCADE...')
  const tables = [
    'AuditLog',
    'Budget',
    'FixedAsset',
    'TaxRate',
    'BankReconciliation',
    'AccountingPeriodClose',
    'Payment',
    'invoices_details',
    'invoices',
    'PurchasePayment',
    'PurchaseDetail',
    'Purchase',
    'JournalEntryLine',
    'JournalEntry',
    'BankAccount',
    'Product',
    'Customer',
    'Supplier',
    'CostCenter',
    'Warehouse',
    'resolutions',
    'AIIntegrationSettings',
    'CreditNoteDetail',
    'CreditNote',
    'DebitNoteDetail',
    'DebitNote',
    'SupportDocumentDetail',
    'SupportDocument',
    'KitComponent',
    'ProductPriceHistory',
    'InventoryMovement',
    'StockTransfer',
    'ProductBatch',
    'recurring_invoice_templates',
    'scheduled_invoices'
  ]
  
  for (const table of tables) {
    try {
      await db.$executeRawUnsafe(`TRUNCATE TABLE "${table}" CASCADE;`)
      console.log(`✔ Truncated table: ${table}`)
    } catch (err) {
      console.log(`⚠ Failed to truncate table ${table}:`, err.message)
    }
  }

  console.log('Checking for custom roles to delete...')
  const rolesToDelete = await db.role.findMany({
    where: { name: { not: 'ADMIN' } },
    select: { id: true }
  })
  const roleIds = rolesToDelete.map(r => r.id)
  
  if (roleIds.length > 0) {
    console.log(`Found ${roleIds.length} custom roles. Deleting permissions first...`)
    await db.rolePermission.deleteMany({
      where: { roleId: { in: roleIds } }
    })
    console.log('Deleting roles...')
    await db.role.deleteMany({
      where: { id: { in: roleIds } }
    })
    console.log('✔ Custom roles removed.')
  } else {
    console.log('No custom roles to delete.')
  }
  
  console.log('Running seedDemoData...')
  await seedDemoData(db, { userId: user.id })
  
  console.log('✔ Seeding complete!')
  await db.$disconnect()
}

main().catch(console.error)
