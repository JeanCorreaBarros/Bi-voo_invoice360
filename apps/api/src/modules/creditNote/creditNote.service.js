// Nota: este service no está enganchado a ninguna ruta/controller todavía.
// `db` debe ser el TenantPrismaClient de la empresa (req.db).
export async function createCreditNote(db, data) {

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

    if (invoice.dianStatus !== "APPROVED")
      throw new Error("Solo se pueden hacer notas crédito a facturas aprobadas")

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
        total
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

      if (item.product.type !== "SERVICE") {

        await tx.product.update({
          where: { id: item.product.id },
          data: {
            stock: { increment: item.quantity }
          }
        })

        await tx.inventoryMovement.create({
          data: {
            productId: item.product.id,
            type: "RETURN",
            quantity: item.quantity,
            reference: "CREDIT_NOTE",
            referenceId: creditNote.id,
            warehouseId: defaultWarehouse?.id
          }
        })
      }
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