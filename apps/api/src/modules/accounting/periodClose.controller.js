import { listPeriodCloses, closeAccountingPeriod } from './periodClose.service.js'

export async function list(req, res) {
  try {
    const data = await listPeriodCloses(req.db)
    res.json({ ok: true, data })
  } catch (error) {
    res.status(400).json({ ok: false, message: error.message })
  }
}

export async function create(req, res) {
  try {
    const { periodEnd } = req.body
    if (!periodEnd) return res.status(400).json({ ok: false, message: 'periodEnd es requerido' })
    const data = await closeAccountingPeriod(req.db, { periodEnd, userId: req.user.id })
    // `entity` (además de `data`): el middleware de auditoría solo registra
    // cuando la respuesta trae `entity` (misma convención de journalEntry.controller.js).
    res.status(201).json({ ok: true, data, entity: data.close })
  } catch (error) {
    res.status(400).json({ ok: false, message: error.message })
  }
}
