function computeStatus(expiryDate, daysThreshold = 30) {
  if (!expiryDate) return "sin_vencimiento"
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const expiry = new Date(expiryDate)
  expiry.setHours(0, 0, 0, 0)
  const diffDays = Math.round((expiry - today) / (1000 * 60 * 60 * 24))
  if (diffDays < 0) return "vencido"
  if (diffDays <= daysThreshold) return "proximo"
  return "vigente"
}

export async function createBatch(db, { productId, batchNumber, manufactureDate, expiryDate, quantity, warehouseId, userId }) {
  const product = await db.product.findUnique({ where: { id: productId } })
  if (!product) throw new Error('Producto no existe')
  if (!batchNumber) throw new Error('El número de lote es obligatorio')
  if (!quantity || quantity <= 0) throw new Error('La cantidad debe ser mayor a cero')

  if (!product.tracksBatches) {
    await db.product.update({ where: { id: productId }, data: { tracksBatches: true } })
  }

  const resolvedWarehouseId = warehouseId || (await db.warehouse.findFirst({ where: { isDefault: true } }))?.id

  return db.$transaction(async (tx) => {
    const batch = await tx.productBatch.create({
      data: {
        productId,
        batchNumber,
        manufactureDate: manufactureDate ? new Date(manufactureDate) : undefined,
        expiryDate: expiryDate ? new Date(expiryDate) : undefined,
        initialQuantity: Number(quantity),
        quantity: Number(quantity)
      }
    })

    await tx.product.update({ where: { id: productId }, data: { stock: { increment: Number(quantity) } } })

    await tx.inventoryMovement.create({
      data: {
        productId,
        type: 'IN',
        quantity: Number(quantity),
        reference: 'BATCH_CREATE',
        referenceId: batch.id,
        warehouseId: resolvedWarehouseId,
        batchId: batch.id,
        userId: userId || undefined
      }
    })

    return batch
  })
}

export async function listBatches(db, { productId, status, daysThreshold = 30 } = {}) {
  const batches = await db.productBatch.findMany({
    where: {
      ...(productId ? { productId } : {}),
      active: true
    },
    include: { product: { select: { id: true, name: true, sku: true, unit: true } } },
    orderBy: [{ expiryDate: 'asc' }, { createdAt: 'asc' }]
  })

  const mapped = batches.map(b => ({
    id: b.id,
    productId: b.productId,
    productName: b.product?.name,
    sku: b.product?.sku,
    unit: b.product?.unit,
    batchNumber: b.batchNumber,
    manufactureDate: b.manufactureDate,
    expiryDate: b.expiryDate,
    initialQuantity: b.initialQuantity,
    quantity: b.quantity,
    status: computeStatus(b.expiryDate, daysThreshold),
    createdAt: b.createdAt
  }))

  return status ? mapped.filter(b => b.status === status) : mapped
}

export async function adjustBatch(db, batchId, { quantity, reason, userId }) {
  const batch = await db.productBatch.findUnique({ where: { id: Number(batchId) } })
  if (!batch) throw new Error('Lote no encontrado')

  const newQuantity = Number(quantity)
  if (newQuantity < 0) throw new Error('La cantidad no puede ser negativa')

  const delta = newQuantity - batch.quantity
  if (delta === 0) return batch

  const resolvedWarehouseId = (await db.warehouse.findFirst({ where: { isDefault: true } }))?.id

  return db.$transaction(async (tx) => {
    await tx.productBatch.update({ where: { id: batch.id }, data: { quantity: newQuantity } })

    await tx.product.update({
      where: { id: batch.productId },
      data: { stock: delta > 0 ? { increment: delta } : { decrement: Math.abs(delta) } }
    })

    await tx.inventoryMovement.create({
      data: {
        productId: batch.productId,
        type: 'ADJUST',
        quantity: Math.abs(delta),
        reference: 'BATCH_ADJUST',
        referenceId: batch.id,
        warehouseId: resolvedWarehouseId,
        batchId: batch.id,
        reason: reason || undefined,
        userId: userId || undefined
      }
    })

    return tx.productBatch.findUnique({ where: { id: batch.id } })
  })
}

export async function getExpiryAlerts(db, { daysThreshold = 30 } = {}) {
  const batches = await listBatches(db, { daysThreshold })
  return {
    vencidos: batches.filter(b => b.status === 'vencido'),
    proximosAVencer: batches.filter(b => b.status === 'proximo')
  }
}
