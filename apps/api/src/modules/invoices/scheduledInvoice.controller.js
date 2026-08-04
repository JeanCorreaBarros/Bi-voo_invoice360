import * as service from './scheduledInvoice.service.js'

export async function create(req, res) {
  try {
    const data = await service.createScheduledInvoice(req.db, req.body)
    res.status(201).json({ ok: true, data })
  } catch (error) {
    res.status(400).json({ ok: false, message: error.message })
  }
}

export async function list(req, res) {
  try {
    const data = await service.listScheduledInvoices(req.db)
    res.json({ ok: true, data })
  } catch (error) {
    res.status(400).json({ ok: false, message: error.message })
  }
}

export async function cancel(req, res) {
  try {
    const data = await service.cancelScheduledInvoice(req.db, req.params.id)
    res.json({ ok: true, data })
  } catch (error) {
    res.status(400).json({ ok: false, message: error.message })
  }
}
