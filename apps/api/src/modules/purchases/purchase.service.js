export const createPurchase = async (db, data) => {

  return db.$transaction(async (tx) => {

    let subtotal = 0
    let tax = 0
    let total = 0

    const productsCache = []

    for (const item of data.items) {

      const product = await tx.product.findUnique({
        where: { id: item.productId }
      })

      if (!product)
        throw new Error('Producto no existe')

      if (product.type === "SERVICE")
        throw new Error('No se puede comprar un servicio')

      const itemTotal = Number(item.cost) * Number(item.quantity)
      const itemTax = itemTotal * 0.19

      subtotal += itemTotal
      tax += itemTax
      total += itemTotal + itemTax

      productsCache.push({
        product,
        quantity: item.quantity,
        cost: item.cost,
        total: itemTotal
      })
    }

    const purchase = await tx.purchase.create({
      data: {
        supplierName: data.supplierName,
        supplierNit: data.supplierNit,
        invoiceNumber: data.invoiceNumber,
        subtotal,
        tax,
        total,
        status: 'DRAFT'
      }
    })

    for (const item of productsCache) {

      await tx.purchaseDetail.create({
        data: {
          purchaseId: purchase.id,
          productId: item.product.id,
          quantity: item.quantity,
          cost: item.cost,
          total: item.total
        }
      })

      // AUMENTAR STOCK
      await tx.product.update({
        where: { id: item.product.id },
        data: {
          stock: {
            increment: item.quantity
          }
        }
      })

      // MOVIMIENTO INVENTARIO
      await tx.inventoryMovement.create({
        data: {
          productId: item.product.id,
          type: "PURCHASE",
          quantity: item.quantity,
          reference: "PURCHASE",
          referenceId: purchase.id
        }
      })
    }

    return purchase
  })
}

export const getPurchases = async (db, query) => {
  const {
    page = 1,
    limit = 10,
    supplier,
    startDate,
    endDate,
    status
  } = query

  const where = {}

  if (supplier) {
    where.supplierName = {
      contains: supplier,
      mode: 'insensitive'
    }
  }

  if (status) {
    where.status = status
  }

  if (startDate && endDate) {
    where.date = {
      gte: new Date(startDate),
      lte: new Date(endDate)
    }
  }

  const purchases = await db.purchase.findMany({
    where,
    include: {
      details: {
        include: { product: true }
      }
    },
    skip: (page - 1) * Number(limit),
    take: Number(limit),
    orderBy: { date: 'desc' }
  })

  const total = await db.purchase.count({ where })

  return {
    total,
    page: Number(page),
    totalPages: Math.ceil(total / Number(limit)),
    data: purchases
  }
}

export const getPurchaseById = async (db, id) => {
  return db.purchase.findUnique({
    where: { id: Number(id) },
    include: {
      details: {
        include: { product: true }
      }
    }
  })
}

export const cancelPurchase = async (db, id) => {

  return db.$transaction(async (tx) => {

    const purchase = await tx.purchase.findUnique({
      where: { id },
      include: { details: true }
    })

    if (!purchase)
      throw new Error('Compra no existe')

    if (purchase.status === 'CANCELLED')
      throw new Error('La compra ya está cancelada')

    // 🔥 Revertir inventario
    for (const detail of purchase.details) {

      await tx.product.update({
        where: { id: detail.productId },
        data: {
          stock: {
            decrement: Number(detail.quantity)
          }
        }
      })

      await tx.inventoryMovement.create({
        data: {
          productId: detail.productId,
          type: 'ADJUSTMENT',
          quantity: Number(detail.quantity),
          reference: 'PURCHASE_CANCEL',
          referenceId: purchase.id
        }
      })
    }

    // Cambiar estado
    const updated = await tx.purchase.update({
      where: { id },
      data: { status: 'CANCELLED' }
    })

    return updated
  })
}

export const updatePurchase = async (db, id, data) => {

  return db.$transaction(async (tx) => {

    const existing = await tx.purchase.findUnique({
      where: { id },
      include: { details: true }
    })

    if (!existing)
      throw new Error('Compra no existe')

    if (existing.status === 'CANCELLED')
      throw new Error('No se puede editar una compra cancelada')

    if (existing.status !== 'DRAFT')
      throw new Error('Solo se puede editar compras en estado DRAFT')

    // 🔥 1. Revertir inventario anterior
    for (const detail of existing.details) {
      await tx.product.update({
        where: { id: detail.productId },
        data: {
          stock: {
            decrement: Number(detail.quantity)
          }
        }
      })
      await tx.inventoryMovement.create({
        data: {
          productId: detail.productId,
          type: 'ADJUSTMENT',
          quantity: Number(detail.quantity),
          reference: 'PURCHASE_UPDATE_REVERT',
          referenceId: id
        }
      })
    }

    // 🔥 2. Eliminar detalles anteriores
    await tx.purchaseDetail.deleteMany({
      where: { purchaseId: id }
    })

    let subtotal = 0
    let tax = 0
    let total = 0

    // 🔥 3. Insertar nuevos detalles y actualizar stock
    for (const item of data.items) {

      const product = await tx.product.findUnique({
        where: { id: item.productId }
      })

      if (!product)
        throw new Error('Producto no existe')

      const itemTotal = Number(item.cost) * Number(item.quantity)
      const itemTax = itemTotal * 0.19

      subtotal += itemTotal
      tax += itemTax
      total += itemTotal + itemTax

      await tx.purchaseDetail.create({
        data: {
          purchaseId: id,
          productId: item.productId,
          quantity: item.quantity,
          cost: item.cost,
          total: itemTotal
        }
      })

      await tx.product.update({
        where: { id: item.productId },
        data: {
          stock: {
            increment: item.quantity
          }
        }
      })

      await tx.inventoryMovement.create({
        data: {
          productId: item.productId,
          type: 'ADJUSTMENT',
          quantity: item.quantity,
          reference: 'PURCHASE_UPDATE',
          referenceId: id
        }
      })
    }

    // 🔥 4. Actualizar compra
    const updated = await tx.purchase.update({
      where: { id },
      data: {
        supplierName: data.supplierName,
        supplierNit: data.supplierNit,
        invoiceNumber: data.invoiceNumber,
        subtotal,
        tax,
        total
      }
    })

    return updated
  })
}
