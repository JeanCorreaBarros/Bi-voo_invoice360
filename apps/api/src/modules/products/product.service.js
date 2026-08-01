export async function createProduct(db, data) {
  return db.product.create({
    data
  })
}

export async function listProducts(db, { active } = {}) {
  return db.product.findMany({
    where:
      active === undefined
        ? {}
        : { active }
  })
}


// Obtener producto por ID
export async function getProductById(db, id) {
  return db.product.findUnique({
    where: { id }
  })
}

// Editar producto
export async function updateProduct(db, id, data) {
  // Validar que exista
  const product = await db.product.findUnique({
    where: { id }
  })

  if (!product) {
    throw new Error('Producto no encontrado')
  }

  return db.product.update({
    where: { id },
    data
  })
}

export async function activateProduct(db, id) {
  return db.product.update({
    where: { id },
    data: { active: true }
  })
}

export async function deactivateProduct(db, id) {
  return db.product.update({
    where: { id },
    data: { active: false }
  })
}
