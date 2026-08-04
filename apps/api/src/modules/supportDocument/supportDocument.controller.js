import {
  createSupportDocument,
  listSupportDocuments,
  getSupportDocumentById,
  cancelSupportDocument
} from './supportDocument.service.js'

export const create = async (req, res) => {
  try {
    const { supplierName, supplierNit, supplierIdType, concept, tax, items } = req.body
    if (!supplierName || !concept || !items?.length) {
      return res.status(400).json({ ok: false, message: 'Proveedor, concepto e ítems son obligatorios' })
    }
    const doc = await createSupportDocument(req.db, { supplierName, supplierNit, supplierIdType, concept, tax, items }, req.user?.id)
    res.status(201).json({ ok: true, data: doc })
  } catch (error) {
    res.status(400).json({ ok: false, message: error.message })
  }
}

export const list = async (req, res) => {
  try {
    const data = await listSupportDocuments(req.db)
    res.json({ ok: true, data })
  } catch (error) {
    res.status(400).json({ ok: false, message: error.message })
  }
}

export const getById = async (req, res) => {
  try {
    const data = await getSupportDocumentById(req.db, Number(req.params.id))
    if (!data) return res.status(404).json({ ok: false, message: 'Documento soporte no encontrado' })
    res.json({ ok: true, data })
  } catch (error) {
    res.status(400).json({ ok: false, message: error.message })
  }
}

export const cancel = async (req, res) => {
  try {
    const data = await cancelSupportDocument(req.db, Number(req.params.id))
    res.json({ ok: true, data })
  } catch (error) {
    res.status(400).json({ ok: false, message: error.message })
  }
}
