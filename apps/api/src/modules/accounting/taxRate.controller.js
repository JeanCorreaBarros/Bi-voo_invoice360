import {
  listTaxRates,
  createTaxRate,
  updateTaxRate,
  deactivateTaxRate,
  activateTaxRate
} from './taxRate.service.js'

export async function list(req, res) {
  try {
    const { active } = req.query
    const data = await listTaxRates(req.db, { active: active === undefined ? undefined : active === 'true' })
    res.json({ ok: true, data })
  } catch (error) {
    res.status(400).json({ ok: false, message: error.message })
  }
}

export async function create(req, res) {
  try {
    const data = await createTaxRate(req.db, req.body)
    res.status(201).json({ ok: true, data })
  } catch (error) {
    res.status(400).json({ ok: false, message: error.message })
  }
}

export async function update(req, res) {
  try {
    const data = await updateTaxRate(req.db, req.params.id, req.body)
    res.json({ ok: true, data })
  } catch (error) {
    res.status(400).json({ ok: false, message: error.message })
  }
}

export async function deactivate(req, res) {
  try {
    const data = await deactivateTaxRate(req.db, req.params.id)
    res.json({ ok: true, data })
  } catch (error) {
    res.status(400).json({ ok: false, message: error.message })
  }
}

export async function activate(req, res) {
  try {
    const data = await activateTaxRate(req.db, req.params.id)
    res.json({ ok: true, data })
  } catch (error) {
    res.status(400).json({ ok: false, message: error.message })
  }
}
