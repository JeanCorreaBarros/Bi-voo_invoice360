import { listReconciliations, createReconciliation } from './bankReconciliation.service.js'

export async function list(req, res) {
  try {
    const { bankAccountId } = req.query
    if (!bankAccountId) return res.status(400).json({ ok: false, message: 'bankAccountId es obligatorio' })
    const data = await listReconciliations(req.db, bankAccountId)
    res.json({ ok: true, data })
  } catch (error) {
    res.status(400).json({ ok: false, message: error.message })
  }
}

export async function create(req, res) {
  try {
    const data = await createReconciliation(req.db, req.body)
    res.status(201).json({ ok: true, data })
  } catch (error) {
    res.status(400).json({ ok: false, message: error.message })
  }
}
