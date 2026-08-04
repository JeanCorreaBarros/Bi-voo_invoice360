import { returnStock } from '../../lib/stockConsumption.js'

// `db` debe ser el TenantPrismaClient de la empresa (req.db).
export async function createCreditNote(db, data, userId) {

  return db.$transaction(async (tx) => {

    // =====================================
    // 1️⃣ BUSCAR FACTURA
    // =====================================

    const invoice = await tx.invoice.findUnique({
      where: { id: data.invoiceId },
      include: { details: true }
    })

    if (!invoice)
      throw new Error("Factura no existe")

    // Nota: mientras no exista integración real con la DIAN (ver Fase B),
    // no hay un estado "aprobada por DIAN" alcanzable — solo exigimos que
    // la factura no esté ya anulada.
    if (invoice.status === "CANCELLED")
      throw new Error("No se puede hacer una nota crédito a una factura anulada")

    // =====================================
    // 2️⃣ VALIDAR ITEMS
    // =====================================

    if (!data.items || data.items.length === 0)
      throw new Error("Debe enviar items para la nota crédito")

    let total = 0

    const productsCache = []

    for (const item of data.items) {

      const product = await tx.product.findUnique({
        where: { id: item.productId }
      })

      if (!product)
        throw new Error("Producto no existe")

      const quantity = Number(item.quantity)
      const price = Number(item.price)

      const subtotal = quantity * price

      total += subtotal

      productsCache.push({
        product,
        quantity,
        price
      })
    }

    // =====================================
    // 3️⃣ CREAR NOTA CREDITO
    // =====================================

    const creditNote = await tx.creditNote.create({
      data: {
        invoiceId: data.invoiceId,
        reason: data.reason,
        amount: total,
        createdBy: userId || undefined
      }
    })

    // =====================================
    // 4️⃣ CREAR DETALLES
    // =====================================

    await tx.creditNoteDetail.createMany({
      data: productsCache.map(item => ({
        creditNoteId: creditNote.id,
        productId: item.product.id,
        quantity: item.quantity,
        price: item.price
      }))
    })

    // =====================================
    // 5️⃣ DEVOLVER STOCK
    // =====================================

    const defaultWarehouse = await tx.warehouse.findFirst({ where: { isDefault: true } })

    for (const item of productsCache) {
      await returnStock(tx, {
        productId: item.product.id,
        quantity: item.quantity,
        type: "RETURN",
        reference: "CREDIT_NOTE",
        referenceId: creditNote.id,
        warehouseId: defaultWarehouse?.id
      })
    }

    // =====================================
    // 6️⃣ ACTUALIZAR FACTURA
    // =====================================

    const newTotal = invoice.orderTotalAmountDue - total

    await tx.invoice.update({
      where: { id: invoice.id },
      data: {
        orderTotalAmountDue: newTotal,
        status: newTotal <= 0 ? "CANCELLED" : "PARTIAL"
      }
    })

    // =====================================
    // 7️⃣ RETORNAR COMPLETA
    // =====================================

    return await tx.creditNote.findUnique({
      where: { id: creditNote.id },
      include: {
        details: true,
        invoice: true
      }
    })

  })

}

export async function listCreditNotes(db) {
  return db.creditNote.findMany({
    include: {
      invoice: { select: { id: true, orderPrefix: true, orderId: true, orderReceiverName: true } },
      details: { include: { product: { select: { id: true, name: true, sku: true } } } },
      user: { select: { name: true } }
    },
    orderBy: { createdAt: 'desc' }
  })
}

export async function getCreditNoteById(db, id) {
  return db.creditNote.findUnique({
    where: { id },
    include: {
      invoice: true,
      details: { include: { product: true } },
      user: { select: { name: true } }
    }
  })
}