export async function createVariant(db, parentId, data) {
  const parent = await db.product.findUnique({ where: { id: parentId } })
  if (!parent) throw new Error('Producto no existe')
  if (parent.parentId) throw new Error('Una variante no puede tener a su vez variantes')

  if (!data.sku) throw new Error('El SKU de la variante es obligatorio')
  if (!data.variantAttributes || Object.keys(data.variantAttributes).length === 0) {
    throw new Error('Debes especificar al menos un atributo de variante (ej: Talla, Color)')
  }

  return db.product.create({
    data: {
      name: data.name || parent.name,
      sku: data.sku,
      barcode: data.barcode || undefined,
      type: parent.type,
      description: data.description ?? parent.description,
      category: parent.category,
      brand: parent.brand,
      unit: data.unit || parent.unit,
      price: data.price != null ? Number(data.price) : parent.price,
      cost: data.cost != null ? Number(data.cost) : parent.cost,
      stock: data.stock != null ? Number(data.stock) : 0,
      minStock: data.minStock != null ? Number(data.minStock) : parent.minStock,
      maxStock: data.maxStock != null ? Number(data.maxStock) : parent.maxStock,
      parentId,
      variantAttributes: data.variantAttributes
    }
  })
}

export async function listVariants(db, parentId) {
  return db.product.findMany({ where: { parentId }, orderBy: { createdAt: 'asc' } })
}
