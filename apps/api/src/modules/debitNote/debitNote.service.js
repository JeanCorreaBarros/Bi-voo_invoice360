// Nota débito: aumenta el valor de una factura ya emitida (cobros
// adicionales, intereses de mora, correcciones al alza). No toca
// inventario — es un ajuste puramente financiero.
export async function createDebitNote(db, data, userId) {
  return db.$transaction(async (tx) => {
    const invoice = await tx.invoice.findUnique({ where: { id: data.invoiceId } })
    if (!invoice) throw new Error('Factura no existe')
    if (invoice.status === 'CANCELLED') {
      throw new Error('No se puede hacer una nota débito a una factura anulada')
    }

    if (!data.items || data.items.length === 0) {
      throw new Error('Debe enviar al menos un ítem para la nota débito')
    }

    let total = 0
    const lines = data.items.map((item) => {
      const quantity = Number(item.quantity || 1)
      const price = Number(item.price)
      total += quantity * price
      return {
        productId: item.productId || undefined,
        description: item.description,
        quantity,
        price
      }
    })

    const debitNote = await tx.debitNote.create({
      data: {
        invoiceId: data.invoiceId,
        reason: data.reason,
        concept: data.concept || undefined,
        amount: total,
        createdBy: userId || undefined
      }
    })

    await tx.debitNoteDetail.createMany({
      data: lines.map((l) => ({ ...l, debitNoteId: debitNote.id }))
    })

    const newTotal = Number(invoice.orderTotalAmountDue) + total
    await tx.invoice.update({
      where: { id: invoice.id },
      data: { orderTotalAmountDue: newTotal }
    })

    return tx.debitNote.findUnique({
      where: { id: debitNote.id },
      include: { details: true, invoice: true }
    })
  })
}

export async function listDebitNotes(db) {
  return db.debitNote.findMany({
    include: {
      invoice: { select: { id: true, orderPrefix: true, orderId: true, orderReceiverName: true } },
      details: true,
      user: { select: { name: true } }
    },
    orderBy: { createdAt: 'desc' }
  })
}

export async function getDebitNoteById(db, id) {
  return db.debitNote.findUnique({
    where: { id },
    include: { invoice: true, details: { include: { product: true } }, user: { select: { name: true } } }
  })
}
