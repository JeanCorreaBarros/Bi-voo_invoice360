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
// Variante sin filtrar saldos en cero: la necesitan los reportes
// comparativos multi-año (una cuenta con saldo en un año y 0 en otro debe
// seguir apareciendo en la fila para que las columnas de todos los años
// queden alineadas).
// `excludeClosing` omite los comprobantes de cierre de periodo. Lo usa el
// Estado de Resultados: el asiento de cierre lleva ingresos/costos/gastos a
// cero, así que incluirlo haría que TODO periodo ya cerrado reportara
// utilidad cero. El Balance General y el propio cierre sí deben verlo (el
// cierre depende de que el saldo refleje solo el movimiento posterior al
// cierre anterior), por eso el default es incluirlo.
async function getAllAccountBalancesRaw(db, { types, from, to, excludeClosing } = {}) {
  const accounts = await db.account.findMany({
    where: { allowsEntries: true, active: true, ...(types ? { type: { in: types } } : {}) },
    orderBy: { code: 'asc' }
  })

  const lines = await db.journalEntryLine.findMany({
    where: {
      accountId: { in: accounts.map((a) => a.id) },
      journalEntry: {
        status: { not: 'VOID' },
        ...(excludeClosing ? { source: { not: 'CLOSING' } } : {}),
        ...dateRangeWhere(from, to)
      }
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

  return accounts.map((account) => {
    const totals = totalsByAccount.get(account.id) || { debit: 0, credit: 0 }
    const naturalNature = NATURAL_NATURE_BY_TYPE[account.type]
    const balance =
      naturalNature === 'DEBIT' ? totals.debit - totals.credit : totals.credit - totals.debit
    return { accountId: account.id, code: account.code, name: account.name, type: account.type, balance }
  })
}

export async function getAccountBalances(db, opts = {}) {
  const rows = await getAllAccountBalancesRaw(db, opts)
  return rows.filter((row) => row.balance !== 0)
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
  const rows = await getAccountBalances(db, {
    types: ['INCOME', 'EXPENSE', 'COST'],
    from,
    to,
    excludeClosing: true
  })

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

// Indicadores Financieros: liquidez, endeudamiento y rentabilidad, derivados
// del Balance General y Estado de Resultados (ambos ya calculados en vivo).
// Nota: el PUC estándar colombiano no separa corto/largo plazo con códigos
// distintos, así que activo/pasivo "corriente" se aproxima por clase de
// cuenta (11-14 activo corriente, 22-26 y 28 pasivo corriente; 21 Obligaciones
// Financieras y 27 Diferidos se tratan como largo plazo) — es una aproximación
// razonable para una pyme, no un dictamen contable formal.
const CURRENT_ASSET_PREFIXES = ['11', '12', '13', '14']
const INVENTORY_PREFIX = '14'
const CURRENT_LIABILITY_PREFIXES = ['22', '23', '24', '25', '26', '28']

function safeDivide(a, b) {
  return b === 0 ? null : a / b
}

export async function getFinancialIndicators(db, { asOf } = {}) {
  const [balance, income] = await Promise.all([
    getBalanceSheet(db, { asOf }),
    getIncomeStatement(db, { to: asOf })
  ])

  const currentAssets = sumBalances(balance.assets.filter((a) => CURRENT_ASSET_PREFIXES.some((p) => a.code.startsWith(p))))
  const inventory = sumBalances(balance.assets.filter((a) => a.code.startsWith(INVENTORY_PREFIX)))
  const currentLiabilities = sumBalances(balance.liabilities.filter((l) => CURRENT_LIABILITY_PREFIXES.some((p) => l.code.startsWith(p))))

  const { totalAssets, totalLiabilities, totalEquity, netIncome } = balance
  const { totalIncome, grossProfit } = income

  return {
    asOf: asOf || new Date().toISOString().slice(0, 10),
    liquidez: {
      activoCorriente: currentAssets,
      pasivoCorriente: currentLiabilities,
      razonCorriente: safeDivide(currentAssets, currentLiabilities),
      pruebaAcida: safeDivide(currentAssets - inventory, currentLiabilities),
      capitalTrabajo: currentAssets - currentLiabilities
    },
    endeudamiento: {
      totalPasivo: totalLiabilities,
      totalActivo: totalAssets,
      totalPatrimonio: totalEquity,
      nivelEndeudamiento: safeDivide(totalLiabilities, totalAssets),
      endeudamientoPatrimonial: safeDivide(totalLiabilities, totalEquity)
    },
    rentabilidad: {
      ingresos: totalIncome,
      utilidadBruta: grossProfit,
      utilidadNeta: netIncome,
      margenBruto: safeDivide(grossProfit, totalIncome),
      margenNeto: safeDivide(netIncome, totalIncome),
      roa: safeDivide(netIncome, totalAssets),
      roe: safeDivide(netIncome, totalEquity)
    }
  }
}

// ══════════════ Comparativo multi-año (Balance General / Estado de Resultados) ══════════════
// Reproduce la vista clásica de un contador en Excel: cuentas PUC como filas
// jerárquicas (Clase > Grupo > Cuenta), un año por columna.

function buildAccountForest(accounts) {
  const nodesById = new Map(accounts.map((a) => [a.id, { ...a, childAccounts: [] }]))
  const roots = []
  for (const node of nodesById.values()) {
    if (node.parentId && nodesById.has(node.parentId)) {
      nodesById.get(node.parentId).childAccounts.push(node)
    } else {
      roots.push(node)
    }
  }
  return roots
}

function rollup(node, leafBalances) {
  if (node.childAccounts.length === 0) return leafBalances?.get(node.id) || 0
  return node.childAccounts.reduce((sum, child) => sum + rollup(child, leafBalances), 0)
}

// Fila de cuenta de detalle -> { code, name, values: {year: number} }; se
// omite si está en cero en TODOS los años (cuenta sin ningún movimiento).
function leafRows(node, years, leafBalancesByYear) {
  const values = {}
  let any = false
  for (const y of years) {
    const v = rollup(node, leafBalancesByYear.get(y))
    values[y] = v
    if (Math.abs(v) > 0.005) any = true
  }
  return any ? [{ accountId: node.id, code: node.code, name: node.name, values }] : []
}

function groupRow(node, years, leafBalancesByYear) {
  const accounts = node.childAccounts.flatMap((leaf) => leafRows(leaf, years, leafBalancesByYear))
  const values = {}
  for (const y of years) values[y] = rollup(node, leafBalancesByYear.get(y))
  return { code: node.code, name: node.name, values, accounts }
}

// splitCurrent: códigos de grupo (nivel 2) que van al balde "Corriente"; el
// resto cae en "No Corriente". Sin splitCurrent, los grupos se listan tal cual.
function classSection(node, years, leafBalancesByYear, { splitCurrent } = {}) {
  const values = {}
  for (const y of years) values[y] = rollup(node, leafBalancesByYear.get(y))

  if (!splitCurrent) {
    const groups = node.childAccounts
      .map((g) => groupRow(g, years, leafBalancesByYear))
      .filter((g) => g.accounts.length > 0)
    return { code: node.code, name: node.name, values, groups }
  }

  const buildBucket = (label, groupNodes) => {
    const groups = groupNodes.map((g) => groupRow(g, years, leafBalancesByYear)).filter((g) => g.accounts.length > 0)
    const bucketValues = {}
    for (const y of years) bucketValues[y] = groupNodes.reduce((s, g) => s + rollup(g, leafBalancesByYear.get(y)), 0)
    return { name: label, values: bucketValues, groups }
  }

  const current = node.childAccounts.filter((g) => splitCurrent.includes(g.code))
  const nonCurrent = node.childAccounts.filter((g) => !splitCurrent.includes(g.code))

  return {
    code: node.code,
    name: node.name,
    values,
    buckets: [buildBucket(`${node.name} Corriente`, current), buildBucket(`${node.name} No Corriente`, nonCurrent)]
  }
}

// Balance General comparativo: una columna por año (el año en curso se
// calcula "a hoy", los anteriores a 31 de diciembre). Activo y Pasivo se
// dividen en corriente/no corriente igual que un balance clasificado.
// Utilidad del ejercicio: misma convención que getBalanceSheet (acumulada
// desde el origen si nunca se ha corrido un cierre contable para ese año).
export async function getBalanceSheetComparative(db, { years }) {
  if (!Array.isArray(years) || years.length === 0) throw new Error('years es obligatorio')

  const accounts = await db.account.findMany({ orderBy: { code: 'asc' } })
  const forest = buildAccountForest(accounts)

  const currentCalendarYear = new Date().getFullYear()
  const asOfForYear = (y) => (y >= currentCalendarYear ? new Date().toISOString().slice(0, 10) : `${y}-12-31`)

  const leafBalancesByYear = new Map()
  const nominalNetIncomeByYear = new Map()
  for (const y of years) {
    const asOf = asOfForYear(y)
    const [balanceRows, nominalRows] = await Promise.all([
      getAllAccountBalancesRaw(db, { to: asOf }),
      getAllAccountBalancesRaw(db, { types: ['INCOME', 'EXPENSE', 'COST'], to: asOf })
    ])
    leafBalancesByYear.set(y, new Map(balanceRows.map((r) => [r.accountId, r.balance])))
    const totalIncome = nominalRows.filter((r) => r.type === 'INCOME').reduce((s, r) => s + r.balance, 0)
    const totalCost = nominalRows.filter((r) => r.type === 'COST').reduce((s, r) => s + r.balance, 0)
    const totalExpense = nominalRows.filter((r) => r.type === 'EXPENSE').reduce((s, r) => s + r.balance, 0)
    nominalNetIncomeByYear.set(y, totalIncome - totalCost - totalExpense)
  }

  const activoNode = forest.find((n) => n.code === '1')
  const pasivoNode = forest.find((n) => n.code === '2')
  const patrimonioNode = forest.find((n) => n.code === '3')

  const activo = activoNode ? classSection(activoNode, years, leafBalancesByYear, { splitCurrent: CURRENT_ASSET_PREFIXES }) : null
  const pasivo = pasivoNode ? classSection(pasivoNode, years, leafBalancesByYear, { splitCurrent: CURRENT_LIABILITY_PREFIXES }) : null
  const patrimonio = patrimonioNode ? classSection(patrimonioNode, years, leafBalancesByYear) : null

  const netIncomeByYear = {}
  const totalEquityByYear = {}
  const totalLiabilitiesAndEquityByYear = {}
  const balancedByYear = {}
  for (const y of years) {
    const equityFromAccounts = patrimonio?.values?.[y] || 0
    const ni = nominalNetIncomeByYear.get(y)
    netIncomeByYear[y] = ni
    totalEquityByYear[y] = equityFromAccounts + ni
    totalLiabilitiesAndEquityByYear[y] = (pasivo?.values?.[y] || 0) + totalEquityByYear[y]
    balancedByYear[y] = Math.round((activo?.values?.[y] || 0) * 100) === Math.round(totalLiabilitiesAndEquityByYear[y] * 100)
  }

  return { years, activo, pasivo, patrimonio, netIncomeByYear, totalEquityByYear, totalLiabilitiesAndEquityByYear, balancedByYear }
}

// Estado de Resultados comparativo: cada columna se calcula con from/to
// acotado a ESE año calendario (no acumulado), para que "utilidad del
// ejercicio" de cada año sea la del año, no la del histórico completo.
export async function getIncomeStatementComparative(db, { years }) {
  if (!Array.isArray(years) || years.length === 0) throw new Error('years es obligatorio')

  const accounts = await db.account.findMany({ orderBy: { code: 'asc' } })
  const forest = buildAccountForest(accounts)

  const leafBalancesByYear = new Map()
  for (const y of years) {
    const rows = await getAllAccountBalancesRaw(db, {
      types: ['INCOME', 'EXPENSE', 'COST'],
      from: `${y}-01-01`,
      to: `${y}-12-31`,
      excludeClosing: true
    })
    leafBalancesByYear.set(y, new Map(rows.map((r) => [r.accountId, r.balance])))
  }

  const ingresoNode = forest.find((n) => n.code === '4')
  const gastoNode = forest.find((n) => n.code === '5')
  const costoNodes = forest.filter((n) => n.code === '6' || n.code === '7')

  const ingresos = ingresoNode ? classSection(ingresoNode, years, leafBalancesByYear) : null
  const gastos = gastoNode ? classSection(gastoNode, years, leafBalancesByYear) : null

  const costoGroups = costoNodes
    .flatMap((n) => n.childAccounts.map((g) => groupRow(g, years, leafBalancesByYear)))
    .filter((g) => g.accounts.length > 0)
  const costoValues = {}
  for (const y of years) costoValues[y] = costoNodes.reduce((s, n) => s + rollup(n, leafBalancesByYear.get(y)), 0)
  const costo = { code: '6', name: 'Costo de Ventas', values: costoValues, groups: costoGroups }

  const grossProfitByYear = {}
  const netIncomeByYear = {}
  for (const y of years) {
    const gp = (ingresos?.values?.[y] || 0) - (costoValues[y] || 0)
    grossProfitByYear[y] = gp
    netIncomeByYear[y] = gp - (gastos?.values?.[y] || 0)
  }

  return { years, ingresos, costo, gastos, grossProfitByYear, netIncomeByYear }
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
