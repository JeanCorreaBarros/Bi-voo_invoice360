export async function listBudgets(db, { year } = {}) {
  return db.budget.findMany({
    where: year ? { year: Number(year) } : {},
    include: { account: { select: { code: true, name: true, type: true } } },
    orderBy: [{ year: 'asc' }, { month: 'asc' }]
  })
}

// Upsert por [accountId, year, month] — un presupuesto por cuenta/mes.
export async function upsertBudget(db, { accountId, year, month, budgetedAmount }) {
  return db.budget.upsert({
    where: { accountId_year_month: { accountId, year: Number(year), month: Number(month) } },
    update: { budgetedAmount: Number(budgetedAmount) },
    create: { accountId, year: Number(year), month: Number(month), budgetedAmount: Number(budgetedAmount) }
  })
}

export async function deleteBudget(db, id) {
  return db.budget.delete({ where: { id } })
}

// Ejecución presupuestal: para cada presupuesto del mes, compara lo
// presupuestado contra el movimiento real de la cuenta en ese mes
// (débito-crédito o crédito-débito según la naturaleza de su tipo).
export async function getBudgetExecution(db, { year, month }) {
  const budgets = await db.budget.findMany({
    where: { year: Number(year), month: Number(month) },
    include: { account: { select: { code: true, name: true, type: true, nature: true } } }
  })
  if (budgets.length === 0) return []

  const from = new Date(Date.UTC(Number(year), Number(month) - 1, 1))
  const to = new Date(Date.UTC(Number(year), Number(month), 0, 23, 59, 59, 999))

  const lines = await db.journalEntryLine.findMany({
    where: {
      accountId: { in: budgets.map((b) => b.accountId) },
      journalEntry: { status: { not: 'VOID' }, date: { gte: from, lte: to } }
    },
    select: { accountId: true, debit: true, credit: true }
  })

  const totalsByAccount = new Map()
  for (const line of lines) {
    const current = totalsByAccount.get(line.accountId) || { debit: 0, credit: 0 }
    current.debit += Number(line.debit)
    current.credit += Number(line.credit)
    totalsByAccount.set(line.accountId, current)
  }

  return budgets.map((b) => {
    const totals = totalsByAccount.get(b.accountId) || { debit: 0, credit: 0 }
    const isDebitNature = b.account.type === 'ASSET' || b.account.type === 'EXPENSE' || b.account.type === 'COST'
    const actual = isDebitNature ? totals.debit - totals.credit : totals.credit - totals.debit
    const budgeted = Number(b.budgetedAmount)
    const variance = actual - budgeted
    const pct = budgeted !== 0 ? Math.round((actual / budgeted) * 1000) / 10 : null

    return {
      id: b.id,
      accountId: b.accountId,
      code: b.account.code,
      name: b.account.name,
      type: b.account.type,
      year: b.year,
      month: b.month,
      budgeted,
      actual,
      variance,
      pct
    }
  })
}
