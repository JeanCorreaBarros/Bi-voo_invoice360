import {
  listCostCenters,
  createCostCenter,
  updateCostCenter,
  deactivateCostCenter,
  activateCostCenter
} from './costCenter.service.js'

export async function list(req, res) {
  try {
    const { active } = req.query
    const costCenters = await listCostCenters(req.db, {
      active: active === undefined ? undefined : active === 'true'
    })
    res.json({ ok: true, data: costCenters })
  } catch (error) {
    res.status(400).json({ ok: false, message: error.message })
  }
}

export async function create(req, res) {
  try {
    const costCenter = await createCostCenter(req.db, req.body)
    res.status(201).json({ ok: true, data: costCenter })
  } catch (error) {
    res.status(400).json({ ok: false, message: error.message })
  }
}

export async function update(req, res) {
  try {
    const costCenter = await updateCostCenter(req.db, req.params.id, req.body)
    res.json({ ok: true, data: costCenter })
  } catch (error) {
    res.status(400).json({ ok: false, message: error.message })
  }
}

export async function deactivate(req, res) {
  try {
    const costCenter = await deactivateCostCenter(req.db, req.params.id)
    res.json({ ok: true, data: costCenter })
  } catch (error) {
    res.status(400).json({ ok: false, message: error.message })
  }
}

export async function activate(req, res) {
  try {
    const costCenter = await activateCostCenter(req.db, req.params.id)
    res.json({ ok: true, data: costCenter })
  } catch (error) {
    res.status(400).json({ ok: false, message: error.message })
  }
}
