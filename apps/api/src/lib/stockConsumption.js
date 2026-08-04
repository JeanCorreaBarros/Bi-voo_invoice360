// Punto único donde se descuenta/devuelve stock por una venta o devolución.
// Sabe manejar dos casos que un `tx.product.update` simple no puede:
//
//  - KIT: el producto vendido no tiene stock propio, así que se "explota"
//    en sus componentes (ProductComponent) y se aplica el mismo movimiento
//    a cada uno, recursivamente (permite kits de kits, con un límite de
//    profundidad defensivo).
//  - Lotes (tracksBatches): en vez de un solo movimiento, se consume por
//    FEFO (el lote que vence primero, sale primero) — puede generar varios
//    InventoryMovement, uno por lote tocado.
//
// Se usa `tx` (cliente dentro de una transacción Prisma) en ambas
// funciones porque siempre se llaman desde dentro de un $transaction en
// invoice.service.js / creditNote.service.js.

const MAX_KIT_DEPTH = 5

export async function consumeStock(tx, {
  productId,
  quantity,
  type = 'SALE',
  reference,
  referenceId,
  warehouseId,
  userId,
  reason,
  depth = 0
}) {
  if (depth > MAX_KIT_DEPTH) {
    throw new Error('Profundidad de kit excedida (¿kits que se referencian entre sí?)')
  }

  const product = await tx.product.findUnique({ where: { id: productId } })
  if (!product) throw new Error('Producto no existe')

  if (product.type === 'SERVICE') return

  if (product.type === 'KIT') {
    const components = await tx.kitComponent.findMany({ where: { kitProductId: productId } })
    if (components.length === 0) {
      throw new Error(`El kit "${product.name}" no tiene componentes configurados`)
    }
    for (const c of components) {
      await consumeStock(tx, {
        productId: c.componentProductId,
        quantity: c.quantity * quantity,
        type, reference, referenceId, warehouseId, userId, reason,
        depth: depth + 1
      })
    }
    return
  }

  if (product.stock < quantity) {
    throw new Error(`Stock insuficiente de "${product.name}": disponible ${product.stock}, requerido ${quantity}`)
  }

  await tx.product.update({ where: { id: productId }, data: { stock: { decrement: quantity } } })

  if (!product.tracksBatches) {
    await tx.inventoryMovement.create({
      data: { productId, type, quantity, reference, referenceId, warehouseId, userId, reason }
    })
    return
  }

  // Consumo FEFO: lotes con fecha de vencimiento más próxima primero;
  // los que no tienen fecha se consumen de último (orden natural de
  // Postgres para NULLS en ASC).
  let remaining = quantity
  const batches = await tx.productBatch.findMany({
    where: { productId, active: true, quantity: { gt: 0 } },
    orderBy: [{ expiryDate: 'asc' }, { createdAt: 'asc' }]
  })

  for (const batch of batches) {
    if (remaining <= 0) break
    const take = Math.min(batch.quantity, remaining)
    if (take <= 0) continue

    await tx.productBatch.update({ where: { id: batch.id }, data: { quantity: { decrement: take } } })
    await tx.inventoryMovement.create({
      data: { productId, type, quantity: take, reference, referenceId, warehouseId, userId, reason, batchId: batch.id }
    })
    remaining -= take
  }

  // El producto puede tener stock "general" no asignado a ningún lote
  // registrado (por ejemplo, si se ajustó manualmente antes de crear
  // lotes). Ese remanente se descuenta igual, sin lote asociado.
  if (remaining > 0) {
    await tx.inventoryMovement.create({
      data: { productId, type, quantity: remaining, reference, referenceId, warehouseId, userId, reason }
    })
  }
}

export async function returnStock(tx, {
  productId,
  quantity,
  type = 'RETURN',
  reference,
  referenceId,
  warehouseId,
  userId,
  reason,
  depth = 0
}) {
  if (depth > MAX_KIT_DEPTH) {
    throw new Error('Profundidad de kit excedida (¿kits que se referencian entre sí?)')
  }

  const product = await tx.product.findUnique({ where: { id: productId } })
  if (!product) throw new Error('Producto no existe')

  if (product.type === 'SERVICE') return

  if (product.type === 'KIT') {
    const components = await tx.kitComponent.findMany({ where: { kitProductId: productId } })
    for (const c of components) {
      await returnStock(tx, {
        productId: c.componentProductId,
        quantity: c.quantity * quantity,
        type, reference, referenceId, warehouseId, userId, reason,
        depth: depth + 1
      })
    }
    return
  }

  await tx.product.update({ where: { id: productId }, data: { stock: { increment: quantity } } })

  // Nota: una devolución no intenta adivinar de qué lote salió la
  // mercancía originalmente — para productos con lotes, el stock general
  // sube pero queda "sin lote"; se puede reconciliar manualmente desde
  // Inventario > Lotes si hace falta.
  await tx.inventoryMovement.create({
    data: { productId, type, quantity, reference, referenceId, warehouseId, userId, reason }
  })
}
