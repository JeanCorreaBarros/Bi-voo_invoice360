// Importación de extracto bancario para conciliación: recibe filas ya
// parseadas (fecha, descripción, monto) y las cruza contra los movimientos
// contables (JournalEntryLine) de la cuenta asociada al banco, dentro de
// una ventana de tolerancia de fecha y monto. No requiere ninguna
// integración externa — es puramente un cruce contra tus propios datos.

const AMOUNT_TOLERANCE = 1 // pesos de tolerancia por redondeo
const DATE_TOLERANCE_DAYS = 5

function daysBetween(a, b) {
  return Math.abs((new Date(a).getTime() - new Date(b).getTime()) / (1000 * 60 * 60 * 24))
}

export async function matchStatementLines(db, { bankAccountId, lines }) {
  if (!Array.isArray(lines) || lines.length === 0) {
    throw new Error('No se recibieron filas del extracto')
  }

  const bankAccount = await db.bankAccount.findUnique({ where: { id: bankAccountId } })
  if (!bankAccount) throw new Error('Cuenta bancaria no encontrada')
  if (!bankAccount.accountId) throw new Error('Esta cuenta bancaria no tiene una cuenta contable asociada')

  const dates = lines.map((l) => new Date(l.date).getTime()).filter((d) => !Number.isNaN(d))
  const minDate = new Date(Math.min(...dates))
  const maxDate = new Date(Math.max(...dates))
  minDate.setDate(minDate.getDate() - DATE_TOLERANCE_DAYS)
  maxDate.setDate(maxDate.getDate() + DATE_TOLERANCE_DAYS)

  const journalLines = await db.journalEntryLine.findMany({
    where: {
      accountId: bankAccount.accountId,
      journalEntry: {
        status: { not: 'VOID' },
        date: { gte: minDate, lte: maxDate }
      }
    },
    include: { journalEntry: { select: { number: true, date: true, description: true } } }
  })

  const pool = journalLines.map((jl) => ({
    id: jl.id,
    entryNumber: jl.journalEntry.number,
    date: jl.journalEntry.date,
    description: jl.journalEntry.description,
    amount: Number(jl.debit) - Number(jl.credit), // + = entrada (débito banco), - = salida
    used: false
  }))

  const matched = []
  const unmatched = []

  for (const line of lines) {
    const amount = Number(line.amount)
    const candidate = pool.find(
      (p) => !p.used && Math.abs(Math.abs(p.amount) - Math.abs(amount)) <= AMOUNT_TOLERANCE && daysBetween(p.date, line.date) <= DATE_TOLERANCE_DAYS
    )

    if (candidate) {
      candidate.used = true
      matched.push({
        statementDate: line.date,
        statementDescription: line.description,
        statementAmount: amount,
        entryNumber: candidate.entryNumber,
        entryDate: candidate.date,
        entryDescription: candidate.description
      })
    } else {
      unmatched.push({ statementDate: line.date, statementDescription: line.description, statementAmount: amount })
    }
  }

  const unmatchedBookLines = pool
    .filter((p) => !p.used)
    .map((p) => ({ entryNumber: p.entryNumber, entryDate: p.date, entryDescription: p.description, amount: p.amount }))

  return {
    totalStatementLines: lines.length,
    matchedCount: matched.length,
    unmatchedStatementCount: unmatched.length,
    unmatchedBookCount: unmatchedBookLines.length,
    matched,
    unmatchedStatement: unmatched,
    unmatchedBook: unmatchedBookLines
  }
}
