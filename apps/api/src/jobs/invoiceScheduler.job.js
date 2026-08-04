import cron from 'node-cron'
import { platformDb, getTenantClient } from '../lib/db.js'
import { runDueRecurringTemplates, runDueScheduledInvoices } from '../modules/invoices/invoiceScheduler.service.js'

// Corre cada 15 minutos: por cada empresa activa, revisa si tiene
// plantillas recurrentes o facturas programadas vencidas y las genera. Un
// fallo en una empresa (o en una plantilla puntual) no debe afectar a las
// demás — se captura y se loguea por separado en cada nivel.
export function startInvoiceSchedulerJob() {
  cron.schedule('*/15 * * * *', async () => {
    let companies
    try {
      companies = await platformDb.company.findMany({ where: { active: true } })
    } catch (error) {
      console.error('[invoice-scheduler] no se pudo listar empresas activas:', error.message)
      return
    }

    for (const company of companies) {
      try {
        const tenantDb = await getTenantClient(company.id)
        const [recurring, scheduled] = await Promise.all([
          runDueRecurringTemplates(tenantDb),
          runDueScheduledInvoices(tenantDb)
        ])
        const generated = recurring.filter((r) => r.ok).length + scheduled.filter((r) => r.ok).length
        if (generated > 0) {
          console.log(`[invoice-scheduler] ${company.businessName}: ${generated} factura(s) generada(s) automáticamente`)
        }
      } catch (error) {
        console.error(`[invoice-scheduler] error en empresa ${company.businessName}:`, error.message)
      }
    }
  })

  console.log('[invoice-scheduler] job programado cada 15 minutos')
}
