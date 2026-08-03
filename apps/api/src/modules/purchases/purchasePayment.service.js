import { causePurchasePayment } from '../../lib/accountingHooks.js'

export async function createPurchasePayment(db, data, userId) {
  return db.$transaction(async (tx) => {
    const purchase = await tx.purchase.findUnique({
      where: { id: Number(data.purchaseId) },
      include: { payments: true }
    })

    if (!purchase) throw new Error('Compra no existe')
    if (purchase.status === 'CANCELLED') throw new Error('Compra cancelada')

    const alreadyPaid = purchase.payments.reduce((sum, p) => sum + Number(p.amount), 0)
    const balance = Number(purchase.total) - alreadyPaid
    if (Number(data.amount) > balance + 0.01) {
      throw new Error(`El pago (${data.amount}) supera el saldo pendiente (${balance.toFixed(2)})`)
    }

    const payment = await tx.purchasePayment.create({
      data: {
        purchaseId: purchase.id,
        amount: Number(data.amount),
        method: data.method,
        reference: data.reference || null,
        createdBy: userId || null
      }
    })

    await causePurchasePayment(tx, {
      purchasePaymentId: payment.id,
      date: new Date(),
      userId,
      amount: data.amount,
      method: data.method
    })

    return payment
  })
}

export async function listPurchasePayments(db, purchaseId) {
  return db.purchasePayment.findMany({
    where: { purchaseId: Number(purchaseId) },
    orderBy: { createdAt: 'desc' }
  })
}

export async function getPurchaseBalance(db, purchaseId) {
  const purchase = await db.purchase.findUnique({
    where: { id: Number(purchaseId) },
    include: { payments: true }
  })
  if (!purchase) throw new Error('Compra no existe')

  const paid = purchase.payments.reduce((sum, p) => sum + Number(p.amount), 0)
  return { total: Number(purchase.total), paid, balance: Number(purchase.total) - paid }
}
