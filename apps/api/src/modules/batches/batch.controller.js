import { createBatch, listBatches, adjustBatch, getExpiryAlerts } from './batch.service.js'

export const create = async (req, res) => {
  try {
    const { productId, batchNumber, manufactureDate, expiryDate, quantity, warehouseId } = req.body
    if (!productId || !batchNumber || !quantity) {
      return res.status(400).json({ ok: false, message: 'Producto, número de lote y cantidad son obligatorios' })
    }
    const batch = await createBatch(req.db, {
      productId, batchNumber, manufactureDate, expiryDate,
      quantity: Number(quantity), warehouseId, userId: req.user?.id
    })
    res.status(201).json({ ok: true, data: batch })
  } catch (error) {
    res.status(400).json({ ok: false, message: error.message })
  }
}

export const list = async (req, res) => {
  try {
    const { productId, status } = req.query
    const data = await listBatches(req.db, { productId, status })
    res.json({ ok: true, data })
  } catch (error) {
    res.status(400).json({ ok: false, message: error.message })
  }
}

export const adjust = async (req, res) => {
  try {
    const { quantity, reason } = req.body
    if (quantity === undefined) return res.status(400).json({ ok: false, message: 'La cantidad es obligatoria' })
    const batch = await adjustBatch(req.db, req.params.id, { quantity, reason, userId: req.user?.id })
    res.json({ ok: true, data: batch })
  } catch (error) {
    res.status(400).json({ ok: false, message: error.message })
  }
}

export const alerts = async (req, res) => {
  try {
    const data = await getExpiryAlerts(req.db)
    res.json({ ok: true, data })
  } catch (error) {
    res.status(400).json({ ok: false, message: error.message })
  }
}
