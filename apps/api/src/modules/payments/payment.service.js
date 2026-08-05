import { causeInvoicePayment } from '../../lib/accountingHooks.js'

// Igual que en invoice.service.js: `createPayment` abre su propia
// transacción, `createPaymentCore` recibe un `tx` ya abierto para poder
// registrar varios pagos (efectivo + tarjeta + ...) junto con la factura
// del POS en una sola transacción atómica.
export async function createPayment(db, data, userId) {
  return db.$transaction(async (tx) => createPaymentCore(tx, data, userId))
}

export async function createPaymentCore(tx, data, userId) {
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
        reference: data.reference || null,
        note: data.note || null,
        createdBy: userId || null,
        posSessionId: data.posSessionId || null
      }
    })

    // CAUSACIÓN CONTABLE AUTOMÁTICA (si el evento está activo)
    await causeInvoicePayment(tx, {
      paymentId: payment.id,
      date: new Date(),
      userId,
      amount: data.amount,
      method: data.method
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
}
