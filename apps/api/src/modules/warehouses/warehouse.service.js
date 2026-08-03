import { OUT_TYPES } from '../inventory/inventory.service.js'

export async function getOrCreateDefaultWarehouse(db) {
  const existing = await db.warehouse.findFirst({ where: { isDefault: true } })
  if (existing) return existing
  return db.warehouse.create({ data: { name: 'Bodega Principal', code: 'PRINCIPAL', isDefault: true } })
}

export async function createWarehouse(db, { name, code, address }) {
  return db.warehouse.create({ data: { name, code: code || undefined, address: address || undefined } })
}

export async function listWarehouses(db, { active } = {}) {
  return db.warehouse.findMany({
    where: active === undefined ? {} : { active },
    orderBy: [{ isDefault: 'desc' }, { name: 'asc' }]
  })
}

export async function updateWarehouse(db, id, data) {
  const warehouse = await db.warehouse.findUnique({ where: { id } })
  if (!warehouse) throw new Error('Bodega no encontrada')
  return db.warehouse.update({ where: { id }, data })
}

export async function deactivateWarehouse(db, id) {
  const warehouse = await db.warehouse.findUnique({ where: { id } })
  if (!warehouse) throw new Error('Bodega no encontrada')
  if (warehouse.isDefault) throw new Error('No puedes desactivar la bodega principal')
  return db.warehouse.update({ where: { id }, data: { active: false } })
}

// Existencia por bodega: recorre todos los movimientos (agrupados por
// producto+bodega) y calcula el neto, igual que el kardex pero por bodega.
export async function getStockByWarehouse(db) {
  const [warehouses, products, movements] = await Promise.all([
    db.warehouse.findMany({ orderBy: [{ isDefault: 'desc' }, { name: 'asc' }] }),
    db.product.findMany({ where: { active: true }, select: { id: true, name: true, sku: true, unit: true } }),
    db.inventoryMovement.findMany({ select: { productId: true, warehouseId: true, type: true, quantity: true } })
  ])

  const totals = new Map()
  for (const m of movements) {
    if (!m.warehouseId) continue
    const signed = OUT_TYPES.includes(m.type) ? -m.quantity : m.quantity
    const key = `${m.productId}::${m.warehouseId}`
    totals.set(key, (totals.get(key) || 0) + signed)
  }

  return warehouses.map(w => ({
    warehouse: { id: w.id, name: w.name, code: w.code, isDefault: w.isDefault, active: w.active },
    products: products
      .map(p => ({
        productId: p.id,
        name: p.name,
        sku: p.sku,
        unit: p.unit,
        stock: totals.get(`${p.id}::${w.id}`) || 0
      }))
      .filter(p => p.stock !== 0)
  }))
}

export async function createTransfer(db, { productId, fromWarehouseId, toWarehouseId, quantity, reason, userId }) {
  if (fromWarehouseId === toWarehouseId) {
    throw new Error('La bodega de origen y destino no pueden ser la misma')
  }
  if (!quantity || quantity <= 0) {
    throw new Error('La cantidad debe ser mayor a cero')
  }

  const [product, fromWarehouse, toWarehouse] = await Promise.all([
    db.product.findUnique({ where: { id: productId } }),
    db.warehouse.findUnique({ where: { id: fromWarehouseId } }),
    db.warehouse.findUnique({ where: { id: toWarehouseId } })
  ])
  if (!product) throw new Error('Producto no encontrado')
  if (!fromWarehouse || !toWarehouse) throw new Error('Bodega no encontrada')

  const movements = await db.inventoryMovement.findMany({
    where: { productId, warehouseId: fromWarehouseId },
    select: { type: true, quantity: true }
  })
  const currentStock = movements.reduce(
    (sum, m) => sum + (OUT_TYPES.includes(m.type) ? -m.quantity : m.quantity),
    0
  )
  if (currentStock < quantity) {
    throw new Error(`Stock insuficiente en ${fromWarehouse.name}: disponible ${currentStock}`)
  }

  return db.$transaction(async (tx) => {
    const transfer = await tx.stockTransfer.create({
      data: { productId, fromWarehouseId, toWarehouseId, quantity, reason: reason || undefined, userId: userId || undefined }
    })

    await tx.inventoryMovement.create({
      data: {
        productId,
        type: 'TRANSFER_OUT',
        quantity,
        warehouseId: fromWarehouseId,
        reference: 'TRANSFER',
        referenceId: transfer.id,
        reason: reason || undefined,
        userId: userId || undefined
      }
    })

    await tx.inventoryMovement.create({
      data: {
        productId,
        type: 'TRANSFER_IN',
        quantity,
        warehouseId: toWarehouseId,
        reference: 'TRANSFER',
        referenceId: transfer.id,
        reason: reason || undefined,
        userId: userId || undefined
      }
    })

    return transfer
  })
}

export async function listTransfers(db, { page = 1, limit = 25 } = {}) {
  const pageNum = Math.max(1, Number(page) || 1)
  const limitNum = Math.min(200, Math.max(1, Number(limit) || 25))

  const [total, transfers] = await Promise.all([
    db.stockTransfer.count(),
    db.stockTransfer.findMany({
      include: {
        product: { select: { name: true, sku: true } },
        fromWarehouse: { select: { name: true } },
        toWarehouse: { select: { name: true } },
        user: { select: { name: true } }
      },
      orderBy: { createdAt: 'desc' },
      skip: (pageNum - 1) * limitNum,
      take: limitNum
    })
  ])

  return {
    data: transfers.map(t => ({
      id: t.id,
      product: t.product?.name,
      sku: t.product?.sku,
      fromWarehouse: t.fromWarehouse?.name,
      toWarehouse: t.toWarehouse?.name,
      quantity: t.quantity,
      reason: t.reason,
      user: t.user?.name || null,
      createdAt: t.createdAt
    })),
    page: pageNum,
    limit: limitNum,
    total,
    totalPages: Math.max(1, Math.ceil(total / limitNum))
  }
}
