export async function createPayment(db, data) {

  return db.$transaction(async (tx) => {

    // 1️⃣ buscar factura
    const invoice = await tx.invoice.findUnique({
      where: { id: data.invoiceId },
      include: { payments: true }
    })

    if (!invoice)
      throw new Error("Factura no existe")

    if (invoice.status === "CANCELLED")
      throw new Error("Factura cancelada")

    // 2️⃣ crear pago
    const payment = await tx.payment.create({
      data: {
        invoiceId: data.invoiceId,
        amount: Number(data.amount),
        method: data.method,
        reference: data.reference || null
      }
    })

    // 3️⃣ calcular total pagado
    const totalPaid =
      invoice.payments.reduce((sum, p) => sum + Number(p.amount), 0)
      + Number(data.amount)

    const totalInvoice = invoice.orderTotalAmountDue

    let status = "PENDING"

    if (totalPaid === 0) {
      status = "PENDING"
    }

    else if (totalPaid < totalInvoice) {
      status = "PARTIAL"
    }

    else {
      status = "PAID"
    }

    // 4️⃣ actualizar factura
    await tx.invoice.update({
      where: { id: invoice.id },
      data: {
        orderAmountPaid: totalPaid,
        status
      }
    })

    return payment

  })

}
