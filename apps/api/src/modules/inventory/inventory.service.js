export const OUT_TYPES = ["OUT", "SALE", "ADJUSTMENT", "TRANSFORM_OUT", "TRANSFER_OUT"]

export async function getKardex(db, productId) {

  const movements = await db.inventoryMovement.findMany({

    where: {
      productId
    },

    orderBy: {
      createdAt: "asc"
    }

  })

  let stock = 0

  const kardex = movements.map(m => {

    const signed = OUT_TYPES.includes(m.type) ? -m.quantity : m.quantity
    stock += signed

    return {
      id: m.id,
      date: m.createdAt,
      type: m.type,
      quantity: m.quantity,
      reference: m.reference,
      referenceId: m.referenceId,
      reason: m.reason,
      stock
    }

  })

  return kardex

}

export async function getKardexAll(db, { page = 1, limit = 25, search, type, productId } = {}) {

  const pageNum = Math.max(1, Number(page) || 1)
  const limitNum = Math.min(200, Math.max(1, Number(limit) || 25))

  const where = {
    ...(type ? { type } : {}),
    ...(productId ? { productId } : {}),
    ...(search
      ? {
        product: {
          OR: [
            { name: { contains: search, mode: "insensitive" } },
            { sku: { contains: search, mode: "insensitive" } }
          ]
        }
      }
      : {})
  }

  const [total, movements] = await Promise.all([
    db.inventoryMovement.count({ where }),
    db.inventoryMovement.findMany({
      where,
      include: { product: true, user: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      skip: (pageNum - 1) * limitNum,
      take: limitNum
    })
  ])

  return {
    data: movements.map(m => ({
      id: m.id,
      date: m.createdAt,
      productId: m.productId,
      product: m.product?.name,
      sku: m.product?.sku,
      type: m.type,
      quantity: m.quantity,
      direction: OUT_TYPES.includes(m.type) ? "OUT" : "IN",
      reference: m.reference,
      referenceId: m.referenceId,
      reason: m.reason,
      user: m.user?.name || null
    })),
    page: pageNum,
    limit: limitNum,
    total,
    totalPages: Math.max(1, Math.ceil(total / limitNum))
  }

}

export async function getStock(db, { search } = {}) {

  const products = await db.product.findMany({

    where: search
      ? {
        OR: [
          { name: { contains: search, mode: "insensitive" } },
          { sku: { contains: search, mode: "insensitive" } }
        ]
      }
      : {},

    select: {
      id: true,
      name: true,
      sku: true,
      barcode: true,
      type: true,
      category: true,
      brand: true,
      unit: true,
      price: true,
      cost: true,
      stock: true,
      minStock: true,
      maxStock: true,
      active: true
    },

    orderBy: { name: "asc" }

  })

  return products.map(p => {
    const value = Number(p.stock) * Number(p.cost || 0)
    let status = "normal"
    if (p.stock <= 0) status = "agotado"
    else if (p.stock <= (p.minStock || 0)) status = "bajo"
    else if (p.maxStock && p.stock > p.maxStock) status = "sobrestock"

    return { ...p, value, status }
  })

}

export async function getDashboard(db) {

  const products = await db.product.findMany({
    select: {
      id: true, name: true, sku: true, stock: true, cost: true,
      minStock: true, maxStock: true, active: true
    }
  })

  const totalProducts = products.length
  const totalValue = products.reduce((sum, p) => sum + Number(p.stock) * Number(p.cost || 0), 0)
  const agotados = products.filter(p => p.stock <= 0)
  const bajoStock = products.filter(p => p.stock > 0 && p.stock <= (p.minStock || 0))
  const sobreStock = products.filter(p => p.maxStock && p.stock > p.maxStock)

  const since = new Date()
  since.setDate(since.getDate() - 30)

  const salesMovements = await db.inventoryMovement.groupBy({
    by: ["productId"],
    where: { type: "SALE", createdAt: { gte: since } },
    _sum: { quantity: true }
  })

  const salesByProduct = new Map(salesMovements.map(s => [s.productId, s._sum.quantity || 0]))
  const productMap = new Map(products.map(p => [p.id, p]))

  const ranked = salesMovements
    .map(s => ({
      productId: s.productId,
      name: productMap.get(s.productId)?.name || s.productId,
      sku: productMap.get(s.productId)?.sku,
      quantity: s._sum.quantity || 0
    }))
    .sort((a, b) => b.quantity - a.quantity)

  const masVendidos = ranked.slice(0, 5)
  const menosVendidos = [...ranked].reverse().slice(0, 5)

  const totalVendidoUltimos30 = ranked.reduce((sum, r) => sum + r.quantity, 0)
  const stockPromedio = totalProducts ? products.reduce((s, p) => s + p.stock, 0) / totalProducts : 0
  const rotacion = stockPromedio > 0 ? Number((totalVendidoUltimos30 / stockPromedio).toFixed(2)) : 0

  return {
    totalProducts,
    totalValue,
    agotados: agotados.map(p => ({ id: p.id, name: p.name, sku: p.sku, stock: p.stock })),
    bajoStock: bajoStock.map(p => ({ id: p.id, name: p.name, sku: p.sku, stock: p.stock, minStock: p.minStock })),
    sobreStock: sobreStock.map(p => ({ id: p.id, name: p.name, sku: p.sku, stock: p.stock, maxStock: p.maxStock })),
    masVendidos,
    menosVendidos,
    rotacion
  }

}
