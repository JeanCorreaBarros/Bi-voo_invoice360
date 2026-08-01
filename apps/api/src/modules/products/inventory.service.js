export async function moveStock(db, { productId, type, quantity, reason }) {
  const product = await db.product.findUnique({
    where: { id: productId }
  })

  if (!product) throw new Error('Producto no existe')

  let newStock = product.stock

  if (type === 'IN') newStock += quantity
  if (type === 'OUT') {
    if (product.stock < quantity) {
      throw new Error('Stock insuficiente')
    }
    newStock -= quantity
  }
  if (type === 'ADJUST') newStock = quantity

  return db.$transaction([
    db.product.update({
      where: { id: productId },
      data: { stock: newStock }
    }),
    db.inventoryMovement.create({
      data: { productId, type, quantity, reason }
    })
  ])
}
