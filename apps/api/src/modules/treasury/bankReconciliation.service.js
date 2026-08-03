function round2(n) {
  return Math.round(Number(n) * 100) / 100
}

// Saldo contable de la cuenta asociada al banco, hasta una fecha de corte.
async function getBookBalance(db, accountId, asOf) {
  if (!accountId) return 0

  const account = await db.account.findUnique({ where: { id: accountId } })
  if (!account) return 0

  const lines = await db.journalEntryLine.findMany({
    where: {
      accountId,
      journalEntry: {
        status: { not: 'VOID' },
        ...(asOf ? { date: { lte: new Date(asOf) } } : {})
      }
    },
    select: { debit: true, credit: true }
  })

  return lines.reduce((sum, l) => {
    const delta =
      account.nature === 'DEBIT' ? Number(l.debit) - Number(l.credit) : Number(l.credit) - Number(l.debit)
    return sum + delta
  }, 0)
}

export async function listReconciliations(db, bankAccountId) {
  return db.bankReconciliation.findMany({
    where: { bankAccountId },
    orderBy: { statementDate: 'desc' }
  })
}

export async function createReconciliation(db, data) {
  const { bankAccountId, statementDate, statementBalance, note } = data

  const bankAccount = await db.bankAccount.findUnique({ where: { id: bankAccountId } })
  if (!bankAccount) throw new Error('Cuenta bancaria no encontrada')

  const bookBalance = round2(await getBookBalance(db, bankAccount.accountId, statementDate))
  const difference = round2(Number(statementBalance) - bookBalance)

  return db.bankReconciliation.create({
    data: {
      bankAccountId,
      statementDate: new Date(statementDate),
      statementBalance: Number(statementBalance),
      bookBalance,
      difference,
      status: difference === 0 ? 'CLOSED' : 'OPEN',
      note: note || null
    }
  })
}
