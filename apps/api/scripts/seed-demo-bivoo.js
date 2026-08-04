// Script de UNA SOLA VEZ para poblar la empresa demo "Bivoo Enterprise SAS"
// con facturas, compras, pagos y clientes/proveedores ficticios distribuidos
// en los últimos 3 años, para poder probar reportes (incluido el comparativo
// multi-año) con datos reales en vez de una base vacía.
//
// Uso: node scripts/seed-demo-bivoo.js
//
// No es parte de la app — es un script auxiliar de una vez, seguro de borrar
// después de usarlo.

import { getTenantClientByDbName } from '../src/lib/db.js'
import { createInvoice } from '../src/modules/invoices/invoice.service.js'
import { createPayment } from '../src/modules/payments/payment.service.js'
import { createPurchase } from '../src/modules/purchases/purchase.service.js'
import { createPurchasePayment } from '../src/modules/purchases/purchasePayment.service.js'

const DB_NAME = 'tenant_6743848_421d9d' // Bivoo Enterprise SAS
const YEARS = [2024, 2025, 2026]

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function randomDateInYear(year) {
  const now = new Date()
  const isCurrentYear = year === now.getFullYear()
  const start = new Date(Date.UTC(year, 0, 1, 12))
  const end = isCurrentYear ? now : new Date(Date.UTC(year, 11, 31, 12))
  const t = start.getTime() + Math.random() * Math.max(0, end.getTime() - start.getTime())
  return new Date(t)
}

function addDays(date, days) {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

const PRODUCTS = [
  { name: 'Cable Encauchetado 3x14 AWG (metro)', sku: 'DEMO-CAB-001', price: 4500, cost: 2800, unit: 'MT' },
  { name: 'Breaker Riel DIN 20A', sku: 'DEMO-BRK-020', price: 28000, cost: 17000, unit: 'UND' },
  { name: 'Bombillo LED 9W Luz Blanca', sku: 'DEMO-LED-009', price: 8500, cost: 4200, unit: 'UND' },
  { name: 'Tomacorriente Doble Polo a Tierra', sku: 'DEMO-TOM-002', price: 6200, cost: 3100, unit: 'UND' },
  { name: 'Tablero Eléctrico 12 Circuitos', sku: 'DEMO-TAB-012', price: 95000, cost: 58000, unit: 'UND' },
  { name: 'Cinta Aislante 3M (rollo)', sku: 'DEMO-CIN-3M', price: 3200, cost: 1600, unit: 'UND' }
]

const CUSTOMERS = [
  { name: 'Ferretería El Tornillo Feliz SAS', nit: '900111222' },
  { name: 'Constructora Vientos del Norte SAS', nit: '900333444' },
  { name: 'Distribuciones Eléctricas del Caribe SAS', nit: '900555666' },
  { name: 'Inversiones Palma Real SAS', nit: '900777888' },
  { name: 'Comercializadora Luz y Fuerza SAS', nit: '900999000' }
]

const SUPPLIERS = [
  { name: 'Importadora Eléctrica Andina SAS', nit: '901111222' },
  { name: 'Suministros Industriales del Sur SAS', nit: '901333444' },
  { name: 'Materiales y Cables SAS', nit: '901555666' },
  { name: 'Herramientas y Equipos JR SAS', nit: '901777888' }
]

async function ensureCausacionEnabled(db) {
  const events = ['fact_causacion_automatica', 'cont_causacion_compras', 'cont_causacion_pagos']
  const existing = await db.aIIntegrationSettings.findFirst()
  if (existing) {
    const merged = Array.from(new Set([...(existing.enabledEvents || []), ...events]))
    await db.aIIntegrationSettings.update({ where: { id: existing.id }, data: { enabledEvents: merged } })
  } else {
    await db.aIIntegrationSettings.create({ data: { enabledEvents: events } })
  }
  console.log('✔ Causación automática activada (facturas, compras, pagos)')
}

async function ensureResolution(db) {
  const existing = await db.resolution.findFirst({ where: { prefix: 'FE' } })
  if (existing) return existing
  const created = await db.resolution.create({
    data: { prefix: 'FE', currentNumber: 0, fromNumber: 1, toNumber: 100000, active: true }
  })
  console.log('✔ Resolución de facturación FE creada (demo, no válida ante la DIAN)')
  return created
}

async function ensureWarehouse(db) {
  let warehouse = await db.warehouse.findFirst({ where: { isDefault: true } })
  if (!warehouse) {
    warehouse = await db.warehouse.create({ data: { name: 'Bodega Principal', code: 'BOD-01', isDefault: true } })
    console.log('✔ Bodega Principal creada')
  }
  return warehouse
}

async function ensureProducts(db) {
  const products = []
  for (const p of PRODUCTS) {
    const existing = await db.product.findUnique({ where: { sku: p.sku } })
    if (existing) {
      products.push(existing)
      continue
    }
    products.push(
      await db.product.create({
        data: { name: p.name, sku: p.sku, price: p.price, cost: p.cost, unit: p.unit, stock: 500, minStock: 20, type: 'PRODUCT' }
      })
    )
  }
  console.log(`✔ ${products.length} productos demo listos`)
  return products
}

async function seedInvoices(db, { userId, products }) {
  let created = 0
  let paid = 0
  let partial = 0

  for (const year of YEARS) {
    const count = randInt(5, 7)
    for (let i = 0; i < count; i++) {
      const customer = pick(CUSTOMERS)
      const orderDate = randomDateInYear(year)
      const items = Array.from({ length: randInt(1, 3) }, () => ({
        productId: pick(products).id,
        quantity: randInt(1, 6)
      }))

      const invoice = await createInvoice(db, {
        orderPrefix: 'FE',
        orderReceiverName: customer.name,
        orderReceiverNit: customer.nit,
        orderReceiverAddress: 'Cra 1 # 1-01',
        userId,
        orderDate: orderDate.toISOString(),
        items
      })
      created++

      // Histórico (años cerrados) mayormente pagado; año en curso más mixto.
      const isPastYear = year < new Date().getFullYear()
      const roll = Math.random()
      const total = Number(invoice.orderTotalAmountDue)

      if ((isPastYear && roll < 0.8) || (!isPastYear && roll < 0.45)) {
        const payment = await createPayment(db, { invoiceId: invoice.id, amount: total, method: pick(['CASH', 'TRANSFER']) }, userId)
        const paidAt = addDays(orderDate, randInt(3, 20))
        await db.payment.update({ where: { id: payment.id }, data: { createdAt: paidAt } })
        await db.journalEntry.updateMany({ where: { source: 'PAYMENT', sourceId: String(payment.id) }, data: { date: paidAt } })
        paid++
      } else if ((isPastYear && roll < 0.95) || (!isPastYear && roll < 0.75)) {
        const partialAmount = Math.round(total * (0.3 + Math.random() * 0.4))
        const payment = await createPayment(db, { invoiceId: invoice.id, amount: partialAmount, method: pick(['CASH', 'TRANSFER']) }, userId)
        const paidAt = addDays(orderDate, randInt(3, 25))
        await db.payment.update({ where: { id: payment.id }, data: { createdAt: paidAt } })
        await db.journalEntry.updateMany({ where: { source: 'PAYMENT', sourceId: String(payment.id) }, data: { date: paidAt } })
        partial++
      }
      // el resto queda PENDING (sin pago) — cartera real para probar aging.
    }
  }
  console.log(`✔ ${created} facturas creadas (${paid} pagadas, ${partial} con abono parcial)`)
}

async function seedPurchases(db, { userId, products }) {
  let created = 0
  let paid = 0

  for (const year of YEARS) {
    const count = randInt(4, 6)
    for (let i = 0; i < count; i++) {
      const supplier = pick(SUPPLIERS)
      const purchaseDate = randomDateInYear(year)
      const items = Array.from({ length: randInt(1, 2) }, () => {
        const product = pick(products)
        return { productId: product.id, quantity: randInt(5, 30), cost: product.cost }
      })

      const purchase = await createPurchase(
        db,
        { supplierName: supplier.name, supplierNit: supplier.nit, invoiceNumber: String(randInt(10000, 99999)), items },
        userId
      )
      created++

      // createPurchase() no acepta fecha (siempre queda "hoy") — se
      // retrocede a mano junto con su comprobante contable para distribuir
      // las compras demo en los 3 años, igual que las facturas.
      await db.purchase.update({ where: { id: purchase.id }, data: { date: purchaseDate, status: 'ACTIVE' } })
      await db.journalEntry.updateMany({ where: { source: 'PURCHASE', sourceId: String(purchase.id) }, data: { date: purchaseDate } })

      const isPastYear = year < new Date().getFullYear()
      if ((isPastYear && Math.random() < 0.75) || (!isPastYear && Math.random() < 0.4)) {
        const payment = await createPurchasePayment(
          db,
          { purchaseId: purchase.id, amount: Number(purchase.total), method: pick(['CASH', 'TRANSFER']) },
          userId
        )
        const paidAt = addDays(purchaseDate, randInt(2, 15))
        await db.purchasePayment.update({ where: { id: payment.id }, data: { createdAt: paidAt } })
        await db.journalEntry.updateMany({ where: { source: 'PURCHASE_PAYMENT', sourceId: String(payment.id) }, data: { date: paidAt } })
        paid++
      }
    }
  }
  console.log(`✔ ${created} compras creadas (${paid} pagadas)`)
}

async function main() {
  const db = getTenantClientByDbName(DB_NAME)

  const user = await db.user.findFirst()
  if (!user) throw new Error('No hay ningún usuario en el tenant — crea el admin de la empresa primero')

  await ensureCausacionEnabled(db)
  await ensureResolution(db)
  await ensureWarehouse(db)
  const products = await ensureProducts(db)

  await seedInvoices(db, { userId: user.id, products })
  await seedPurchases(db, { userId: user.id, products })

  console.log('\n✅ Datos demo listos para Bivoo Enterprise SAS')
  await db.$disconnect()
}

main().catch((err) => {
  console.error('❌ Error sembrando datos demo:', err)
  process.exit(1)
})
