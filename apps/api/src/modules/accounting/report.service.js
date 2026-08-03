// Balance de Prueba: suma débitos/créditos de todas las líneas (de
// comprobantes no anulados) agrupadas por cuenta.
export async function getTrialBalance(db) {
  const accounts = await db.account.findMany({
    where: { allowsEntries: true, active: true },
    orderBy: { code: 'asc' }
  })

  const lines = await db.journalEntryLine.findMany({
    where: { journalEntry: { status: { not: 'VOID' } } },
    select: { accountId: true, debit: true, credit: true }
  })

  const totalsByAccount = new Map()
  for (const line of lines) {
    const current = totalsByAccount.get(line.accountId) || { debit: 0, credit: 0 }
    current.debit += Number(line.debit)
    current.credit += Number(line.credit)
    totalsByAccount.set(line.accountId, current)
  }

  return accounts.map((account) => {
    const totals = totalsByAccount.get(account.id) || { debit: 0, credit: 0 }
    const balance =
      account.nature === 'DEBIT' ? totals.debit - totals.credit : totals.credit - totals.debit

    return {
      accountId: account.id,
      code: account.code,
      name: account.name,
      nature: account.nature,
      debit: totals.debit,
      credit: totals.credit,
      balance
    }
  })
}

function sumBalances(rows) {
  return rows.reduce((s, r) => s + r.balance, 0)
}

function dateRangeWhere(from, to) {
  if (!from && !to) return {}
  return { date: { ...(from ? { gte: new Date(from) } : {}), ...(to ? { lte: new Date(to) } : {}) } }
}

// Libro Mayor: movimientos cronológicos de UNA cuenta, con saldo corriente.
export async function getLedger(db, accountId, { from, to } = {}) {
  const account = await db.account.findUnique({ where: { id: accountId } })
  if (!account) throw new Error('Cuenta no encontrada')

  const lines = await db.journalEntryLine.findMany({
    where: {
      accountId,
      journalEntry: { status: { not: 'VOID' }, ...dateRangeWhere(from, to) }
    },
    include: { journalEntry: true },
    orderBy: { journalEntry: { date: 'asc' } }
  })

  let running = 0
  const movements = lines.map((line) => {
    const delta =
      account.nature === 'DEBIT'
        ? Number(line.debit) - Number(line.credit)
        : Number(line.credit) - Number(line.debit)
    running += delta

    return {
      date: line.journalEntry.date,
      type: line.journalEntry.type,
      number: line.journalEntry.number,
      description: line.description || line.journalEntry.description,
      debit: Number(line.debit),
      credit: Number(line.credit),
      balance: running
    }
  })

  return {
    account: { id: account.id, code: account.code, name: account.name, nature: account.nature },
    movements
  }
}

// Naturaleza contable propia de cada clase de cuenta (independiente de la
// naturaleza particular de una cuenta contra — ej. Depreciación Acumulada es
// type=ASSET pero nature=CREDIT). Se usa para agregar totales por tipo en
// Balance General / Estado de Resultados: una cuenta contra debe RESTAR del
// total de su tipo, no sumarse como si tuviera saldo natural.
const NATURAL_NATURE_BY_TYPE = {
  ASSET: 'DEBIT',
  EXPENSE: 'DEBIT',
  COST: 'DEBIT',
  LIABILITY: 'CREDIT',
  EQUITY: 'CREDIT',
  INCOME: 'CREDIT'
}

// Cálculo compartido: saldo de cada cuenta con movimientos, agregado según la
// naturaleza natural de su TIPO (no la naturaleza propia de la cuenta), para
// que cuentas contra (ej. Depreciación Acumulada) resten correctamente del
// total de su tipo. Opcionalmente filtrado por tipo de cuenta y rango de fechas.
export async function getAccountBalances(db, { types, from, to } = {}) {
  const accounts = await db.account.findMany({
    where: { allowsEntries: true, active: true, ...(types ? { type: { in: types } } : {}) },
    orderBy: { code: 'asc' }
  })

  const lines = await db.journalEntryLine.findMany({
    where: {
      accountId: { in: accounts.map((a) => a.id) },
      journalEntry: { status: { not: 'VOID' }, ...dateRangeWhere(from, to) }
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

  return accounts
    .map((account) => {
      const totals = totalsByAccount.get(account.id) || { debit: 0, credit: 0 }
      const naturalNature = NATURAL_NATURE_BY_TYPE[account.type]
      const balance =
        naturalNature === 'DEBIT' ? totals.debit - totals.credit : totals.credit - totals.debit
      return { accountId: account.id, code: account.code, name: account.name, type: account.type, balance }
    })
    .filter((row) => row.balance !== 0)
}

// Balance General: Activo / Pasivo / Patrimonio (+ utilidad del ejercicio
// acumulada a la fecha, calculada en vivo a partir de Ingresos-Costos-Gastos
// — no depende de que se haya corrido un cierre contable).
export async function getBalanceSheet(db, { asOf } = {}) {
  const rows = await getAccountBalances(db, { to: asOf })

  const assets = rows.filter((r) => r.type === 'ASSET')
  const liabilities = rows.filter((r) => r.type === 'LIABILITY')
  const equity = rows.filter((r) => r.type === 'EQUITY')
  const income = rows.filter((r) => r.type === 'INCOME')
  const expense = rows.filter((r) => r.type === 'EXPENSE')
  const cost = rows.filter((r) => r.type === 'COST')

  const totalAssets = sumBalances(assets)
  const totalLiabilities = sumBalances(liabilities)
  const equityFromAccounts = sumBalances(equity)
  const netIncome = sumBalances(income) - sumBalances(expense) - sumBalances(cost)
  const totalEquity = equityFromAccounts + netIncome

  return {
    assets,
    liabilities,
    equity,
    totalAssets,
    totalLiabilities,
    equityFromAccounts,
    netIncome,
    totalEquity,
    totalLiabilitiesAndEquity: totalLiabilities + totalEquity
  }
}

// Estado de Resultados: Ingresos - Costo de Ventas = Utilidad Bruta;
// Utilidad Bruta - Gastos = Utilidad Neta. Admite rango de fechas (periodo).
export async function getIncomeStatement(db, { from, to } = {}) {
  const rows = await getAccountBalances(db, { types: ['INCOME', 'EXPENSE', 'COST'], from, to })

  const income = rows.filter((r) => r.type === 'INCOME')
  const cost = rows.filter((r) => r.type === 'COST')
  const expense = rows.filter((r) => r.type === 'EXPENSE')

  const totalIncome = sumBalances(income)
  const totalCost = sumBalances(cost)
  const grossProfit = totalIncome - totalCost
  const totalExpense = sumBalances(expense)
  const netIncome = grossProfit - totalExpense

  return { income, cost, expense, totalIncome, totalCost, grossProfit, totalExpense, netIncome }
}

// Estado de cuenta de un cliente: factura por factura (por NIT, ya que
// Invoice no tiene FK a Customer — solo guarda el NIT como texto), con sus
// pagos y saldo pendiente.
export async function getCustomerStatement(db, nit) {
  const invoices = await db.invoice.findMany({
    where: { orderReceiverNit: nit },
    include: { payments: true },
    orderBy: { orderDate: 'asc' }
  })

  let totalBalance = 0
  const rows = invoices.map((inv) => {
    const paid = inv.payments.reduce((sum, p) => sum + Number(p.amount), 0)
    const total = Number(inv.orderTotalAfterTax)
    const balance = total - paid
    totalBalance += balance
    return {
      invoiceId: inv.id,
      orderPrefix: inv.orderPrefix,
      orderId: inv.orderId,
      date: inv.orderDate,
      total,
      paid,
      balance,
      status: inv.status
    }
  })

  return { invoices: rows, totalBalance }
}

// Estado de cuenta de un proveedor: compra por compra (por NIT), con sus
// pagos y saldo pendiente.
export async function getSupplierStatement(db, nit) {
  const purchases = await db.purchase.findMany({
    where: { supplierNit: nit },
    include: { payments: true },
    orderBy: { date: 'asc' }
  })

  let totalBalance = 0
  const rows = purchases.map((p) => {
    const paid = p.payments.reduce((sum, pay) => sum + Number(pay.amount), 0)
    const total = Number(p.total)
    const balance = total - paid
    totalBalance += balance
    return {
      purchaseId: p.id,
      invoiceNumber: p.invoiceNumber,
      date: p.date,
      total,
      paid,
      balance,
      status: p.status
    }
  })

  return { purchases: rows, totalBalance }
}

// Libro Diario: comprobantes (no anulados) con sus líneas, paginado.
export async function getJournalBook(db, { page = 1, limit = 20, from, to, search } = {}) {
  const skip = (Number(page) - 1) * Number(limit)

  const trimmed = search?.trim()
  const searchNumber = trimmed && /^\d+$/.test(trimmed) ? Number(trimmed) : undefined

  const where = {
    status: { not: 'VOID' },
    ...(from || to
      ? {
          date: {
            ...(from ? { gte: new Date(from) } : {}),
            ...(to ? { lte: new Date(to) } : {})
          }
        }
      : {}),
    ...(trimmed
      ? {
          OR: [
            { description: { contains: trimmed, mode: 'insensitive' } },
            ...(searchNumber !== undefined ? [{ number: searchNumber }] : []),
            { lines: { some: { account: { OR: [{ name: { contains: trimmed, mode: 'insensitive' } }, { code: { contains: trimmed } }] } } } }
          ]
        }
      : {})
  }

  const [data, total] = await Promise.all([
    db.journalEntry.findMany({
      where,
      skip,
      take: Number(limit),
      orderBy: { date: 'asc' },
      include: { lines: { include: { account: true } } }
    }),
    db.journalEntry.count({ where })
  ])

  return { data, meta: { total, page: Number(page), lastPage: Math.ceil(total / limit) } }
}
