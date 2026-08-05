import * as service from './pos.service.js'

export async function searchProducts(req, res) {
  try {
    const products = await service.searchProducts(req.db, req.query)
    res.json({ ok: true, products })
  } catch (error) {
    res.status(400).json({ ok: false, message: error.message })
  }
}

export async function getCompanyInfo(req, res) {
  try {
    const company = await service.getCompanyInfo(req.db)
    res.json({ ok: true, company })
  } catch (error) {
    res.status(400).json({ ok: false, message: error.message })
  }
}

export async function getSettings(req, res) {
  try {
    const settings = await service.getPosSettings(req.db)
    res.json({ ok: true, settings })
  } catch (error) {
    res.status(400).json({ ok: false, message: error.message })
  }
}

export async function updateSettings(req, res) {
  try {
    const settings = await service.updatePosSettings(req.db, req.body)
    res.json({ ok: true, settings })
  } catch (error) {
    res.status(400).json({ ok: false, message: error.message })
  }
}

export async function getCurrentSession(req, res) {
  try {
    const session = await service.getCurrentSession(req.db)
    res.json({ ok: true, session })
  } catch (error) {
    res.status(400).json({ ok: false, message: error.message })
  }
}

export async function openSession(req, res) {
  try {
    const session = await service.openSession(req.db, {
      userId: req.user.id,
      openingAmount: req.body.openingAmount,
      note: req.body.note
    })
    res.status(201).json({ ok: true, session })
  } catch (error) {
    res.status(400).json({ ok: false, message: error.message })
  }
}

export async function closeSession(req, res) {
  try {
    const session = await service.closeSession(req.db, {
      sessionId: req.params.id,
      userId: req.user.id,
      countedCashAmount: req.body.countedCashAmount,
      note: req.body.note
    })
    res.json({ ok: true, session })
  } catch (error) {
    res.status(400).json({ ok: false, message: error.message })
  }
}

export async function addCashMovement(req, res) {
  try {
    const movement = await service.addCashMovement(req.db, {
      sessionId: req.params.id,
      userId: req.user.id,
      type: req.body.type,
      amount: req.body.amount,
      reference: req.body.reference,
      note: req.body.note
    })
    res.status(201).json({ ok: true, movement })
  } catch (error) {
    res.status(400).json({ ok: false, message: error.message })
  }
}

export async function createSale(req, res) {
  try {
    const result = await service.createSale(req.db, req.body, req.user.id)
    res.status(201).json({ ok: true, ...result })
  } catch (error) {
    res.status(400).json({ ok: false, message: error.message })
  }
}
