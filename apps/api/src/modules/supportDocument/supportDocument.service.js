// Documento soporte: lo emite la empresa cuando compra bienes/servicios a
// alguien no obligado a facturar. El envío real a la DIAN vive en la Fase B
// (integración DIAN) — por ahora queda en estado DRAFT como registro interno.
export async function createSupportDocument(db, data, userId) {
  if (!data.items || data.items.length === 0) {
    throw new Error('Debe enviar al menos un ítem')
  }

  let subtotal = 0
  const lines = data.items.map((item) => {
    const quantity = Number(item.quantity || 1)
    const price = Number(item.price)
    const total = quantity * price
    subtotal += total
    return {
      productId: item.productId || undefined,
      description: item.description,
      quantity,
      price,
      total
    }
  })

  const tax = Number(data.tax || 0)
  const total = subtotal + tax

  return db.$transaction(async (tx) => {
    const doc = await tx.supportDocument.create({
      data: {
        supplierName: data.supplierName,
        supplierNit: data.supplierNit || undefined,
        supplierIdType: data.supplierIdType || 'CC',
        concept: data.concept,
        subtotal,
        tax,
        total,
        userId: userId || undefined
      }
    })

    await tx.supportDocumentDetail.createMany({
      data: lines.map((l) => ({ ...l, supportDocumentId: doc.id }))
    })

    return tx.supportDocument.findUnique({
      where: { id: doc.id },
      include: { details: true }
    })
  })
}

export async function listSupportDocuments(db) {
  return db.supportDocument.findMany({
    include: { details: { include: { product: { select: { id: true, name: true, sku: true } } } }, user: { select: { name: true } } },
    orderBy: { createdAt: 'desc' }
  })
}

export async function getSupportDocumentById(db, id) {
  return db.supportDocument.findUnique({
    where: { id },
    include: { details: { include: { product: true } }, user: { select: { name: true } } }
  })
}

export async function cancelSupportDocument(db, id) {
  const doc = await db.supportDocument.findUnique({ where: { id } })
  if (!doc) throw new Error('Documento soporte no encontrado')
  if (doc.status === 'CANCELLED') throw new Error('El documento ya está anulado')
  return db.supportDocument.update({ where: { id }, data: { status: 'CANCELLED' } })
}
