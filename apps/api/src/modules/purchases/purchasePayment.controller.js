import { createPurchasePayment, listPurchasePayments, getPurchaseBalance } from './purchasePayment.service.js'

export async function create(req, res) {
  try {
    const payment = await createPurchasePayment(req.db, req.body, req.user.id)
    res.status(201).json({ ok: true, data: payment })
  } catch (error) {
    res.status(400).json({ ok: false, message: error.message })
  }
}

export async function list(req, res) {
  try {
    const data = await listPurchasePayments(req.db, req.params.purchaseId)
    res.json({ ok: true, data })
  } catch (error) {
    res.status(400).json({ ok: false, message: error.message })
  }
}

export async function balance(req, res) {
  try {
    const data = await getPurchaseBalance(req.db, req.params.purchaseId)
    res.json({ ok: true, data })
  } catch (error) {
    res.status(400).json({ ok: false, message: error.message })
  }
}
