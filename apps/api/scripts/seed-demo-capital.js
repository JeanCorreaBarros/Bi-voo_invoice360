// Complemento de seed-demo-bivoo.js: registra un capital inicial (aporte de
// socios) al comienzo del histórico demo, para que Caja/Bancos no queden en
// negativo — los pagos de compras salieron de una caja que nunca tuvo un
// ingreso de capital inicial.
import { getTenantClientByDbName } from '../src/lib/db.js'
import { createJournalEntry } from '../src/modules/accounting/journalEntry.service.js'

const DB_NAME = 'tenant_6743848_421d9d' // Bivoo Enterprise SAS

async function main() {
  const db = getTenantClientByDbName(DB_NAME)
  const user = await db.user.findFirst()

  const bank = await db.account.findUnique({ where: { code: '111005' } }) // Bancos Nacionales
  const cash = await db.account.findUnique({ where: { code: '110505' } }) // Caja General
  const capital = await db.account.findUnique({ where: { code: '310505' } }) // Capital Suscrito y Pagado

  await createJournalEntry(
    db,
    {
      type: 'AJUSTE',
      date: '2024-01-02',
      description: 'Aporte de capital inicial de socios',
      source: 'MANUAL',
      lines: [
        { accountId: bank.id, debit: 15000000, credit: 0, description: 'Aporte de capital' },
        { accountId: cash.id, debit: 3000000, credit: 0, description: 'Aporte de capital' },
        { accountId: capital.id, debit: 0, credit: 18000000, description: 'Capital suscrito y pagado' }
      ]
    },
    user.id
  )

  console.log('✔ Capital inicial de $18.000.000 (Bancos + Caja) registrado el 2024-01-02')
  await db.$disconnect()
}

main().catch((err) => {
  console.error('❌', err)
  process.exit(1)
})
