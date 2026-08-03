import 'dotenv/config'
import { platformDb, getTenantClientByDbName } from '../lib/db.js'

// Crea la bodega "Bodega Principal" (isDefault) en cada tenant que no la
// tenga, y le asigna todos los InventoryMovement existentes sin bodega
// (movimientos creados antes de que el modelo Warehouse existiera).
async function main() {
  const companies = await platformDb.company.findMany({ orderBy: { createdAt: 'asc' } })
  console.log(`Encontradas ${companies.length} empresa(s). Creando bodega por defecto...\n`)

  for (const company of companies) {
    const db = getTenantClientByDbName(company.dbName)
    process.stdout.write(`- ${company.businessName}... `)
    try {
      let warehouse = await db.warehouse.findFirst({ where: { isDefault: true } })
      if (!warehouse) {
        warehouse = await db.warehouse.create({
          data: { name: 'Bodega Principal', code: 'PRINCIPAL', isDefault: true }
        })
      }

      const { count } = await db.inventoryMovement.updateMany({
        where: { warehouseId: null },
        data: { warehouseId: warehouse.id }
      })

      console.log(`OK (${count} movimiento(s) asignados a "${warehouse.name}")`)
    } catch (error) {
      console.log('FALLÓ')
      console.error(`  ${error.message}`)
    } finally {
      await db.$disconnect()
    }
  }
}

main()
  .catch((err) => {
    console.error(err)
    process.exitCode = 1
  })
  .finally(() => platformDb.$disconnect())
