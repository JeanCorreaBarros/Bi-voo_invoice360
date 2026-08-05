import { createInvoiceCore } from '../invoices/invoice.service.js'
import { createPaymentCore } from '../payments/payment.service.js'

// Cliente genérico "consumidor final" cuando el POS no captura un cliente
// puntual — NIT genérico DIAN para ventas sin identificación del comprador.
const DEFAULT_CUSTOMER = {
  name: 'Consumidor Final',
  nit: '222222222222',
  address: '-',
  phone: '',
  email: ''
}

// ===================================================
// CONFIGURACIÓN DEL POS (singleton por empresa)
// ===================================================

// Datos de la empresa para el encabezado del ticket impreso (nombre, NIT,
// dirección) — mismo modelo que usa la generación de PDF de facturas.
export async function getCompanyInfo(db) {
  const profile = await db.companyProfile.findFirst()
  if (!profile) return null
  return {
    businessName: profile.businessName,
    tradeName: profile.tradeName,
    nit: profile.nit,
    dv: profile.dv,
    address: profile.address,
    city: profile.city,
    phone: profile.phone
  }
}

export async function getPosSettings(db) {
  const settings = await db.posSettings.findUnique({
    where: { id: 1 },
    include: { resolution: true, warehouse: true }
  })

  return settings || { id: 1, resolutionId: null, resolution: null, warehouseId: null, warehouse: null }
}

export async function updatePosSettings(db, { resolutionId, warehouseId }) {
  if (resolutionId) {
    const resolution = await db.resolution.findUnique({ where: { id: Number(resolutionId) } })
    if (!resolution) throw new Error('La resolución seleccionada no existe')
    if (!resolution.active) throw new Error('La resolución seleccionada está inactiva')
  }

  if (warehouseId) {
    const warehouse = await db.warehouse.findUnique({ where: { id: warehouseId } })
    if (!warehouse) throw new Error('La bodega seleccionada no existe')
  }

  return db.posSettings.upsert({
    where: { id: 1 },
    update: {
      resolutionId: resolutionId ? Number(resolutionId) : null,
      warehouseId: warehouseId || null
    },
    create: {
      id: 1,
      resolutionId: resolutionId ? Number(resolutionId) : null,
      warehouseId: warehouseId || null
    },
    include: { resolution: true, warehouse: true }
  })
}

// ===================================================
// CATÁLOGO RÁPIDO (búsqueda por nombre / SKU / código de barras)
// ===================================================

export async function searchProducts(db, { q, limit } = {}) {
  const take = Math.min(Number(limit) || 30, 100)
  const query = (q || '').trim()

  const where = {
    active: true,
    ...(query
      ? {
          OR: [
            { name: { contains: query, mode: 'insensitive' } },
            { sku: { contains: query, mode: 'insensitive' } },
            { barcode: { equals: query } }
          ]
        }
      : {})
  }

  return db.product.findMany({
    where,
    orderBy: { name: 'asc' },
    take,
    select: {
      id: true,
      name: true,
      sku: true,
      barcode: true,
      type: true,
      unit: true,
      price: true,
      stock: true,
      category: true
    }
  })
}

// ===================================================
// TURNO DE CAJA
// ===================================================

export async function getCurrentSession(db) {
  return db.posSession.findFirst({
    where: { status: 'OPEN' },
    include: { openedBy: { select: { id: true, name: true } } },
    orderBy: { openedAt: 'desc' }
  })
}

export async function openSession(db, { userId, openingAmount, note }) {
  const existing = await getCurrentSession(db)
  if (existing) throw new Error('Ya hay un turno de caja abierto')

  return db.$transaction(async (tx) => {
    const session = await tx.posSession.create({
      data: {
        openingAmount: Number(openingAmount) || 0,
        note: note || null,
        openedById: userId
      }
    })

    await tx.cashMovement.create({
      data: {
        type: 'OPEN',
        amount: Number(openingAmount) || 0,
        note: 'Apertura de turno POS',
        userId,
        posSessionId: session.id
      }
    })

    return session
  })
}

async function computeExpectedCash(tx, sessionId, openingAmount) {
  const [cashPayments, cashIn, cashOut] = await Promise.all([
    tx.payment.aggregate({
      where: { posSessionId: sessionId, method: 'CASH' },
      _sum: { amount: true }
    }),
    tx.cashMovement.aggregate({
      where: { posSessionId: sessionId, type: 'IN' },
      _sum: { amount: true }
    }),
    tx.cashMovement.aggregate({
      where: { posSessionId: sessionId, type: 'OUT' },
      _sum: { amount: true }
    })
  ])

  return (
    Number(openingAmount) +
    Number(cashPayments._sum.amount || 0) +
    Number(cashIn._sum.amount || 0) -
    Number(cashOut._sum.amount || 0)
  )
}

export async function addCashMovement(db, { sessionId, userId, type, amount, reference, note }) {
  if (!['IN', 'OUT'].includes(type)) {
    throw new Error('Tipo de movimiento inválido')
  }

  return db.$transaction(async (tx) => {
    const session = await tx.posSession.findUnique({ where: { id: sessionId } })
    if (!session) throw new Error('Turno no encontrado')
    if (session.status !== 'OPEN') throw new Error('El turno ya está cerrado')

    return tx.cashMovement.create({
      data: {
        type,
        amount: Number(amount),
        reference: reference || null,
        note: note || null,
        userId,
        posSessionId: sessionId
      }
    })
  })
}

export async function closeSession(db, { sessionId, userId, countedCashAmount, note }) {
  return db.$transaction(async (tx) => {
    const session = await tx.posSession.findUnique({ where: { id: sessionId } })
    if (!session) throw new Error('Turno no encontrado')
    if (session.status !== 'OPEN') throw new Error('El turno ya está cerrado')

    const expected = await computeExpectedCash(tx, sessionId, session.openingAmount)
    const counted = Number(countedCashAmount)
    const difference = counted - expected

    await tx.cashMovement.create({
      data: {
        type: 'CLOSE',
        amount: counted,
        note: 'Cierre de turno POS',
        userId,
        posSessionId: sessionId
      }
    })

    return tx.posSession.update({
      where: { id: sessionId },
      data: {
        status: 'CLOSED',
        closedById: userId,
        closedAt: new Date(),
        expectedCashAmount: expected,
        countedCashAmount: counted,
        cashDifference: difference,
        note: note ?? session.note
      }
    })
  })
}

// ===================================================
// VENTA (factura + pagos + descuento de stock, todo atómico)
// ===================================================

// `data.items`: [{ productId, quantity, price?, discount? }]
// `data.payments`: [{ method, amount, reference?, note? }]
// `data.customer`: { name?, nit?, address?, phone?, email? } (opcional, si no se manda se usa Consumidor Final)
export async function createSale(db, data, userId) {
  const session = await getCurrentSession(db)
  if (!session) {
    throw new Error('Debes abrir un turno de caja antes de vender')
  }

  const settings = await getPosSettings(db)
  if (!settings.resolutionId || !settings.resolution) {
    throw new Error('Configura la resolución/prefijo del POS en Configuración antes de vender')
  }

  if (!Array.isArray(data.items) || data.items.length === 0) {
    throw new Error('El carrito está vacío')
  }
  if (!Array.isArray(data.payments) || data.payments.length === 0) {
    throw new Error('Debes registrar al menos un pago')
  }

  const customer = { ...DEFAULT_CUSTOMER, ...(data.customer || {}) }

  const invoiceItems = data.items.map((item) => ({
    productId: item.productId,
    orderItemQuantity: Number(item.quantity),
    ...(item.price !== undefined ? { orderItemPrice: Number(item.price) } : {}),
    ...(item.discount !== undefined ? { orderItemDesc: Number(item.discount) } : {})
  }))

  return db.$transaction(async (tx) => {
    const invoice = await createInvoiceCore(tx, {
      userId,
      orderPrefix: settings.resolution.prefix,
      orderReceiverName: customer.name,
      orderReceiverNit: customer.nit,
      orderReceiverAddress: customer.address,
      orderReceiverPhone: customer.phone,
      orderReceiverEmail: customer.email,
      note: data.note || 'Venta POS',
      items: invoiceItems,
      posSessionId: session.id,
      warehouseId: settings.warehouseId || undefined
    })

    // Total a cubrir por los pagos: lo que la factura recién creada
    // determinó que se debe (ya con descuentos/retenciones aplicados).
    let remaining = Number(invoice.orderTotalAmountDue)
    let changeDue = 0
    const recordedPayments = []

    for (const p of data.payments) {
      const amount = Number(p.amount)
      if (!amount || amount <= 0) continue

      if (remaining <= 0.0001) {
        if (p.method !== 'CASH') {
          throw new Error(`No se puede pagar más del total con ${p.method}`)
        }
        changeDue += amount
        continue
      }

      const applied = Math.min(amount, remaining)
      const leftover = amount - applied

      if (leftover > 0.0001) {
        if (p.method !== 'CASH') {
          throw new Error(`El pago con ${p.method} no puede exceder el saldo pendiente`)
        }
        changeDue += leftover
      }

      recordedPayments.push({
        method: p.method,
        amount: applied,
        reference: p.reference || null,
        note: p.note || null
      })
      remaining -= applied
    }

    if (remaining > 0.01) {
      throw new Error(`Pago insuficiente: falta ${remaining.toFixed(2)} por cubrir`)
    }

    const payments = []
    for (const p of recordedPayments) {
      const payment = await createPaymentCore(
        tx,
        { invoiceId: invoice.id, ...p, posSessionId: session.id },
        userId
      )
      payments.push(payment)
    }

    const finalInvoice = await tx.invoice.findUnique({
      where: { id: invoice.id },
      include: { details: { include: { product: true } }, payments: true }
    })

    return { invoice: finalInvoice, payments, change: Math.round(changeDue * 100) / 100 }
  })
}
