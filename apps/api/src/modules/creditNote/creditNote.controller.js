import { createCreditNote, listCreditNotes, getCreditNoteById } from './creditNote.service.js'

export const create = async (req, res) => {
  try {
    const { invoiceId, reason, items } = req.body
    if (!invoiceId || !reason || !items?.length) {
      return res.status(400).json({ ok: false, message: 'Factura, motivo e ítems son obligatorios' })
    }
    const creditNote = await createCreditNote(req.db, { invoiceId: Number(invoiceId), reason, items }, req.user?.id)
    res.status(201).json({ ok: true, data: creditNote })
  } catch (error) {
    res.status(400).json({ ok: false, message: error.message })
  }
}

export const list = async (req, res) => {
  try {
    const data = await listCreditNotes(req.db)
    res.json({ ok: true, data })
  } catch (error) {
    res.status(400).json({ ok: false, message: error.message })
  }
}

export const getById = async (req, res) => {
  try {
    const data = await getCreditNoteById(req.db, Number(req.params.id))
    if (!data) return res.status(404).json({ ok: false, message: 'Nota crédito no encontrada' })
    res.json({ ok: true, data })
  } catch (error) {
    res.status(400).json({ ok: false, message: error.message })
  }
}