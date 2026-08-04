// Siembra una empresa marcada como DEMO con datos ficticios de todos los
// módulos, para poder mostrarla a un cliente sin cargar nada a mano.
//
// Se ejecuta desde company.service.js cuando se crea una empresa con
// isDemo = true, justo después de sembrar roles/PUC/parametrización.
//
// Todo lo que crea es ficticio y está fechado en los últimos 3 años, para
// que los reportes comparativos multi-año tengan con qué llenarse. Es
// idempotente por la vía simple: solo se llama una vez, al provisionar.

import { createInvoice } from '../modules/invoices/invoice.service.js'
import { createPayment } from '../modules/payments/payment.service.js'
import { createPurchase } from '../modules/purchases/purchase.service.js'
import { createPurchasePayment } from '../modules/purchases/purchasePayment.service.js'
import { createJournalEntryInTx } from '../modules/accounting/journalEntry.service.js'
import { closeAccountingPeriod } from '../modules/accounting/periodClose.service.js'

// ─────────────────────────── catálogos ficticios ───────────────────────────

const PRODUCTS = [
  { name: 'Cable Encauchetado 3x14 AWG (metro)', sku: 'DEMO-CAB-001', price: 4500, cost: 2800, unit: 'MT' },
  { name: 'Breaker Riel DIN 20A', sku: 'DEMO-BRK-020', price: 28000, cost: 17000, unit: 'UND' },
  { name: 'Bombillo LED 9W Luz Blanca', sku: 'DEMO-LED-009', price: 8500, cost: 4200, unit: 'UND' },
  { name: 'Tomacorriente Doble Polo a Tierra', sku: 'DEMO-TOM-002', price: 6200, cost: 3100, unit: 'UND' },
  { name: 'Tablero Eléctrico 12 Circuitos', sku: 'DEMO-TAB-012', price: 95000, cost: 58000, unit: 'UND' },
  { name: 'Cinta Aislante (rollo)', sku: 'DEMO-CIN-001', price: 3200, cost: 1600, unit: 'UND' },
  { name: 'Instalación y Mantenimiento Eléctrico (hora)', sku: 'DEMO-SRV-001', price: 65000, cost: 0, unit: 'HR', type: 'SERVICE' },
]

const CUSTOMERS = [
  { name: 'Ferretería El Tornillo Feliz SAS', nit: '900111222', email: 'compras@tornillofeliz.demo', phone: '3011112222', address: 'Cra 12 # 34-56' },
  { name: 'Constructora Vientos del Norte SAS', nit: '900333444', email: 'pagos@vientosnorte.demo', phone: '3013334444', address: 'Cl 45 # 6-78' },
  { name: 'Distribuciones Eléctricas del Caribe SAS', nit: '900555666', email: 'admin@delcaribe.demo', phone: '3015556666', address: 'Av Principal # 90-12' },
  { name: 'Inversiones Palma Real SAS', nit: '900777888', email: 'contabilidad@palmareal.demo', phone: '3017778888', address: 'Cra 3 # 21-09' },
  { name: 'Comercializadora Luz y Fuerza SAS', nit: '900999000', email: 'tesoreria@luzyfuerza.demo', phone: '3019990000', address: 'Cl 80 # 14-25' },
]

const SUPPLIERS = [
  { name: 'Importadora Eléctrica Andina SAS', nit: '901111222', email: 'ventas@andina.demo', phone: '3021112222', address: 'Zona Industrial Bod 4' },
  { name: 'Suministros Industriales del Sur SAS', nit: '901333444', email: 'cartera@sumsur.demo', phone: '3023334444', address: 'Km 5 Vía Sur' },
  { name: 'Materiales y Cables SAS', nit: '901555666', email: 'facturacion@matycables.demo', phone: '3025556666', address: 'Cra 50 # 10-20' },
  { name: 'Herramientas y Equipos JR SAS', nit: '901777888', email: 'info@jrequipos.demo', phone: '3027778888', address: 'Cl 33 # 44-55' },
]

// Roles de ejemplo además del ADMIN que ya siembra tenantRoles.js, para que
// la vista de Roles y Permisos no muestre un solo rol.
const DEMO_ROLES = [
  {
    name: 'CONTADOR',
    description: 'Acceso completo al módulo contable, solo lectura en el resto',
    permissions: [
      'accounting.entry.read', 'accounting.entry.manage', 'accounting.account.manage',
      'accounting.costcenter.manage', 'accounting.settings.manage', 'accounting.audit.read',
      'user.read', 'product.read',
    ],
  },
  {
    name: 'VENDEDOR',
    description: 'Factura y consulta productos, sin acceso contable',
    permissions: ['product.read', 'user.read'],
  },
  {
    name: 'AUXILIAR DE INVENTARIO',
    description: 'Gestiona el catálogo y las existencias de productos',
    permissions: ['product.create', 'product.read', 'product.update'],
  },
]

const COST_CENTERS = [
  { code: 'CC-ADM', name: 'Administración' },
  { code: 'CC-VEN', name: 'Comercial y Ventas' },
  { code: 'CC-OPE', name: 'Operaciones y Bodega' },
  { code: 'CC-PRO', name: 'Proyectos e Instalaciones' },
]

const BANK_ACCOUNTS = [
  { bankName: 'Bancolombia', accountNumber: '4571234567', accountType: 'CORRIENTE', puc: '111005' },
  { bankName: 'Davivienda', accountNumber: '0098765432', accountType: 'AHORROS', puc: '112005' },
]

const TAX_RATES = [
  { name: 'IVA General 19%', type: 'IVA', percentage: 19, puc: '240810' },
  { name: 'IVA Reducido 5%', type: 'IVA', percentage: 5, puc: '240810' },
  { name: 'Retefuente Compras 2.5%', type: 'RETEFUENTE', percentage: 2.5, puc: '240801' },
  { name: 'Retefuente Servicios 4%', type: 'RETEFUENTE', percentage: 4, puc: '240801' },
  { name: 'Retefuente Honorarios 11%', type: 'RETEFUENTE', percentage: 11, puc: '240801' },
  { name: 'ReteICA 7x1000', type: 'RETEICA', percentage: 0.7, puc: '240815' },
  { name: 'ReteIVA 15%', type: 'RETEIVA', percentage: 15, puc: '240810' },
]

const FIXED_ASSETS = [
  { code: 'AF-001', name: 'Camioneta de reparto NPR', puc: '154005', cost: 85000000, months: 120, yearsAgo: 2 },
  { code: 'AF-002', name: 'Estantería industrial de bodega', puc: '152405', cost: 12500000, months: 120, yearsAgo: 2 },
  { code: 'AF-003', name: 'Equipos de cómputo (5 estaciones)', puc: '152805', cost: 18000000, months: 60, yearsAgo: 1 },
  { code: 'AF-004', name: 'Montacargas eléctrico', puc: '156005', cost: 42000000, months: 120, yearsAgo: 1 },
]

// Gastos operativos recurrentes: le dan cuerpo al Estado de Resultados (sin
// esto la clase 5 queda vacía y la utilidad neta es igual a la bruta).
// Dimensionados contra la facturación objetivo (~$240M/año, ver
// INVOICE_LINE_TARGET) para que la empresa demo se vea rentable y no
// quemando caja.
const MONTHLY_EXPENSES = [
  { puc: '513506', name: 'Arrendamiento bodega y oficina', amount: 1200000 },
  { puc: '519525', name: 'Servicios públicos', amount: 350000 },
  { puc: '510506', name: 'Sueldos administración', amount: 1300000 },
  { puc: '520506', name: 'Sueldos ventas', amount: 600000 },
  { puc: '529510', name: 'Publicidad y propaganda', amount: 200000 },
  { puc: '530505', name: 'Gastos bancarios', amount: 100000 },
]

// Las cantidades de cada línea se derivan de un monto objetivo dividido por
// el precio/costo del producto, en vez de un rango fijo de unidades: así un
// tablero de $95.000 y una cinta de $3.200 generan líneas del mismo orden
// de magnitud y el volumen del negocio no depende de qué producto salga
// sorteado.
const INVOICE_LINE_TARGET = { min: 800000, max: 3500000 }
// Las compras se dimensionan para reponer aproximadamente lo vendido al
// costo: si fueran mucho mayores el inventario crecería sin parar y el
// balance quedaría desfigurado.
const PURCHASE_LINE_TARGET = { min: 1500000, max: 3800000 }
const INVOICES_PER_YEAR = { min: 30, max: 40 }
const PURCHASES_PER_YEAR = { min: 16, max: 22 }
// Inventario inicial por producto, aportado por los socios en especie.
const OPENING_INVENTORY_VALUE_PER_PRODUCT = 8000000

// ─────────────────────────── helpers ───────────────────────────

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)]
const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min

function addDays(date, days) {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

// Los 3 últimos años calendario, incluyendo el actual.
function demoYears() {
  const current = new Date().getFullYear()
  return [current - 2, current - 1, current]
}

// Fecha aleatoria dentro del año; si es el año en curso, nunca futura.
function randomDateInYear(year) {
  const now = new Date()
  const start = new Date(Date.UTC(year, 0, 15, 12))
  const end = year === now.getFullYear() ? now : new Date(Date.UTC(year, 11, 20, 12))
  if (end <= start) return start
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()))
}

async function accountIdByCode(db, code) {
  const account = await db.account.findUnique({ where: { code } })
  return account?.id ?? null
}

// ─────────────────────────── bloques de siembra ───────────────────────────

async function seedAutomationEvents(db) {
  // Sin estos toggles la causación automática no corre y el módulo contable
  // quedaría vacío aunque haya facturas y compras.
  const events = ['fact_causacion_automatica', 'cont_causacion_compras', 'cont_causacion_pagos']
  const existing = await db.aIIntegrationSettings.findFirst()
  if (existing) {
    const merged = Array.from(new Set([...(existing.enabledEvents || []), ...events]))
    await db.aIIntegrationSettings.update({ where: { id: existing.id }, data: { enabledEvents: merged } })
  } else {
    await db.aIIntegrationSettings.create({ data: { enabledEvents: events } })
  }
}

async function seedResolution(db) {
  const existing = await db.resolution.findFirst({ where: { prefix: 'FE' } })
  if (existing) return existing
  return db.resolution.create({
    data: { prefix: 'FE', currentNumber: 0, fromNumber: 1, toNumber: 100000, active: true }
  })
}

async function seedWarehouses(db) {
  const existing = await db.warehouse.findFirst({ where: { isDefault: true } })
  if (existing) return existing
  await db.warehouse.create({ data: { name: 'Bodega Secundaria', code: 'BOD-02', isDefault: false } })
  return db.warehouse.create({ data: { name: 'Bodega Principal', code: 'BOD-01', isDefault: true } })
}

async function seedCatalogs(db) {
  const products = []
  for (const p of PRODUCTS) {
    const isService = p.type === 'SERVICE'
    const openingStock = isService
      ? 0
      : Math.round(OPENING_INVENTORY_VALUE_PER_PRODUCT / p.cost)

    products.push(
      await db.product.create({
        data: {
          name: p.name,
          sku: p.sku,
          price: p.price,
          cost: p.cost,
          unit: p.unit,
          type: p.type || 'PRODUCT',
          stock: openingStock,
          minStock: isService ? 0 : Math.round(openingStock * 0.1),
        }
      })
    )
  }

  for (const c of CUSTOMERS) await db.customer.create({ data: c })
  for (const s of SUPPLIERS) await db.supplier.create({ data: s })
  for (const cc of COST_CENTERS) await db.costCenter.create({ data: cc })

  return products
}

async function seedRoles(db) {
  for (const role of DEMO_ROLES) {
    const permissions = await db.permission.findMany({
      where: { code: { in: role.permissions } },
      select: { id: true },
    })

    await db.role.create({
      data: {
        name: role.name,
        description: role.description,
        permissions: { create: permissions.map((p) => ({ permissionId: p.id })) },
      },
    })
  }
}

async function seedBankAccounts(db) {
  const accounts = []
  for (const b of BANK_ACCOUNTS) {
    accounts.push(
      await db.bankAccount.create({
        data: {
          bankName: b.bankName,
          accountNumber: b.accountNumber,
          accountType: b.accountType,
          accountId: await accountIdByCode(db, b.puc),
        }
      })
    )
  }
  return accounts
}

async function seedTaxRates(db) {
  for (const t of TAX_RATES) {
    await db.taxRate.create({
      data: {
        name: t.name,
        type: t.type,
        percentage: t.percentage,
        accountId: await accountIdByCode(db, t.puc),
      }
    })
  }
}

async function seedFixedAssets(db) {
  const currentYear = new Date().getFullYear()
  for (const a of FIXED_ASSETS) {
    const purchaseDate = new Date(Date.UTC(currentYear - a.yearsAgo, randInt(0, 11), 15, 12))
    const monthsElapsed = Math.max(
      0,
      (new Date().getFullYear() - purchaseDate.getUTCFullYear()) * 12 +
        (new Date().getMonth() - purchaseDate.getUTCMonth())
    )
    const depreciableMonths = Math.min(monthsElapsed, a.months)
    const accumulated = Math.round((a.cost / a.months) * depreciableMonths)

    await db.fixedAsset.create({
      data: {
        code: a.code,
        name: a.name,
        accountId: await accountIdByCode(db, a.puc),
        purchaseDate,
        purchaseCost: a.cost,
        usefulLifeMonths: a.months,
        accumulatedDepreciation: accumulated,
        lastDepreciatedAt: depreciableMonths > 0 ? new Date() : null,
      }
    })
  }
}

async function seedBudgets(db) {
  // Presupuesto del año en curso para las cuentas de ingreso y gasto que el
  // resto del seed sí mueve, así la vista de presupuesto vs. ejecución
  // muestra ambas columnas con datos.
  const year = new Date().getFullYear()
  const budgeted = [
    { code: '413595', monthly: 20000000 },
    { code: '613505', monthly: 12000000 },
    ...MONTHLY_EXPENSES.map((e) => ({ code: e.puc, monthly: e.amount })),
  ]

  for (const b of budgeted) {
    const accountId = await accountIdByCode(db, b.code)
    if (!accountId) continue
    for (let month = 1; month <= 12; month++) {
      // ±15% de variación mes a mes, para que no sea una línea plana.
      const amount = Math.round(b.monthly * (0.85 + Math.random() * 0.3))
      await db.budget.create({
        data: { accountId, year, month, budgetedAmount: amount }
      })
    }
  }
}

async function seedOperatingExpenses(db, userId) {
  // Un comprobante de gastos por mes, pagado desde bancos.
  const bankAccountId = await accountIdByCode(db, '111005')
  if (!bankAccountId) return

  const lines = []
  for (const e of MONTHLY_EXPENSES) {
    const accountId = await accountIdByCode(db, e.puc)
    if (accountId) lines.push({ accountId, name: e.name, amount: e.amount })
  }
  if (lines.length === 0) return

  const now = new Date()
  for (const year of demoYears()) {
    const lastMonth = year === now.getFullYear() ? now.getMonth() : 11
    for (let month = 0; month <= lastMonth; month++) {
      const date = new Date(Date.UTC(year, month, 28, 12))
      if (date > now) continue

      const entryLines = []
      let total = 0
      for (const l of lines) {
        const amount = Math.round(l.amount * (0.9 + Math.random() * 0.2))
        total += amount
        entryLines.push({ accountId: l.accountId, debit: amount, credit: 0, description: l.name })
      }
      entryLines.push({ accountId: bankAccountId, debit: 0, credit: total, description: 'Pago gastos del mes' })

      await db.$transaction((tx) =>
        createJournalEntryInTx(tx, {
          type: 'EGRESO',
          date,
          description: `Gastos operativos ${date.toISOString().slice(0, 7)}`,
          source: 'MANUAL',
          createdBy: userId,
          lines: entryLines,
        })
      )
    }
  }
}

// Aporte inicial de los socios: efectivo, banco e inventario en especie.
// El inventario se aporta por el valor al costo del stock de apertura que
// seedCatalogs le dio a cada producto, si no la cuenta 143505 se iría a
// negativo al registrarse el costo de las primeras ventas.
async function seedCapital(db, userId, products) {
  const firstYear = demoYears()[0]
  const bank = await accountIdByCode(db, '111005')
  const cash = await accountIdByCode(db, '110505')
  const inventory = await accountIdByCode(db, '143505')
  const capital = await accountIdByCode(db, '310505')
  if (!bank || !cash || !inventory || !capital) return

  const openingInventory = products.reduce(
    (sum, p) => sum + Number(p.stock) * Number(p.cost || 0),
    0
  )

  const bankContribution = 60000000
  const cashContribution = 5000000

  await db.$transaction((tx) =>
    createJournalEntryInTx(tx, {
      type: 'AJUSTE',
      date: new Date(Date.UTC(firstYear, 0, 2, 12)),
      description: 'Aporte de capital inicial de socios',
      source: 'MANUAL',
      createdBy: userId,
      lines: [
        { accountId: bank, debit: bankContribution, credit: 0, description: 'Aporte en efectivo' },
        { accountId: cash, debit: cashContribution, credit: 0, description: 'Aporte en efectivo' },
        { accountId: inventory, debit: openingInventory, credit: 0, description: 'Aporte de inventario en especie' },
        {
          accountId: capital,
          debit: 0,
          credit: bankContribution + cashContribution + openingInventory,
          description: 'Capital suscrito y pagado',
        },
      ],
    })
  )
}

// Se planean todas las facturas antes de crear nada, para poder calcular
// cuánta mercancía hay que comprar. createInvoice valida stock disponible,
// así que comprar "al azar" dejaba productos sin existencias y reventaba el
// seed según cómo cayera el sorteo.
function planInvoices(products) {
  const plan = []
  for (const year of demoYears()) {
    for (let i = 0; i < randInt(INVOICES_PER_YEAR.min, INVOICES_PER_YEAR.max); i++) {
      const items = Array.from({ length: randInt(1, 4) }, () => {
        const product = pick(products)
        const target = randInt(INVOICE_LINE_TARGET.min, INVOICE_LINE_TARGET.max)
        return {
          productId: product.id,
          quantity: Math.max(1, Math.round(target / Number(product.price))),
        }
      })

      plan.push({
        year,
        orderDate: randomDateInYear(year),
        customer: pick(CUSTOMERS),
        plazoPago: String(pick([0, 15, 30, 30, 45])),
        items,
      })
    }
  }
  return plan
}

// Unidades que hay que tener en bodega por producto para que el plan de
// facturación se pueda ejecutar completo.
function requiredUnitsByProduct(invoicePlan) {
  const required = new Map()
  for (const invoice of invoicePlan) {
    for (const item of invoice.items) {
      required.set(item.productId, (required.get(item.productId) || 0) + item.quantity)
    }
  }
  return required
}

async function seedInvoices(db, { userId, invoicePlan }) {
  const now = new Date()

  for (const { year, orderDate, customer, plazoPago, items } of invoicePlan) {
    const invoice = await createInvoice(db, {
      orderPrefix: 'FE',
      orderReceiverName: customer.name,
      orderReceiverNit: customer.nit,
      orderReceiverAddress: customer.address,
      orderReceiverEmail: customer.email,
      orderReceiverPhone: customer.phone,
      userId,
      orderDate: orderDate.toISOString(),
      plazoPago,
      items,
    })

    // createInvoice respeta orderDate pero createdAt queda en "ahora" (lo
    // pone Prisma). El dashboard y los listados se ordenan y filtran por
    // createdAt, así que sin esto toda la historia demo aparecería creada
    // hoy y "ventas del mes" acumularía los tres años.
    await db.invoice.update({ where: { id: invoice.id }, data: { createdAt: orderDate } })

    const total = Number(invoice.orderTotalAmountDue)
    if (total <= 0) continue

    // Los años cerrados quedan casi todos cobrados; el año en curso deja
    // cartera viva (pendiente y parcial) para que Cartera/Cobros tengan
    // algo real que mostrar.
    const isPastYear = year < now.getFullYear()
    const roll = Math.random()
    const payFull = isPastYear ? roll < 0.85 : roll < 0.4
    const payPartial = !payFull && (isPastYear ? roll < 0.95 : roll < 0.7)

    if (payFull || payPartial) {
      const amount = payFull ? total : Math.round(total * (0.3 + Math.random() * 0.4))
      const payment = await createPayment(
        db,
        { invoiceId: invoice.id, amount, method: pick(['CASH', 'TRANSFER', 'TRANSFER', 'CARD']) },
        userId
      )
      const paidAt = addDays(orderDate, randInt(3, 25))
      await db.payment.update({ where: { id: payment.id }, data: { createdAt: paidAt } })
      await db.journalEntry.updateMany({
        where: { source: 'PAYMENT', sourceId: String(payment.id) },
        data: { date: paidAt },
      })
    }
  }
}

// Reparte las unidades que cada producto necesita (según el plan de
// facturación, menos lo que ya cubre el inventario inicial) en líneas de
// compra distribuidas por año, y las agrupa en facturas de proveedor de 1 a
// 3 líneas. Así el stock siempre alcanza sin depender de la suerte.
function planPurchases(products, invoicePlan) {
  const required = requiredUnitsByProduct(invoicePlan)
  const years = demoYears()
  const lines = []

  for (const product of products) {
    if (product.type === 'SERVICE') continue

    const needed = required.get(product.id) || 0
    // 15% de margen y descontando lo aportado como inventario inicial.
    const toBuy = Math.max(0, Math.round(needed * 1.15) - Number(product.stock))
    if (toBuy <= 0) continue

    // 4 a 7 reposiciones por año, del tamaño que resulte.
    const chunksPerYear = randInt(4, 7)
    const totalChunks = chunksPerYear * years.length
    const perChunk = Math.max(1, Math.ceil(toBuy / totalChunks))

    for (const year of years) {
      for (let i = 0; i < chunksPerYear; i++) {
        lines.push({
          year,
          productId: product.id,
          quantity: perChunk,
          cost: Number(product.cost),
        })
      }
    }
  }

  // Se agrupan por año en compras de 1-3 líneas, mezcladas para que una
  // misma factura de proveedor traiga productos distintos.
  const purchases = []
  for (const year of years) {
    const yearLines = lines.filter((l) => l.year === year).sort(() => Math.random() - 0.5)
    for (let i = 0; i < yearLines.length; ) {
      const size = Math.min(randInt(1, 3), yearLines.length - i)
      purchases.push({
        year,
        date: randomDateInYear(year),
        supplier: pick(SUPPLIERS),
        items: yearLines.slice(i, i + size).map((l) => ({
          productId: l.productId,
          quantity: l.quantity,
          cost: l.cost,
        })),
      })
      i += size
    }
  }
  return purchases
}

async function seedPurchases(db, { userId, purchasePlan }) {
  const now = new Date()

  for (const { year, date, supplier, items } of purchasePlan) {
    const purchase = await createPurchase(
      db,
      {
        supplierName: supplier.name,
        supplierNit: supplier.nit,
        invoiceNumber: String(randInt(10000, 99999)),
        items,
      },
      userId
    )

    // createPurchase() siempre fecha la compra "hoy"; se retrocede junto
    // con su comprobante para distribuirlas en los 3 años.
    await db.purchase.update({
      where: { id: purchase.id },
      data: { date, createdAt: date, status: 'ACTIVE' },
    })
    await db.journalEntry.updateMany({
      where: { source: 'PURCHASE', sourceId: String(purchase.id) },
      data: { date },
    })

    const isPastYear = year < now.getFullYear()
    if (isPastYear ? Math.random() < 0.85 : Math.random() < 0.45) {
      const payment = await createPurchasePayment(
        db,
        { purchaseId: purchase.id, amount: Number(purchase.total), method: pick(['CASH', 'TRANSFER']) },
        userId
      )
      const paidAt = addDays(date, randInt(2, 20))
      await db.purchasePayment.update({ where: { id: payment.id }, data: { createdAt: paidAt } })
      await db.journalEntry.updateMany({
        where: { source: 'PURCHASE_PAYMENT', sourceId: String(payment.id) },
        data: { date: paidAt },
      })
    }
  }
}

async function seedBankReconciliations(db, bankAccounts) {
  if (bankAccounts.length === 0) return

  // Últimos 6 cierres de mes. El saldo contable se toma del libro a esa
  // fecha y el del extracto se desvía un poco (partidas conciliatorias
  // típicas: cheques girados y no cobrados), que es justo lo que la vista
  // de conciliación existe para mostrar.
  const bankAccount = bankAccounts[0]
  const now = new Date()

  for (let i = 6; i >= 1; i--) {
    const statementDate = new Date(Date.UTC(now.getFullYear(), now.getMonth() - i + 1, 0, 12))
    if (statementDate > now) continue

    const lines = await db.journalEntryLine.findMany({
      where: {
        accountId: bankAccount.accountId,
        journalEntry: { status: { not: 'VOID' }, date: { lte: statementDate } },
      },
      select: { debit: true, credit: true },
    })
    const bookBalance = lines.reduce((sum, l) => sum + Number(l.debit) - Number(l.credit), 0)
    const difference = i <= 2 ? Math.round(randInt(-450000, 450000) / 1000) * 1000 : 0
    const statementBalance = bookBalance + difference

    await db.bankReconciliation.create({
      data: {
        bankAccountId: bankAccount.id,
        statementDate,
        statementBalance,
        bookBalance,
        difference,
        status: difference === 0 ? 'CLOSED' : 'OPEN',
        note: difference === 0
          ? 'Conciliación sin diferencias'
          : 'Diferencia por cheques girados pendientes de cobro',
      }
    })
  }
}

async function seedPeriodCloses(db, userId) {
  // Cierra los años anteriores (el actual se deja abierto, que es lo
  // normal). closeAccountingPeriod ya valida que haya saldos que cerrar.
  const years = demoYears()
  const closable = years.slice(0, -1)

  for (const year of closable) {
    try {
      await closeAccountingPeriod(db, { periodEnd: `${year}-12-31`, userId })
    } catch {
      // Si un año no tiene movimiento no hay nada que cerrar: no es un error
      // para el seed, simplemente no se genera ese cierre.
    }
  }
}

async function seedAuditLogs(db, userId) {
  const samples = [
    { action: 'CREATE', module: 'invoices', entityId: 'FE-001' },
    { action: 'UPDATE', module: 'products', entityId: 'DEMO-LED-009' },
    { action: 'CREATE', module: 'purchases', entityId: '1' },
    { action: 'UPDATE', module: 'accounting', entityId: 'settings' },
    { action: 'CREATE', module: 'users', entityId: 'demo' },
    { action: 'DELETE', module: 'inventory', entityId: 'mov-88' },
    { action: 'UPDATE', module: 'customers', entityId: '900111222' },
    { action: 'CREATE', module: 'treasury', entityId: 'rec-3' },
  ]

  for (let i = 0; i < samples.length; i++) {
    const s = samples[i]
    await db.auditLog.create({
      data: {
        userId,
        action: s.action,
        module: s.module,
        entityId: s.entityId,
        ip: `190.85.${randInt(1, 254)}.${randInt(1, 254)}`,
        before: s.action === 'CREATE' ? undefined : { estado: 'anterior' },
        after: s.action === 'DELETE' ? undefined : { estado: 'actual' },
        createdAt: addDays(new Date(), -randInt(1, 60)),
      }
    })
  }
}

// ─────────────────────────── entrypoint ───────────────────────────

/**
 * Llena la BD de un tenant recién provisionado con datos demo de todos los
 * módulos. Debe llamarse DESPUÉS de seedTenantRolesAndPermissions,
 * seedChartOfAccounts y seedAccountingSettings (necesita el PUC y la
 * parametrización contable ya sembrados) y con el usuario admin ya creado.
 */
export async function seedDemoData(tenantDb, { userId }) {
  await seedAutomationEvents(tenantDb)
  await seedResolution(tenantDb)
  await seedWarehouses(tenantDb)

  await seedRoles(tenantDb)
  const products = await seedCatalogs(tenantDb)
  const bankAccounts = await seedBankAccounts(tenantDb)
  await seedTaxRates(tenantDb)
  await seedFixedAssets(tenantDb)

  await seedCapital(tenantDb, userId, products)

  // Compras antes que facturas: createInvoice valida stock disponible, así
  // que la mercancía debe estar comprada (o aportada como inventario
  // inicial) antes de poder venderse. El plan de facturación se calcula
  // primero justamente para saber cuánto comprar de cada producto.
  const invoicePlan = planInvoices(products)
  await seedPurchases(tenantDb, { userId, purchasePlan: planPurchases(products, invoicePlan) })
  await seedInvoices(tenantDb, { userId, invoicePlan })
  await seedOperatingExpenses(tenantDb, userId)

  await seedBudgets(tenantDb)
  await seedBankReconciliations(tenantDb, bankAccounts)
  await seedPeriodCloses(tenantDb, userId)
  await seedAuditLogs(tenantDb, userId)
}
