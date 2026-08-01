import {
  createPurchase,
  getPurchases,
  getPurchaseById,
  cancelPurchase,
  updatePurchase
} from './purchase.service.js'

export const create = async (req, res) => {
  try {
    const purchase = await createPurchase(req.db, req.body)

    res.json({
      ok: true,
      data: purchase
    })
  } catch (error) {
    res.status(400).json({
      ok: false,
      message: error.message
    })
  }
}

export const list = async (req, res) => {
  try {
    const result = await getPurchases(req.db, req.query)

    return res.json({
      ok: true,
      ...result
    })
  } catch (error) {
    return res.status(500).json({
      ok: false,
      message: error.message
    })
  }
}

export const getById = async (req, res) => {
  try {
    const purchase = await getPurchaseById(req.db, Number(req.params.id))

    if (!purchase)
      return res.status(404).json({
        ok: false,
        message: 'Compra no encontrada'
      })

    return res.json({
      ok: true,
      data: purchase
    })
  } catch (error) {
    return res.status(400).json({
      ok: false,
      message: error.message
    })
  }
}

export const cancel = async (req, res) => {
  try {
    const purchase = await cancelPurchase(req.db, Number(req.params.id))

    return res.json({
      ok: true,
      entity: purchase
    })
  } catch (error) {
    return res.status(400).json({
      ok: false,
      message: error.message
    })
  }
}

export const update = async (req, res) => {
  try {
    const purchase = await updatePurchase(
      req.db,
      Number(req.params.id),
      req.body
    )

    return res.json({
      ok: true,
      entity: purchase
    })
  } catch (error) {
    return res.status(400).json({
      ok: false,
      message: error.message
    })
  }
}

export const confirm = async (req, res) => {
  try {
    // NOTA: confirmPurchase nunca existió en purchase.service.js (bug preexistente).
    const purchase = await confirmPurchase(req.db, Number(req.params.id))

    return res.json({
      ok: true,
      entity: purchase
    })
  } catch (error) {
    return res.status(400).json({
      ok: false,
      message: error.message
    })
  }
}
