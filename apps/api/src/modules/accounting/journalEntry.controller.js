import {
  listJournalEntries,
  getJournalEntryById,
  createJournalEntry,
  voidJournalEntry
} from './journalEntry.service.js'

export async function list(req, res) {
  try {
    const { page, limit, type, status, search } = req.query
    const result = await listJournalEntries(req.db, { page, limit, type, status, search })
    res.json({ ok: true, ...result })
  } catch (error) {
    res.status(400).json({ ok: false, message: error.message })
  }
}

export async function getById(req, res) {
  try {
    const entry = await getJournalEntryById(req.db, req.params.id)
    if (!entry) return res.status(404).json({ ok: false, message: 'Comprobante no encontrado' })
    res.json({ ok: true, data: entry })
  } catch (error) {
    res.status(400).json({ ok: false, message: error.message })
  }
}

export async function create(req, res) {
  try {
    const entry = await createJournalEntry(req.db, req.body, req.user.id)
    // `entity` además de `data`: el middleware de auditoría solo registra
    // cuando la respuesta trae `entity` (convención de módulos previos).
    res.status(201).json({ ok: true, data: entry, entity: entry })
  } catch (error) {
    res.status(400).json({ ok: false, message: error.message })
  }
}

export async function voidEntry(req, res) {
  try {
    const entry = await voidJournalEntry(req.db, req.params.id)
    res.json({ ok: true, data: entry, entity: entry })
  } catch (error) {
    res.status(400).json({ ok: false, message: error.message })
  }
}
