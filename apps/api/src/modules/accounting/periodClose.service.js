import { createJournalEntryInTx, round2 } from './journalEntry.service.js'
import { getAccountBalances } from './report.service.js'

export async function listPeriodCloses(db) {
  return db.accountingPeriodClose.findMany({
    include: { journalEntry: { include: { lines: { include: { account: true } } } } },
    orderBy: { periodEnd: 'desc' }
  })
}

// Cierra ingresos/costos/gastos a la fecha indicada: genera un comprobante
// que lleva cada cuenta nominal a cero y traslada el resultado neto a la
// cuenta de Utilidad/Pérdida del Ejercicio. Como el saldo de cada cuenta ya
// refleja únicamente el movimiento posterior al último cierre (los cierres
// previos ya la dejaron en cero), no hace falta rastrear un rango de fechas
// "desde" — basta con tomar el saldo actual a la fecha de corte.
export async function closeAccountingPeriod(db, { periodEnd, userId }) {
  return db.$transaction(async (tx) => {
    const settings = await tx.accountingSettings.findFirst()
    if (!settings?.retainedEarningsAccountId) {
      throw new Error('Falta configurar la cuenta de Utilidad del Ejercicio en Configuración Contable')
    }

    const to = new Date(periodEnd)
    if (Number.isNaN(to.getTime())) throw new Error('Fecha de cierre inválida')

    const existing = await tx.accountingPeriodClose.findFirst({ where: { periodEnd: to } })
    if (existing) throw new Error('Ya existe un cierre contable para esta fecha')

    // El cierre cubre TODO el día indicado, no solo hasta medianoche. Se usa
    // UTC porque un string "YYYY-MM-DD" se parsea como medianoche UTC — usar
    // setHours() (hora local del servidor) podía retroceder al día anterior
    // en zonas horarias negativas (ej. America/Bogota, UTC-5).
    const cutoff = new Date(to)
    cutoff.setUTCHours(23, 59, 59, 999)

    const rows = await getAccountBalances(tx, { types: ['INCOME', 'EXPENSE', 'COST'], to: cutoff })
    const nonZero = rows.filter((r) => r.balance !== 0)
    if (nonZero.length === 0) throw new Error('No hay saldos de ingresos, costos o gastos para cerrar')

    const lines = nonZero.map((r) => {
      const amount = round2(Math.abs(r.balance))
      // INCOME normal balance es crédito (r.balance > 0 significa saldo
      // acreedor); para cerrarla se debita. EXPENSE/COST normal es débito;
      // para cerrarlas se acredita.
      return r.type === 'INCOME'
        ? { accountId: r.accountId, debit: amount, credit: 0, description: 'Cierre de periodo' }
        : { accountId: r.accountId, debit: 0, credit: amount, description: 'Cierre de periodo' }
    })

    const totalIncome = nonZero.filter((r) => r.type === 'INCOME').reduce((s, r) => s + r.balance, 0)
    const totalCost = nonZero.filter((r) => r.type === 'COST').reduce((s, r) => s + r.balance, 0)
    const totalExpense = nonZero.filter((r) => r.type === 'EXPENSE').reduce((s, r) => s + r.balance, 0)
    const netIncome = round2(totalIncome - totalCost - totalExpense)

    if (netIncome >= 0) {
      lines.push({ accountId: settings.retainedEarningsAccountId, debit: 0, credit: netIncome, description: 'Utilidad del ejercicio' })
    } else {
      lines.push({ accountId: settings.retainedEarningsAccountId, debit: round2(Math.abs(netIncome)), credit: 0, description: 'Pérdida del ejercicio' })
    }

    const entry = await createJournalEntryInTx(tx, {
      type: 'AJUSTE',
      date: to,
      description: `Cierre contable al ${to.toISOString().slice(0, 10)}`,
      source: 'CLOSING',
      sourceId: null,
      createdBy: userId,
      lines
    })

    const close = await tx.accountingPeriodClose.create({
      data: { periodEnd: to, journalEntryId: entry.id }
    })

    return { close, journalEntry: entry, netIncome }
  })
}
