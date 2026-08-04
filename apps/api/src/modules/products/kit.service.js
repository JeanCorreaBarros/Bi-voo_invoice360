export async function setKitComponents(db, kitProductId, components) {
  const kitProduct = await db.product.findUnique({ where: { id: kitProductId } })
  if (!kitProduct) throw new Error('Producto no existe')
  if (kitProduct.type !== 'KIT') throw new Error('El producto no es de tipo KIT')

  if (!Array.isArray(components) || components.length === 0) {
    throw new Error('Debes enviar al menos un componente')
  }

  for (const c of components) {
    if (c.componentProductId === kitProductId) {
      throw new Error('Un kit no puede contenerse a sí mismo')
    }
    if (!c.quantity || c.quantity <= 0) {
      throw new Error('La cantidad de cada componente debe ser mayor a cero')
    }
  }

  return db.$transaction(async (tx) => {
    await tx.kitComponent.deleteMany({ where: { kitProductId } })
    await tx.kitComponent.createMany({
      data: components.map((c) => ({
        kitProductId,
        componentProductId: c.componentProductId,
        quantity: Number(c.quantity)
      }))
    })
    return tx.kitComponent.findMany({
      where: { kitProductId },
      include: { componentProduct: { select: { id: true, name: true, sku: true, unit: true, cost: true } } }
    })
  })
}

export async function getKitComponents(db, kitProductId) {
  return db.kitComponent.findMany({
    where: { kitProductId },
    include: { componentProduct: { select: { id: true, name: true, sku: true, unit: true, cost: true, stock: true } } }
  })
}

export async function listKits(db) {
  return db.product.findMany({
    where: { type: 'KIT' },
    include: {
      components: {
        include: { componentProduct: { select: { id: true, name: true, sku: true, unit: true, stock: true, cost: true } } }
      }
    },
    orderBy: { name: 'asc' }
  })
}
