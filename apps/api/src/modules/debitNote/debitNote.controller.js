import { createDebitNote, listDebitNotes, getDebitNoteById } from './debitNote.service.js'

export const create = async (req, res) => {
  try {
    const { invoiceId, reason, concept, items } = req.body
    if (!invoiceId || !reason || !items?.length) {
      return res.status(400).json({ ok: false, message: 'Factura, motivo e ítems son obligatorios' })
    }
    const debitNote = await createDebitNote(req.db, { invoiceId: Number(invoiceId), reason, concept, items }, req.user?.id)
    res.status(201).json({ ok: true, data: debitNote })
  } catch (error) {
    res.status(400).json({ ok: false, message: error.message })
  }
}

export const list = async (req, res) => {
  try {
    const data = await listDebitNotes(req.db)
    res.json({ ok: true, data })
  } catch (error) {
    res.status(400).json({ ok: false, message: error.message })
  }
}

export const getById = async (req, res) => {
  try {
    const data = await getDebitNoteById(req.db, Number(req.params.id))
    if (!data) return res.status(404).json({ ok: false, message: 'Nota débito no encontrada' })
    res.json({ ok: true, data })
  } catch (error) {
    res.status(400).json({ ok: false, message: error.message })
  }
}
